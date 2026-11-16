"""
server.py - FastAPI Backend for UniRet Concept B (Predict & 3D Structural Portal)

Exposes REST endpoints for:
- Protein info & variation queries (with full uniret parsing)
- AlphaFold DB 3D structure resolution
- PredictSNP reformatting
- Batch processing & export
"""

import json
import sys
import tempfile
from pathlib import Path
from typing import Optional, List

# Ensure UniRet directory is in python path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import requests
from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from uniret.fetch import EBI_VARIATION_URL, UNIPROT_REST_URL, _get
from uniret.genomic import _process_genomic_location
from uniret.ids import read_ids_from_file
from uniret.parse import _process_variation_json

app = FastAPI(
    title="UniRet 3D Predict API",
    description="Backend API powering the UniRet 3D Structural & Variation Portal (Concept B)",
    version="1.0.0",
)

# Enable CORS for React frontend (Vite default port 5173, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory LRU / simple cache to prevent hitting EBI rate limits
CACHE: dict[str, dict] = {}


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "uniret-3d-predict-backend"}


CACHE_DIR = Path(__file__).resolve().parent / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _fast_parse_variation_features(features: list) -> list:
    """
    High-speed in-memory parser for EBI variation features.
    Parses directly from native dicts/lists without writing to disk or running ast.literal_eval.
    Executes in ~15ms for 5,000+ variants.
    """
    parsed = []
    for f in features:
        xrefs = f.get("xrefs", []) or []
        preds = f.get("predictions", []) or []
        locs = f.get("locations", []) or []
        clins = f.get("clinicalSignificances", []) or []
        pops = f.get("populationFrequencies", []) or []

        gen_loc = f.get("genomicLocation")
        if isinstance(gen_loc, list):
            gen_loc_str = gen_loc[0] if gen_loc else ""
        elif isinstance(gen_loc, str):
            gen_loc_str = gen_loc
        else:
            gen_loc_str = ""

        # Format for PredictSNP
        psnp = _process_genomic_location(gen_loc_str) if gen_loc_str else None

        clin_type = clins[0].get("type", "") if clins else ""
        clin_sources = clins[0].get("sources", []) if clins else []
        clin_source_str = f" ({', '.join(clin_sources)})" if clin_sources else ""
        clin_display = f"{clin_type}{clin_source_str}" if clin_type else ""

        # Extract descriptions matching UniProt Variant Viewer
        descs = f.get("descriptions", []) or []
        desc_lines = []
        if isinstance(descs, list):
            for d in descs:
                if isinstance(d, dict):
                    val = d.get("value", "")
                    srcs = d.get("sources", [])
                    if val:
                        if srcs:
                            desc_lines.append(f"{val} ({', '.join(srcs)})")
                        else:
                            desc_lines.append(val)
                elif isinstance(d, str) and d.strip():
                    desc_lines.append(d.strip())

        if not desc_lines:
            assocs = f.get("association", []) or []
            for a in assocs:
                if isinstance(a, dict):
                    aname = a.get("name")
                    if aname:
                        desc_lines.append(aname)

        if not desc_lines and f.get("description"):
            desc_lines.append(str(f.get("description")))

        desc_str = "; ".join(desc_lines) if desc_lines else ""

        # Extract dbSNP rsIDs, ClinVar RCVs, and COSMIC identifiers
        rsids = []
        clinvars = []
        cosmics = []
        for x in xrefs:
            if not isinstance(x, dict):
                continue
            x_name = str(x.get("name") or "").strip()
            x_id = str(x.get("id") or "").strip()
            if not x_id:
                continue
            if x_name == "dbSNP" or x_id.startswith("rs"):
                if x_id not in rsids:
                    rsids.append(x_id)
            elif x_name == "ClinVar" or x_id.startswith("RCV") or x_id.startswith("VCV"):
                if x_id not in clinvars:
                    clinvars.append(x_id)
            elif "COSMIC" in x_name.upper() or x_id.startswith("COSM") or x_id.startswith("COSV"):
                if x_id not in cosmics:
                    cosmics.append(x_id)

        rs_id = rsids[0] if rsids else ""

        row = {
            "id": f.get("ftId") or "",
            "begin": f.get("begin", ""),
            "end": f.get("end", ""),
            "wildType": f.get("wildType", ""),
            "mutatedType": f.get("mutatedType", ""),
            "type": f.get("type", "VARIANT"),
            "rs_id": rs_id,
            "rs_ids": rsids,
            "clinvar_ids": clinvars,
            "cosmic_ids": cosmics,
            "clinical_significance": clin_type,
            "clinical_significance_display": clin_display,
            "type_clin": clin_type,
            "description": desc_str,
            "descriptions": desc_lines,
            "genomicLocation": gen_loc_str,
            "predictsnp": psnp,
            # Flattened xrefs
            "xref_name": xrefs[0].get("name", "") if xrefs else "",
            "xref_id": xrefs[0].get("id", "") if xrefs else "",
            "xref_url": xrefs[0].get("url", "") if xrefs else "",
            # Flattened predictions
            "score": preds[0].get("score", "") if preds else "",
            "predAlgorithmNameType": preds[0].get("predAlgorithmNameType", "") if preds else "",
            "predictionValType": preds[0].get("predictionValType", "") if preds else "",
            # Flattened locations
            "loc": locs[0].get("loc", "") if locs else "",
            "seqId": locs[0].get("seqId", "") if locs else "",
            # Flattened clinical significance
            "reviewStatus": clins[0].get("reviewStatus", "") if clins else "",
            # Flattened frequencies
            "populationName": pops[0].get("populationName", "") if pops else "",
            "frequency": pops[0].get("frequency", "") if pops else "",
        }
        parsed.append(row)
    return parsed


