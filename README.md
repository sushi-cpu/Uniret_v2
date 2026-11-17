# UniRet v2

**UniRet v2** is a commercial-grade, high-throughput bioinformatics platform and web application for mining, analyzing, and triaging genomic variants and 3D macromolecular structures via the [EBI Proteins API](https://www.ebi.ac.uk/proteins/api/doc/), [AlphaFold DB](https://alphafold.ebi.ac.uk/), [RCSB PDB](https://www.rcsb.org/), and [ClinicalTrials.gov API v2](https://clinicaltrials.gov/data-api/about-api).

Built with a **browser-first / zero cloud compute architecture**, UniRet delivers instant empirical biophysical triage, patient VCF genomic cohort screening, and real-time clinical trial matching with zero expensive GPU infrastructure.

> 📘 **Commercial Strategy & USP**: See [USP.md](file:///Users/sushant/Projects/Uniret_v2/USP.md) for product differentiation, market positioning, and revenue models.

---

## ⚡ Key Platform Capabilities

### 1. ⚛️ Instant Variant Biophysical Triage & Structural Risk Scorer
- **Zero Simulation Latency**: Computes residue-level sidechain volume delta ($\Delta V$ in $\text{Å}^3$), net formal charge change ($\Delta q$), and Kyte-Doolittle hydropathy shift ($\Delta H$) entirely inside the browser using standard van der Waals volumes (Richards/Chothia empirical invariants). Executes in $<0.05\,\text{ms}$ per variant.
- **Steric Expansion Classification**:
  - `SEVERE_EXPANSION` ($\Delta V \ge +40\,\text{Å}^3$, e.g., $\text{Thr} \to \text{Ile}$ gatekeeper mutations like KIT T670I or EGFR T790M)
  - `MODERATE_EXPANSION` ($+18 \le \Delta V < +40\,\text{Å}^3$)
  - `CONSERVATIVE` ($-18 \le \Delta V < +18\,\text{Å}^3$)
  - `CAVITY_CREATING` ($\Delta V \le -35\,\text{Å}^3$, core packing destabilization)
  - `MODERATE_CONTRACTION` ($-35 < \Delta V \le -18\,\text{Å}^3$)
- **Structural Alert Heuristics**:
  - *Charge Inversion*: Reversal of electrostatic potential inside the binding site or domain core (e.g., $\text{Asp} \to \text{Lys}$).
  - *Disulfide Disruption*: Loss of critical cysteine residues ($\text{Cys} \to \text{X}$).
  - *Proline Alteration*: Helix-breaking rigidity introduction or loss of structural kinks.
  - *Glycine Loss*: Restriction of Ramachandran backbone flexibility.
- **Triage Risk Tiers**: Categorizes variants into `HIGH RISK`, `MODERATE RISK`, or `CONSERVATIVE` priorities.
- **Visual Integration**: Displayed in the Variations Table (`Biophysics (ΔV)` pill column) and detailed in the **Variant Detail Drawer**.

### 2. 📁 Patient VCF File Triage & Molecular Workflow
- **End-to-End Clinical Utility**: Wet-lab researchers and clinicians do not need to click through proteins one at a time. Drop an entire patient's genomic variant file (`.vcf`, `.vcf.gz` bgzip-compressed, `.txt`, `.tsv`, VEP `CSQ`, SnpEff `ANN`, or targeted NGS panels). Native in-browser streaming gzip decompression ensures instant file ingestion without pre-unzipping.
- **Sortable Patient Report**: Instantly triages every variant in the patient's callset, sorting by $\Delta V$ expansion, risk tier, or genomic position.
- **1-Click 3D Handoff**: Click "Launch 3D" on any variant in the patient VCF report to immediately load the corresponding protein in the WebGL 3D viewer, centered and highlighted on that exact mutated residue.
- **Clinical Summary Export**: 1-click export to CSV and formatted plain-text summary for Molecular Tumor Board notes or wet-lab documentation.
- **Curated Benchmark Panels Included**:
  - *Patient NSCLC-042*: Lung Adenocarcinoma Resistance Panel (EGFR L858R, T790M, C797S, KRAS G12C, TP53 R175H).
  - *Patient GIST-109*: Gastrointestinal Stromal Tumor Panel (KIT T670I severe clash $+50.6\,\text{Å}^3$, V654A, PDGFRA D842V).
  - *Patient BR-088*: Hereditary Breast & Ovarian Cancer Panel (BRCA1 C61G, TP53 R273H, PIK3CA H1047R, PTEN R130Q).

### 3. 🏥 Live ClinicalTrials.gov API Connector
- **Real-Time Study Matching**: Instant live queries to ClinicalTrials.gov API v2 for any selected mutation (e.g., `EGFR L858R`, `KIT T670I`, or `KRAS G12C`).
- **Interactive Trial Explorer**:
  - Direct filtering for active, recruiting Phase 1, Phase 2, and Phase 3 interventional trials.
  - Displays NCT ID with direct external link, official title, study phase, recruitment status badges, lead sponsor, conditions, and investigational drug interventions.
  - Quick query chips for Gene + Variant, All Gene Studies, or Codon-level exploration.
  - Expandable study synopsis accordions.
- **Resilient Dual-Mode Fetching**: Direct browser CORS REST fetch with fallback to the local FastAPI `/api/trials` proxy.

### 4. 🧬 Interactive 3D WebGL Structural Workbench
- **AlphaFold DB & PDB Fallback**: Automatically resolves AlphaFold DB v4/v6 predicted structures with pLDDT confidence coloring. Mega-proteins exceeding monomer limits (e.g. APC at 2,843 aa) automatically fall back to high-resolution RCSB PDB crystal structures (e.g. `5IZA`).
- **3-Way Responsive Workbench Layout**:
  - **Dual Split (3D + Table)**: Synchronized 3D pocket pivoting alongside the variation catalog.
  - **Full Variations Table (25 Rows)**: 100% full-width dataset view with relaxed column widths.
  - **3D Structure Focus**: Full-canvas WebGL viewer for structural analysis, pocket inspection, and high-res PNG export.
- **1D Mutation Density Skyline**: 75-bin sequence mutation histogram with ClinVar pathogenic hotspots and precision residue alignment.

### 5. 📊 dbSNP Registry & PredictSNP Exporter
- Automated extraction of dbSNP rsIDs with direct NCBI links, copy buttons, and clinical significance filtering (Pathogenic, VUS, Benign).
- Formats EBI genomic coordinates (`NC_000007.14:g.55019281C>T` → `7,55019281,C,T`) with 1-click clipboard copy and `.txt` export for PredictSNP / VEP workflows.

---

## 🚀 Quick Start (Web Application)

### 1. Launch FastAPI Backend
```bash
pip install -r requirements.txt
python server.py
# Server runs on http://0.0.0.0:8000 (API docs at http://localhost:8000/docs)
```

> **Requirements**: `fastapi`, `uvicorn`, `requests`, `pandas`, `openpyxl`, `click`, `python-multipart`.

### 2. Launch React Frontend
```bash
cd frontend
npm install
npm run dev
# Vite dev server runs on http://localhost:5173
```

Open `http://localhost:5173` in your browser to explore the Landing Page, Patient VCF Triage Hub, 3D Workbench, and Batch Hub.

---

## 🔬 REST API Endpoints

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/vcf/triage` | `POST` | Upload and triage a patient `.vcf` file, computing residue $\Delta V$, charge shifts, and risk tiers |
| `/api/protein/{accession}` | `GET` | Retrieve parsed UniProt metadata, variation features, and coordinates |
| `/api/structure/{accession}` | `GET` | Resolve AlphaFold DB or RCSB PDB 3D structure coordinates |
| `/api/trials` | `GET` | Proxy live search to ClinicalTrials.gov API v2 for a gene or variant |
| `/api/batch/run` | `POST` | Execute multi-protein batch pipeline on accession lists |

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

UniRet includes pre-configured sample datasets located in [`UniRet/data/`](file:///Users/sushant/Projects/Uniret_v2/UniRet/data):

| File | Format | Target Cohort |
| :--- | :--- | :--- |
| [`uniprotids.xlsx`](file:///Users/sushant/Projects/Uniret_v2/UniRet/data/uniprotids.xlsx) | Excel (`.xlsx`) | **Original project test target**: `P10721` (*KIT* / Mast/stem cell growth factor receptor Kit, 976 aa, 3,483 variants). |
| [`test_proteins.xlsx`](file:///Users/sushant/Projects/Uniret_v2/UniRet/data/test_proteins.xlsx) | Excel (`.xlsx`) | **Multi-protein oncology suite**: `P10721` (*KIT*), `P04637` (*TP53*), `P00533` (*EGFR*), `P38398` (*BRCA1*), `P01116` (*KRAS*). |
| [`test_proteins.csv`](file:///Users/sushant/Projects/Uniret_v2/UniRet/data/test_proteins.csv) | CSV | Same 5 benchmark targets in standard comma-separated format. |

---

## 📋 Parsed Variation Attributes

Every variation record extracted and analyzed by UniRet contains the following normalized fields:

| Field | Source & Description |
| :--- | :--- |
| `begin`, `end` | Amino acid sequence residue coordinates |
| `wildType`, `mutatedType` | Wild-type and mutated single-letter amino acid code |
| `rs_id`, `rs_ids` | Primary and complete array of NCBI dbSNP accession identifiers |
| `type` | Classification (`Natural variant`, `Mutagenesis`, etc.) |
| `clinical_significance` | ClinVar status (`Pathogenic`, `Likely pathogenic`, `VUS`, `Benign`) |
| `description` | Associated disease phenotypes and literature notes |
| `predictsnp` | Normalized PredictSNP chromosomal coordinate (`chr,pos,ref,alt`) |
| `biophysics` | Computed empirical $\Delta V$ ($\text{Å}^3$), $\Delta q$, $\Delta H$, steric category, structural alerts, and risk tier |
| `score`, `predAlgorithmNameType` | In silico pathogenicity scores (SIFT, PolyPhen) |
| `genomicLocation` | Raw EBI genomic assembly string |

---

## 🏗️ Architecture & Technology Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn, Requests, Pandas, OpenPyXL, Click, Python-Multipart.
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, 3Dmol.js (WebGL).
- **APIs**: EBI Proteins REST API, UniProtKB REST API, AlphaFold DB, RCSB PDB, NCBI dbSNP, ClinicalTrials.gov API v2.
- **Compute Model**: Client-side zero-compute execution — all biophysical triage equations and VCF transformations run locally in the browser.

---

## 📄 License

MIT License. Designed and maintained for open-source structural bioinformatics.
