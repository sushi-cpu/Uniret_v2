"""
app.py - UniRet Interactive Webtool Prototype (Streamlit MVP)

Run locally:
    streamlit run UniRet/app.py
"""

import io
import json
import tempfile
import zipfile
from pathlib import Path

import pandas as pd
import requests
import streamlit as st

from uniret.fetch import EBI_VARIATION_URL, UNIPROT_REST_URL, _get
from uniret.genomic import _process_genomic_location
from uniret.ids import read_ids_from_file
from uniret.parse import _process_variation_json

st.set_page_config(
    page_title="UniRet — Protein Variation Webtool",
    page_icon="🧬",
    layout="wide",
)

# Custom Styling
st.markdown(
    """
    <style>
    .main-title {
        font-size: 2.2rem;
        font-weight: 700;
        color: #1E3A8A;
        margin-bottom: 0.2rem;
    }
    .sub-title {
        font-size: 1.05rem;
        color: #4B5563;
        margin-bottom: 1.5rem;
    }
    .metric-card {
        background-color: #F3F4F6;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 10px;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown('<div class="main-title">🧬 UniRet Web Workbench</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="sub-title">Interactive UniProt SNP variation retrieval, tabular parsing, and PredictSNP preparation.</div>',
    unsafe_allow_html=True,
)

tab1, tab2, tab3 = st.tabs(["🔍 Single Protein Explorer", "📁 Batch Pipeline Runner", "📖 Documentation & Ideas"])

# ==============================================================================
# TAB 1: Single Protein Explorer
# ==============================================================================
with tab1:
    st.subheader("Single Protein Variation Explorer")
    col1, col2 = st.columns([3, 1])
    with col1:
        protein_input = st.text_input(
            "Enter UniProt Accession ID:",
            value="P04637",
            placeholder="e.g. P04637 (TP53), P00533 (EGFR), P38398 (BRCA1)",
            help="UniProtKB accession identifier",
        ).strip().upper()
    with col2:
        st.write("")
        st.write("")
        fetch_btn = st.button("Fetch & Analyze", type="primary", use_container_width=True)

    if protein_input:
        if fetch_btn or "current_uid" not in st.session_state or st.session_state.current_uid != protein_input:
            with st.spinner(f"Fetching variation and annotation data for {protein_input}..."):
                # Fetch UniProt General Info
                info_data = {}
                try:
                    info_resp = _get(UNIPROT_REST_URL.format(uid=protein_input))
                    if info_resp.status_code == 200:
                        raw_info = info_resp.json()
                        info_data = {
                            "Protein Name": raw_info.get("proteinDescription", {})
                            .get("recommendedName", {})
                            .get("fullName", {})
                            .get("value", "N/A"),
                            "Gene Name": raw_info.get("genes", [{}])[0]
                            .get("geneName", {})
                            .get("value", "N/A"),
                            "Organism": raw_info.get("organism", {}).get("scientificName", "N/A"),
                            "Length": raw_info.get("sequence", {}).get("length", "N/A"),
                            "Sequence": raw_info.get("sequence", {}).get("value", ""),
                            "Function": "; ".join(
                                [
                                    c.get("text", [{}])[0].get("value", "")
                                    for c in raw_info.get("comments", [])
                                    if c.get("commentType") == "FUNCTION"
                                ]
                            ),
                        }
                except Exception as exc:
                    st.warning(f"Could not retrieve UniProt protein info: {exc}")

                # Fetch EBI Variation JSON
                var_df = pd.DataFrame()
                try:
                    var_resp = _get(EBI_VARIATION_URL.format(uid=protein_input))
                    if var_resp.status_code == 200:
                        # Write temporary JSON and process using existing uniret logic
                        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tmp_json:
                            tmp_json.write(json.dumps(var_resp.json()))
                            tmp_path = Path(tmp_json.name)
                        var_df = _process_variation_json(tmp_path)
                        tmp_path.unlink(missing_ok=True)
                    elif var_resp.status_code == 404:
                        st.info(f"No variation data recorded in EBI for accession {protein_input}.")
                    else:
                        st.error(f"EBI API returned HTTP {var_resp.status_code}")
                except Exception as exc:
                    st.error(f"Error fetching variations: {exc}")

                st.session_state.current_uid = protein_input
                st.session_state.info_data = info_data
                st.session_state.var_df = var_df

        # Display results if available
        if "var_df" in st.session_state and st.session_state.current_uid == protein_input:
            info = st.session_state.get("info_data", {})
            df = st.session_state.get("var_df", pd.DataFrame())

            # Protein Overview Card
            if info:
                st.markdown("---")
                mcol1, mcol2, mcol3, mcol4 = st.columns(4)
                with mcol1:
                    st.metric("Gene", info.get("Gene Name", "N/A"))
                with mcol2:
                    st.metric("Organism", info.get("Organism", "N/A"))
                with mcol3:
                    st.metric("Sequence Length", f"{info.get('Length', 'N/A')} aa")
                with mcol4:
                    st.metric("Total Variants", len(df))

                if info.get("Protein Name"):
                    st.markdown(f"**Protein**: {info.get('Protein Name')}")
                if info.get("Function"):
                    with st.expander("📖 View Protein Function Description"):
                        st.write(info.get("Function"))

            if not df.empty:
                st.markdown("### Variations Dataset")

                # Filters
                fcol1, fcol2, fcol3 = st.columns(3)
                with fcol1:
                    types_available = ["All"] + sorted([str(t) for t in df["type"].dropna().unique()]) if "type" in df.columns else ["All"]
                    selected_type = st.selectbox("Filter by Variation Type:", types_available)
                with fcol2:
                    search_kw = st.text_input("Search (keyword, position, amino acid):", "")
                with fcol3:
                    pathogenic_only = st.checkbox("Only Pathogenic / ClinVar reported")

                filtered_df = df.copy()
                if selected_type != "All":
                    filtered_df = filtered_df[filtered_df["type"] == selected_type]

                if pathogenic_only and "type_clin" in filtered_df.columns:
                    filtered_df = filtered_df[filtered_df["type_clin"].astype(str).str.contains("pathogenic", case=False, na=False)]
                elif pathogenic_only and "type" in filtered_df.columns and "reviewStatus" in filtered_df.columns:
                    filtered_df = filtered_df[filtered_df["reviewStatus"].notna() & (filtered_df["reviewStatus"] != "")]

                if search_kw:
                    mask = filtered_df.astype(str).apply(lambda row: row.str.contains(search_kw, case=False).any(), axis=1)
                    filtered_df = filtered_df[mask]

                st.write(f"Showing **{len(filtered_df)}** of **{len(df)}** variations:")
                st.dataframe(filtered_df, use_container_width=True, height=350)

                # Export Section
                st.markdown("#### 📥 Export Data")
                ecol1, ecol2, ecol3, ecol4 = st.columns(4)
                with ecol1:
                    csv_data = filtered_df.to_csv(index=False).encode("utf-8")
                    st.download_button(
                        label="Download CSV",
                        data=csv_data,
                        file_name=f"{protein_input}_variations.csv",
                        mime="text/csv",
                        use_container_width=True,
                    )
                with ecol2:
                    tsv_data = filtered_df.to_csv(index=False, sep="\t").encode("utf-8")
                    st.download_button(
                        label="Download TSV",
                        data=tsv_data,
                        file_name=f"{protein_input}_variations.tsv",
                        mime="text/tab-separated-values",
                        use_container_width=True,
                    )
                with ecol3:
                    json_data = filtered_df.to_json(orient="records", indent=2).encode("utf-8")
                    st.download_button(
                        label="Download JSON",
                        data=json_data,
                        file_name=f"{protein_input}_variations.json",
                        mime="application/json",
                        use_container_width=True,
                    )
                with ecol4:
                    if "genomicLocation" in filtered_df.columns:
                        psnp_df = filtered_df.copy()
                        psnp_df["PredictSNP_Genomic"] = psnp_df["genomicLocation"].apply(_process_genomic_location)
                        psnp_csv = psnp_df.to_csv(index=False).encode("utf-8")
                        st.download_button(
                            label="Download PredictSNP Formatted",
                            data=psnp_csv,
                            file_name=f"{protein_input}_predictsnp.csv",
                            mime="text/csv",
                            use_container_width=True,
                        )
                    else:
                        st.info("No genomicLocation for PredictSNP")
            else:
                st.info(f"No variation records available for {protein_input}.")

# ==============================================================================
# TAB 2: Batch Pipeline Runner
# ==============================================================================
with tab2:
    st.subheader("Batch High-Throughput Pipeline")
    st.write("Upload a file containing UniProt IDs or enter multiple IDs to run the complete UniRet pipeline.")

    input_mode = st.radio("Input Source:", ["Upload File (.xlsx, .csv, .tsv, .txt)", "Paste UniProt IDs"], horizontal=True)
    batch_ids = []

    if input_mode == "Upload File (.xlsx, .csv, .tsv, .txt)":
        uploaded_file = st.file_uploader(
            "Upload file",
            type=["xlsx", "xls", "csv", "tsv", "txt"],
            help="File must contain a 'UniprotID' column or be a line-separated .txt file",
        )
        if uploaded_file is not None:
            with tempfile.NamedTemporaryFile(suffix=Path(uploaded_file.name).suffix, delete=False) as tmp_upload:
                tmp_upload.write(uploaded_file.getvalue())
                tmp_path = Path(tmp_upload.name)
            try:
                batch_ids = read_ids_from_file(tmp_path)
                st.success(f"Detected **{len(batch_ids)}** unique UniProt IDs in uploaded file.")
            except Exception as e:
                st.error(f"Error reading IDs: {e}")
            finally:
                tmp_path.unlink(missing_ok=True)
    else:
        text_input = st.text_area("Enter UniProt IDs (separated by spaces, commas, or new lines):", value="P04637\nP00533\nP38398")
        if text_input:
            import re
            batch_ids = list(dict.fromkeys([x for x in re.split(r"[\s,]+", text_input.strip().upper()) if x]))
            st.info(f"Parsed **{len(batch_ids)}** unique UniProt IDs.")

    st.markdown("---")
    st.markdown("#### Pipeline Options")
    pcol1, pcol2 = st.columns(2)
    with pcol1:
        opt_with_info = st.checkbox("Include General Protein Info (uniprot_info.csv)", value=True)
        opt_with_genomic = st.checkbox("Reformat for PredictSNP", value=True)
    with pcol2:
        opt_sort = st.checkbox("Sort variations by type into per-protein folders", value=True)
        opt_format = st.selectbox("Table Output Format:", ["csv", "tsv", "json"])

    if batch_ids:
        if st.button("🚀 Run Pipeline for Batch", type="primary"):
            progress_bar = st.progress(0.0)
            status_text = st.empty()
            summary_log = []

            # Create temporary working directory
            with tempfile.TemporaryDirectory() as tmp_work_dir:
                work_path = Path(tmp_work_dir)
                json_dir = work_path / "json"
                var_dir = work_path / "variations"
                sorted_dir = work_path / "sorted"
                info_dir = work_path / "info"
                predictsnp_dir = work_path / "predictsnp"

                json_dir.mkdir(parents=True, exist_ok=True)
                var_dir.mkdir(parents=True, exist_ok=True)

                total_ids = len(batch_ids)

                # Step 1: Optional Info Fetch
                if opt_with_info:
                    status_text.text("Fetching general UniProt info...")
                    info_dir.mkdir(parents=True, exist_ok=True)
                    from uniret.fetch import fetch_uniprot_info
                    fetch_uniprot_info(batch_ids, info_dir, delay=0.1)

                # Step 2: Fetch & Parse variations
                for i, uid in enumerate(batch_ids):
                    status_text.text(f"Processing ({i+1}/{total_ids}): {uid}...")
                    progress_bar.progress((i + 1) / total_ids)

                    # Fetch
                    try:
                        resp = _get(EBI_VARIATION_URL.format(uid=uid))
                        if resp.status_code == 200:
                            json_file = json_dir / f"{uid}_variations.json"
                            json_file.write_text(json.dumps(resp.json(), indent=2))
                            df = _process_variation_json(json_file)
                            if not df.empty:
                                if opt_format == "csv":
                                    df.to_csv(var_dir / f"{uid}_variations.csv", index=False)
                                elif opt_format == "tsv":
                                    df.to_csv(var_dir / f"{uid}_variations.tsv", index=False, sep="\t")
                                elif opt_format == "json":
                                    df.to_json(var_dir / f"{uid}_variations.json", orient="records", indent=2)
                                summary_log.append(f"✓ {uid}: {len(df)} variants")
                            else:
                                summary_log.append(f"○ {uid}: empty")
                        else:
                            summary_log.append(f"✗ {uid}: HTTP {resp.status_code}")
                    except Exception as e:
                        summary_log.append(f"✗ {uid}: Error {e}")

                # Step 3: Optional Sort
                if opt_sort:
                    status_text.text("Sorting variations by type...")
                    from uniret.sort import sort_variations
                    sort_variations(var_dir, sorted_dir, fmt=opt_format)

                # Step 4: Optional PredictSNP
                if opt_with_genomic:
                    status_text.text("Reformatting genomic locations for PredictSNP...")
                    from uniret.genomic import parse_genomic
                    parse_genomic(var_dir, predictsnp_dir, fmt=opt_format)

                status_text.success("Pipeline execution complete! Packaging ZIP...")

                # Package ZIP in-memory
                zip_buffer = io.BytesIO()
                with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
                    for folder in [json_dir, var_dir, sorted_dir, info_dir, predictsnp_dir]:
                        if folder.exists():
                            for f in folder.rglob("*"):
                                if f.is_file():
                                    arcname = f.relative_to(work_path)
                                    zip_file.write(f, arcname)

                zip_buffer.seek(0)
                st.download_button(
                    label="📦 Download Complete Results Bundle (ZIP)",
                    data=zip_buffer.getvalue(),
                    file_name="uniret_batch_results.zip",
                    mime="application/zip",
                    type="primary",
                    use_container_width=True,
                )

                with st.expander("View Execution Summary Log", expanded=True):
                    st.text("\n".join(summary_log))

# ==============================================================================
# TAB 3: Documentation & Potential Ideas
# ==============================================================================
with tab3:
    st.subheader("UniRet Webtool Architectural Potential & Roadmap")
    st.markdown(
        """
        The comprehensive specification, feature concepts, API design, and publication roadmap
        have been detailed in **`Potential.md`**.
        """
    )
    potential_file = Path(__file__).parent / "Potential.md"
    if potential_file.exists():
        st.markdown(potential_file.read_text())
    else:
        st.info("Potential.md is located in the root repository directory.")