@app.get("/api/protein/{accession}")
def get_protein_data(accession: str):
    """
    Fetch comprehensive protein metadata, functional annotation,
    and flattened variation dataset in parallel with disk caching.
    """
    import concurrent.futures

    uid = accession.strip().upper()

    # 1. Check in-memory cache
    if uid in CACHE:
        return CACHE[uid]

    # 2. Check persistent disk cache (verify rs_id is present)
    disk_cache_file = CACHE_DIR / f"{uid}.json"
    if disk_cache_file.exists():
        try:
            cached_data = json.loads(disk_cache_file.read_text())
            c_vars = cached_data.get("variations", [])
            if not c_vars or "rs_id" in c_vars[0]:
                CACHE[uid] = cached_data
                return cached_data
        except Exception as e:
            print(f"Disk cache read warning for {uid}: {e}")

    # 3. Parallel fetch from UniProt, EBI, and AlphaFold APIs
    info_data = {
        "accession": uid,
        "protein_name": "Unknown",
        "gene_name": "N/A",
        "organism": "N/A",
        "length": 0,
        "sequence": "",
        "function": "",
    }
    variations = []
    type_counts = {}
    total_variants = 0
    pdb_url = f"https://alphafold.ebi.ac.uk/files/AF-{uid}-F1-model_v6.pdb"
    cif_url = f"https://alphafold.ebi.ac.uk/files/AF-{uid}-F1-model_v6.cif"
    has_alphafold = True

    headers = {"User-Agent": "Mozilla/5.0 (UniRet 3D Predict Portal; +https://github.com/)"}

    def fetch_uniprot():
        try:
            r = requests.get(UNIPROT_REST_URL.format(uid=uid), headers=headers, timeout=12)
            if r.status_code == 200:
                raw = r.json()
                pdb_structures = []
                for x in raw.get("uniProtKBCrossReferences", []):
                    if x.get("database") == "PDB":
                        pdb_id = x.get("id")
                        props = {p.get("key"): p.get("value") for p in x.get("properties", [])}
                        res_str = props.get("Resolution", "-").replace(" A", "")
                        try:
                            res_val = float(res_str)
                        except ValueError:
                            res_val = 999.0
                        pdb_structures.append({
                            "pdb_id": pdb_id,
                            "method": props.get("Method", "Unknown"),
                            "resolution": props.get("Resolution", "-"),
                            "res_val": res_val,
                            "chains": props.get("Chains", "-"),
                        })
                pdb_structures.sort(key=lambda s: s["res_val"])

                return {
                    "accession": uid,
                    "protein_name": raw.get("proteinDescription", {}).get("recommendedName", {}).get("fullName", {}).get("value", "N/A"),
                    "gene_name": raw.get("genes", [{}])[0].get("geneName", {}).get("value", "N/A"),
                    "organism": raw.get("organism", {}).get("scientificName", "N/A"),
                    "length": raw.get("sequence", {}).get("length", 0),
                    "sequence": raw.get("sequence", {}).get("value", ""),
                    "function": "; ".join([
                        c.get("text", [{}])[0].get("value", "")
                        for c in raw.get("comments", [])
                        if c.get("commentType") == "FUNCTION"
                    ]),
                    "pdb_structures": pdb_structures,
                }
        except Exception as e:
            print(f"UniProt fetch error: {e}")
        return None

    def fetch_ebi():
        try:
            r = requests.get(EBI_VARIATION_URL.format(uid=uid), headers=headers, timeout=20)
            if r.status_code == 200:
                return r.json().get("features", [])
        except Exception as e:
            print(f"EBI fetch error: {e}")
        return []

    def fetch_alphafold():
        try:
            r = requests.get(f"https://alphafold.ebi.ac.uk/api/prediction/{uid}", headers=headers, timeout=8)
            if r.status_code == 200:
                entries = r.json()
                if entries and isinstance(entries, list) and len(entries) > 0:
                    return entries[0]
        except Exception as e:
            print(f"AlphaFold fetch error: {e}")
        return None

    # Execute all 3 fetches concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        f_info = executor.submit(fetch_uniprot)
        f_ebi = executor.submit(fetch_ebi)
        f_af = executor.submit(fetch_alphafold)

        res_info = f_info.result()
        res_ebi = f_ebi.result()
        res_af = f_af.result()

    if res_info:
        info_data = res_info

    if res_ebi:
        variations = _fast_parse_variation_features(res_ebi)
        total_variants = len(variations)
        for v in variations:
            t = v.get("type", "VARIANT")
            type_counts[t] = type_counts.get(t, 0) + 1

    has_alphafold = bool(res_af)
    if res_af:
        pdb_url = res_af.get("pdbUrl") or pdb_url
        cif_url = res_af.get("cifUrl") or cif_url

    pdb_structures = info_data.get("pdb_structures", [])
    has_structure = has_alphafold or bool(pdb_structures)
    primary_source = "AlphaFold DB" if has_alphafold else ("RCSB PDB" if pdb_structures else "None")
    primary_id = f"AF-{uid}-F1" if has_alphafold else (pdb_structures[0]["pdb_id"] if pdb_structures else None)

    result = {
        "accession": uid,
        "info": info_data,
        "variations": variations,
        "total_variations": total_variants,
        "type_counts": type_counts,
        "alphafold": {
            "has_structure": has_alphafold,
            "pdb_url": pdb_url if has_alphafold else None,
            "cif_url": cif_url if has_alphafold else None,
            "entry_url": f"https://alphafold.ebi.ac.uk/entry/{uid}",
        },
        "structures": {
            "has_structure": has_structure,
            "has_alphafold": has_alphafold,
            "primary_source": primary_source,
            "primary_id": primary_id,
            "experimental_pdbs": pdb_structures[:12],
        },
    }

    # Store in memory & persistent disk cache
    CACHE[uid] = result
    try:
        disk_cache_file.write_text(json.dumps(result))
    except Exception as e:
        print(f"Disk cache write warning for {uid}: {e}")

    return result


