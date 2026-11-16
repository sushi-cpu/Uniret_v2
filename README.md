# UniRet

**UniRet** is a bioinformatics toolkit and web platform for retrieving and processing UniProt SNP variation data via the [EBI Proteins API](https://www.ebi.ac.uk/proteins/api/doc/).

> 💡 **Looking for the Webtool Roadmap & Vision?** See [Potential.md](file:///home/sushant-pdx/Desktop/softwares/Uniret/UniRet/Potential.md) for architectural blueprints, web interface ideas, REST API design, and publication targets.

---

## 🧬 UniRet 3D Predict Portal (Concept B — React Web Application)

A modern full-stack web application featuring AlphaFold 3D structural mapping, 1D sequence mutation tracks, and PredictSNP export:

```bash
# Terminal 1: Launch FastAPI Backend
python UniRet/server.py

# Terminal 2: Launch React Frontend
cd UniRet/frontend
npm run dev
```

- **AlphaFold 3D Structural Viewer (3Dmol.js)**: Automatically renders AlphaFold 3D models, colors by pLDDT confidence or secondary structure, and centers/zooms into selected mutated residues with 5Å contact shells.
- **1D Lollipop Sequence Track**: Visual representation of mutation density along the protein length.
- **Interactive Variations Grid**: Filter by Natural variant vs. Mutagenesis, ClinVar pathogenicity, and SIFT/PolyPhen scores.
- **PredictSNP 1-Click Exporter**: Automatically formats EBI genomic coordinates (`NC_000007.14:g.55019281C>T` → `7,55019281,C,T`) with instant clipboard copy and `.txt` export.

*(Note: The React frontend also has a built-in client-side fallback mode, allowing it to query public UniProt/EBI APIs directly even when the python backend is offline).*

---

## 🧪 Test & Benchmark Datasets

UniRet includes pre-configured sample datasets located in [`UniRet/data/`](file:///home/sushant-pdx/Desktop/softwares/Uniret/UniRet/data):

| File | Format | Contents & Benchmark Target |
|---|---|---|
| [`uniprotids.xlsx`](file:///home/sushant-pdx/Desktop/softwares/Uniret/UniRet/data/uniprotids.xlsx) | Excel (`.xlsx`) | **Original project test data**: `P10721` (*KIT* / Mast/stem cell growth factor receptor Kit, 976 aa, 3,483 variants). |
| [`test_proteins.xlsx`](file:///home/sushant-pdx/Desktop/softwares/Uniret/UniRet/data/test_proteins.xlsx) | Excel (`.xlsx`) | **Multi-protein benchmark suite**: `P10721` (*KIT*), `P04637` (*TP53*), `P00533` (*EGFR*), `P38398` (*BRCA1*), `P01116` (*KRAS*). |
| [`test_proteins.csv`](file:///home/sushant-pdx/Desktop/softwares/Uniret/UniRet/data/test_proteins.csv) | CSV | Same 5 benchmark targets in comma-separated format. |

### Running with Test Data:
- **CLI**:
  ```bash
  uniret run -i UniRet/data/uniprotids.xlsx -o ./results
  ```
- **Web UI**: Open `http://localhost:5173`, switch to **"Batch Pipeline Hub"**, and click **"🧪 Original Test Data (P10721 / c-KIT)"** or upload `uniprotids.xlsx`.

---

You can also run the single-file Streamlit interface:

```bash
streamlit run UniRet/app.py
```

---

## Installation

```bash
pip install uniret 
```

After install, the `uniret` command is available globally.

---

## Quick start

Run the full pipeline (fetch → parse → sort) in one command:

```bash
uniret run -i proteins.xlsx -o ./results
```

Output layout:

```
results/
├── json/               # raw variation JSONs from EBI
├── variations/         # parsed flat CSV/TSV/JSON tables
└── sorted/             # per-protein folders split by variation type
    └── P12345_variations/
        ├── Natural variant.csv
        ├── Mutagenesis.csv
        └── ...
```

---

## Input formats

UniProt IDs can be supplied in **any combination** of:

| Method | Example |
|--------|---------|
| Excel file | `-i proteins.xlsx` (needs a `UniprotID` column) |
| CSV / TSV  | `-i proteins.csv`  (same column requirement) |
| Plain text | `-i ids.txt`       (one ID per line) |
| Inline args | `uniret fetch snp P12345 Q8N158 -o ./out` |

---

## Commands

### `uniret run` — full pipeline

```bash
uniret run -i proteins.xlsx -o ./results
uniret run P12345 Q8N158    -o ./results -f tsv
uniret run -i ids.txt       -o ./results --skip-fetch   # re-use existing JSONs
```

---

### `uniret fetch snp` — fetch variation data

```bash
uniret fetch snp -i proteins.xlsx -o ./data/json
uniret fetch snp P12345 Q8N158    -o ./data/json --delay 0.5
```

---

### `uniret fetch info` — fetch general UniProt entries

```bash
uniret fetch info -i proteins.xlsx -o ./data/json
uniret fetch info P12345           -o ./data/json
```

---

### `uniret parse snp` — parse variation JSONs

```bash
uniret parse snp -d ./data/json -o ./data/variations -f csv
uniret parse snp -d ./data/json -o ./data/variations -f tsv
uniret parse snp -d ./data/json -o ./data/variations -f json
```

---

### `uniret parse info` — parse UniProt info JSONs

```bash
uniret parse info -d ./data/json -o ./data/info -f csv
```

---

### `uniret sort` — split variations by type

```bash
uniret sort -d ./data/variations -o ./data/sorted -f csv
```

---

## Options reference

| Option | Commands | Default | Description |
|--------|----------|---------|-------------|
| `-i`, `--input` | fetch, run | — | Input file of UniProt IDs |
| `-o`, `--output-dir` | all | required | Output directory |
| `-f`, `--format` | parse, sort, run | `csv` | Output format: `csv`, `tsv`, `json` |
| `-d`, `--json-dir` | parse | required | Directory of JSON files to parse |
| `-d`, `--variations-dir` | sort | required | Directory of parsed variation files |
| `--delay` | fetch, run | `0.3` | Seconds between API requests |
| `--skip-fetch` | run | `False` | Skip fetch, re-use existing JSONs |

---

## Output columns (variation tables)

| Column | Source |
|--------|--------|
| `type`, `wildType`, `mutatedType`, `begin`, `end` | Core variation fields |
| `xref_name`, `xref_id`, `xref_url` | Flattened from `xrefs` |
| `pred_valType`, `pred_score`, `pred_algorithmName` | Flattened from `predictions` |
| `loc_loc`, `loc_seqId`, `loc_source` | Flattened from `locations` |
| `clin_type`, `clin_sources`, `clin_reviewStatus` | Flattened from `clinicalSignificances` |
| `pop_populationName`, `pop_frequency`, `pop_source` | Flattened from `populationFrequencies` |

---

## Requirements

- Python 3.10+
- `click`, `requests`, `pandas`, `openpyxl`, `tqdm`
