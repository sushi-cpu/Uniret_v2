# UniRet v2

**UniRet v2** is a high-throughput bioinformatics platform and web application for mining, analyzing, and visualizing UniProt SNP variations, dbSNP coordinates, and 3D macromolecular structures via the [EBI Proteins API](https://www.ebi.ac.uk/proteins/api/doc/), [AlphaFold DB](https://alphafold.ebi.ac.uk/), and [RCSB PDB](https://www.rcsb.org/).

> 📘 **Architectural Roadmap & Vision**: See [Potential.md](file:///home/sushant-pdx/Desktop/softwares/Uniret/UniRet/Potential.md) for web platform blueprints, REST API design, and publication targets.

---

## ⚡ What's New in v2

- **🧬 Modern Product Landing Page**: Curated disease benchmark models (**EGFR**, **KIT**, **TP53**, **PIK3CA**, **BRCA1**, **KRAS**), live performance metrics, and 1-click launch into the 3D Workbench.
- **🖥️ 3-Way Responsive Workbench Layout**:
  - **Dual Split (3D + Table)**: Synchronized 3D pocket pivoting alongside the variation catalog.
  - **Full Variations Table (25 Rows)**: 100% full-width dataset view with relaxed column widths, fitting all 25 rows on screen without cramped scrolling.
  - **3D Structure Focus**: Full-canvas WebGL viewer for structural analysis, pocket inspection, and high-res PNG export.
- **🏷️ dbSNP rsID Integration**: Full extraction and indexing of `rs_id` and `rs_ids` from EBI cross-references with direct NCBI dbSNP links, 1-click copy, and table search.
- **🏛️ Transparent RCSB PDB Crystal Structure Fallback**: Mega-proteins exceeding AlphaFold monomer limits (e.g. **APC / P25054** at 2,843 aa) automatically fall back to experimental crystal structures from RCSB PDB (e.g. `5IZA` at 1.50 Å).
- **📊 Calibrated 1D Hotspot Skyline**: Adaptive peak detection for high-density proteins, highlighting clinical mutation hotspots (e.g. APC Mutation Cluster Region) cleanly.
- **🚀 PredictSNP 1-Click Exporter**: Formats EBI genomic coordinates (`NC_000007.14:g.55019281C>T` → `7,55019281,C,T`) with batch clipboard copy and `.txt` export.

---

## 🚀 Quick Start (Web Application)

### 1. Launch FastAPI Backend
```bash
python UniRet/server.py
# Server runs on http://0.0.0.0:8000 (API docs at http://localhost:8000/docs)
```

### 2. Launch React Frontend
```bash
cd UniRet/frontend
npm install
npm run dev
# Vite dev server runs on http://localhost:5173
```

Open `http://localhost:5173` in your browser to explore the Landing Page, 3D Workbench, and Batch Hub.

---

## 💻 CLI Toolkit (`uniret`)

UniRet can also be executed as a command-line pipeline for high-throughput batch processing of protein cohorts:

### Installation
```bash
pip install -e UniRet/
```

### Running the Full Pipeline (Fetch → Parse → Sort)
```bash
uniret run -i UniRet/data/uniprotids.xlsx -o ./results
```

Directory output structure:
```
results/
├── json/               # Raw variation JSONs from EBI Proteins REST API
├── variations/         # Parsed flat CSV/TSV tables with dbSNP rsIDs & ClinVar tags
└── sorted/             # Split per-protein directories by mutation category
    └── P10721_variations/
        ├── Natural variant.csv
        ├── Mutagenesis.csv
        └── ...
```

---

## 🧪 Pre-configured Benchmark Datasets

UniRet includes pre-configured sample datasets located in [`UniRet/data/`](file:///home/sushant-pdx/Desktop/softwares/Uniret/UniRet/data):

| File | Format | Target Cohort |
| :--- | :--- | :--- |
| [`uniprotids.xlsx`](file:///home/sushant-pdx/Desktop/softwares/Uniret/UniRet/data/uniprotids.xlsx) | Excel (`.xlsx`) | **Original project test target**: `P10721` (*KIT* / Mast/stem cell growth factor receptor Kit, 976 aa, 3,483 variants). |
| [`test_proteins.xlsx`](file:///home/sushant-pdx/Desktop/softwares/Uniret/UniRet/data/test_proteins.xlsx) | Excel (`.xlsx`) | **Multi-protein oncology suite**: `P10721` (*KIT*), `P04637` (*TP53*), `P00533` (*EGFR*), `P38398` (*BRCA1*), `P01116` (*KRAS*). |
| [`test_proteins.csv`](file:///home/sushant-pdx/Desktop/softwares/Uniret/UniRet/data/test_proteins.csv) | CSV | Same 5 benchmark targets in standard comma-separated format. |

---

## 🛠️ CLI Commands Reference

| Command | Purpose | Example |
| :--- | :--- | :--- |
| `uniret run` | Run end-to-end pipeline | `uniret run -i data/test_proteins.xlsx -o ./results` |
| `uniret fetch snp` | Retrieve raw EBI variation JSONs | `uniret fetch snp P00533 P04637 -o ./data/json` |
| `uniret fetch info` | Retrieve UniProt protein metadata | `uniret fetch info -i proteins.xlsx -o ./data/json` |
| `uniret parse snp` | Parse JSONs into flat variation tables | `uniret parse snp -d ./data/json -o ./data/variations -f csv` |
| `uniret parse info` | Parse UniProt metadata | `uniret parse info -d ./data/json -o ./data/info -f csv` |
| `uniret sort` | Categorize variations by classification | `uniret sort -d ./data/variations -o ./data/sorted -f csv` |

---

## 📋 Parsed Variation Attributes

Every variation record extracted by UniRet contains the following normalized fields:

| Field | Source & Description |
| :--- | :--- |
| `begin`, `end` | Amino acid sequence residue coordinates |
| `wildType`, `mutatedType` | Wild-type and mutated single-letter amino acid code |
| `rs_id`, `rs_ids` | Primary and complete array of NCBI dbSNP accession identifiers |
| `type` | Classification (`Natural variant`, `Mutagenesis`, etc.) |
| `clinical_significance` | ClinVar status (`Pathogenic`, `Likely pathogenic`, `VUS`, `Benign`) |
| `description` | Associated disease phenotypes and literature notes |
| `predictsnp` | Normalized PredictSNP chromosomal coordinate (`chr,pos,ref,alt`) |
| `score`, `predAlgorithmNameType` | In silico pathogenicity scores (SIFT, PolyPhen) |
| `genomicLocation` | Raw EBI genomic assembly string |

---

## 🏗️ Architecture & Technology Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn, Requests, Pandas, OpenPyXL, Click.
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, 3Dmol.js (WebGL).
- **APIs**: EBI Proteins REST API, UniProtKB REST API, AlphaFold DB, RCSB PDB, NCBI dbSNP.

---

## 📄 License

MIT License. Designed and maintained for open-source structural bioinformatics.