PDB_CACHE: dict[str, str] = {}


@app.get("/api/structure/{accession}")
def get_structure_pdb(accession: str, pdb_id: str | None = None):
    """
    Fetch and return raw PDB text for a given accession or PDB ID.
    1. If pdb_id is specified, fetch directly from RCSB PDB.
    2. Otherwise, check AlphaFold DB (v6, v4).
    3. If AlphaFold DB returns 404 (e.g. mega-proteins > 2,700 residues like APC / P25054),
       transparently fall back to the highest-resolution experimental PDB structure from RCSB PDB.
    """
    from fastapi.responses import Response
    uid = accession.strip().upper()
    cache_key = f"{uid}_{pdb_id.upper()}" if pdb_id else uid

    if cache_key in PDB_CACHE:
        cached = PDB_CACHE[cache_key]
        if isinstance(cached, dict):
            return Response(content=cached["content"], media_type="text/plain", headers=cached.get("headers", {}))
        return Response(content=cached, media_type="text/plain")

    # 1. If explicit pdb_id is requested, fetch from RCSB PDB
    if pdb_id:
        pid = pdb_id.strip().upper()
        rcsb_url = f"https://files.rcsb.org/download/{pid}.pdb"
        try:
            r = requests.get(rcsb_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=12)
            if r.status_code == 200 and "ATOM" in r.text:
                hdrs = {
                    "X-Structure-Source": "RCSB PDB",
                    "X-Structure-ID": pid,
                }
                PDB_CACHE[cache_key] = {"content": r.text, "headers": hdrs}
                return Response(content=r.text, media_type="text/plain", headers=hdrs)
        except Exception as e:
            print(f"RCSB fetch error for {pid}: {e}")

    # 2. Try AlphaFold DB API to resolve exact model
    pdb_url = f"https://alphafold.ebi.ac.uk/files/AF-{uid}-F1-model_v6.pdb"
    has_af = False
    try:
        af_resp = requests.get(
            f"https://alphafold.ebi.ac.uk/api/prediction/{uid}",
            headers={"User-Agent": "Mozilla/5.0 (UniRet 3D Predict)"},
            timeout=6,
        )
        if af_resp.status_code == 200:
            af_data = af_resp.json()
            if af_data and isinstance(af_data, list) and len(af_data) > 0:
                pdb_url = af_data[0].get("pdbUrl") or pdb_url
                has_af = True
    except Exception as e:
        print(f"Could not query AlphaFold API for {uid}: {e}")

    if has_af:
        try:
            pdb_resp = requests.get(
                pdb_url,
                headers={"User-Agent": "Mozilla/5.0 (UniRet 3D Predict)"},
                timeout=15,
            )
            if pdb_resp.status_code == 200 and "ATOM" in pdb_resp.text:
                hdrs = {
                    "X-Structure-Source": "AlphaFold DB",
                    "X-Structure-ID": f"AF-{uid}-F1",
                }
                PDB_CACHE[cache_key] = {"content": pdb_resp.text, "headers": hdrs}
                return Response(content=pdb_resp.text, media_type="text/plain", headers=hdrs)
            
            # Fallback to v4 if v6 failed
            v4_url = f"https://alphafold.ebi.ac.uk/files/AF-{uid}-F1-model_v4.pdb"
            v4_resp = requests.get(v4_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
            if v4_resp.status_code == 200 and "ATOM" in v4_resp.text:
                hdrs = {
                    "X-Structure-Source": "AlphaFold DB",
                    "X-Structure-ID": f"AF-{uid}-F1-v4",
                }
                PDB_CACHE[cache_key] = {"content": v4_resp.text, "headers": hdrs}
                return Response(content=v4_resp.text, media_type="text/plain", headers=hdrs)
        except Exception as exc:
            print(f"AlphaFold download failed for {uid}: {exc}")

    # 3. Transparent Fallback: Query UniProt for Experimental PDBs and fetch best from RCSB PDB
    try:
        up_resp = requests.get(UNIPROT_REST_URL.format(uid=uid), headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        if up_resp.status_code == 200:
            up_data = up_resp.json()
            xrefs = up_data.get("uniProtKBCrossReferences", [])
            pdbs = []
            for x in xrefs:
                if x.get("database") == "PDB":
                    props = {p.get("key"): p.get("value") for p in x.get("properties", [])}
                    res_str = props.get("Resolution", "-").replace(" A", "")
                    try:
                        res_val = float(res_str)
                    except ValueError:
                        res_val = 999.0
                    pdbs.append((res_val, x.get("id"), props.get("Chains", "-"), props.get("Resolution", "-")))
            pdbs.sort(key=lambda t: t[0])
            if pdbs:
                best_pdb_id = pdbs[0][1]
                best_chains = pdbs[0][2]
                best_res = pdbs[0][3]
                r = requests.get(f"https://files.rcsb.org/download/{best_pdb_id}.pdb", timeout=12)
                if r.status_code == 200 and "ATOM" in r.text:
                    hdrs = {
                        "X-Structure-Source": "RCSB PDB",
                        "X-Structure-ID": best_pdb_id,
                        "X-Structure-Resolution": best_res,
                        "X-Structure-Chains": best_chains,
                    }
                    PDB_CACHE[cache_key] = {"content": r.text, "headers": hdrs}
                    return Response(content=r.text, media_type="text/plain", headers=hdrs)
    except Exception as e:
        print(f"Experimental PDB fallback error for {uid}: {e}")

    raise HTTPException(status_code=404, detail=f"No 3D structure found in AlphaFold DB or RCSB PDB for {uid}")


@app.get("/api/predictsnp/{accession}")
def get_predictsnp_data(accession: str):
    """
    Get only the variations formatted for PredictSNP.
    """
    protein_data = get_protein_data(accession)
    variations = protein_data.get("variations", [])
    predictsnp_rows = []

    for v in variations:
        psnp = v.get("predictsnp")
        if psnp:
            predictsnp_rows.append(
                {
                    "variation_id": v.get("ftId") or f"{v.get('wildType')}{v.get('begin')}{v.get('mutatedType')}",
                    "wild_type": v.get("wildType"),
                    "mutated_type": v.get("mutatedType"),
                    "position": v.get("begin"),
                    "predictsnp_formatted": psnp,
                    "clinical_significance": v.get("type_clin") or v.get("type", ""),
                    "score": v.get("score"),
                }
            )

    return {
        "accession": accession.upper(),
        "total": len(predictsnp_rows),
        "rows": predictsnp_rows,
    }


from fastapi.responses import FileResponse, Response
import io
import shutil
import uuid
import zipfile
from uniret.fetch import fetch_uniprot_info, fetch_variations
from uniret.genomic import parse_genomic
from uniret.sort import sort_variations
from uniret.parse import parse_variations

BATCH_JOBS: dict[str, dict] = {}
BATCH_ZIPS: dict[str, Path] = {}


class BatchRunRequest(BaseModel):
    ids: List[str]
    with_info: bool = True
    with_genomic: bool = True
    split_sorted: bool = True
    fmt: str = "csv"
    delay: float = 0.2


@app.post("/api/batch/parse-file")
async def parse_batch_file(file: UploadFile = File(...)):
    """
    Accept an input file (.xlsx, .xls, .csv, .tsv, .txt) and extract
    the list of UniProt IDs using uniret.ids.read_ids_from_file().
    """
    suffix = Path(file.filename).suffix.lower()
    if suffix not in {".xlsx", ".xls", ".csv", ".tsv", ".txt"}:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{suffix}'. Supported formats: .xlsx, .xls, .csv, .tsv, .txt",
        )

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        uids = read_ids_from_file(tmp_path)
        return {
            "filename": file.filename,
            "count": len(uids),
            "ids": uids,
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse IDs from file: {exc}")
    finally:
        tmp_path.unlink(missing_ok=True)


@app.post("/api/batch/run")
def run_batch_pipeline(req: BatchRunRequest):
    """
    Execute the full uniret pipeline (fetch -> parse -> sort -> genomic -> info)
    on a list of UniProt IDs and compile the result directory into a ZIP archive.
    """
    if not req.ids:
        raise HTTPException(status_code=400, detail="No UniProt IDs provided.")

    job_id = str(uuid.uuid4())
    temp_dir = Path(tempfile.mkdtemp(prefix=f"uniret_{job_id}_"))

    json_dir = temp_dir / "json"
    variations_dir = temp_dir / "variations"
    sorted_dir = temp_dir / "sorted"
    info_dir = temp_dir / "info"
    genomic_dir = temp_dir / "predictsnp"

    json_dir.mkdir(parents=True, exist_ok=True)
    variations_dir.mkdir(parents=True, exist_ok=True)

    summary_results = []

    # 1. Fetch info (optional)
    if req.with_info:
        info_dir.mkdir(parents=True, exist_ok=True)
        try:
            fetch_uniprot_info(req.ids, info_dir, delay=0.1)
        except Exception as e:
            print(f"Batch info fetch warning: {e}")

    # 2. Fetch variations & parse
    fetch_results = fetch_variations(req.ids, json_dir, delay=req.delay)
    parse_results = parse_variations(json_dir, variations_dir, fmt=req.fmt)

    # 3. Sort variations by type (optional)
    if req.split_sorted:
        sorted_dir.mkdir(parents=True, exist_ok=True)
        sort_variations(variations_dir, sorted_dir, fmt=req.fmt)

    # 4. Genomic reformatting for PredictSNP (optional)
    if req.with_genomic:
        genomic_dir.mkdir(parents=True, exist_ok=True)
        parse_genomic(variations_dir, genomic_dir, fmt=req.fmt)

    # Build per-protein summary
    for uid in req.ids:
        status = fetch_results.get(uid, "unknown")
        parse_status = parse_results.get(uid, "empty")
        
        # Check variation count if parsed
        var_file = variations_dir / f"{uid}_variations.{req.fmt}"
        var_count = 0
        if var_file.exists():
            try:
                import pandas as pd
                if req.fmt == "csv":
                    df = pd.read_csv(var_file)
                elif req.fmt == "tsv":
                    df = pd.read_csv(var_file, sep="\t")
                else:
                    df = pd.read_json(var_file)
                var_count = len(df)
            except Exception:
                var_count = 0

        summary_results.append({
            "accession": uid,
            "status": status,
            "parse_status": parse_status,
            "variant_count": var_count,
        })

    # 5. Package results into ZIP
    zip_path = temp_dir.parent / f"uniret_batch_{job_id[:8]}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for folder in [json_dir, variations_dir, sorted_dir, info_dir, genomic_dir]:
            if folder.exists():
                for file_path in folder.rglob("*"):
                    if file_path.is_file():
                        arcname = file_path.relative_to(temp_dir)
                        zf.write(file_path, arcname)

    BATCH_ZIPS[job_id] = zip_path
    BATCH_JOBS[job_id] = {
        "job_id": job_id,
        "total": len(req.ids),
        "results": summary_results,
        "download_url": f"/api/batch/download/{job_id}",
    }

    # Clean up unzipped files, keeping zip
    shutil.rmtree(temp_dir, ignore_errors=True)

    return BATCH_JOBS[job_id]


@app.get("/api/batch/download/{job_id}")
def download_batch_zip(job_id: str):
    """
    Download the packaged ZIP results for a completed batch job.
    """
    if job_id not in BATCH_ZIPS or not BATCH_ZIPS[job_id].exists():
        raise HTTPException(status_code=404, detail="Batch result ZIP expired or not found.")

    zip_file = BATCH_ZIPS[job_id]
    return FileResponse(
        path=zip_file,
        media_type="application/zip",
        filename=f"uniret_results_{job_id[:8]}.zip",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
