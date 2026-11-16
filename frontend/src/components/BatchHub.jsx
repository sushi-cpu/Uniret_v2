import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Play,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  FolderArchive,
  Sliders,
  Dna,
} from 'lucide-react';

export default function BatchHub({ onSelectProteinFor3D }) {
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [inputMode, setInputMode] = useState('file'); // 'file' or 'text'
  const [parsedIds, setParsedIds] = useState([]);
  const [parsingFile, setParsingFile] = useState(false);
  const [fileError, setFileError] = useState(null);

  // Pipeline configuration options matching uniret CLI
  const [withInfo, setWithInfo] = useState(true);
  const [withGenomic, setWithGenomic] = useState(true);
  const [splitSorted, setSplitSorted] = useState(true);
  const [format, setFormat] = useState('csv');

  // Execution state
  const [running, setRunning] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [executionError, setExecutionError] = useState(null);

  // Handle file selection
  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setFileError(null);
    setParsingFile(true);
    setBatchResults(null);

    const formData = new FormData();
    formData.append('file', selected);

    try {
      const resp = await fetch('/api/batch/parse-file', {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const errJson = await resp.json();
        throw new Error(errJson.detail || 'Failed to parse file.');
      }

      const res = await resp.json();
      setParsedIds(res.ids || []);
    } catch (err) {
      console.error(err);
      setFileError(err.message || 'Error parsing IDs from file.');
      setParsedIds([]);
    } finally {
      setParsingFile(false);
    }
  };

  // Handle pasted text parsing
  const handlePastedTextChange = (text) => {
    setPastedText(text);
    const tokens = text
      .split(/[\s,;\n\t]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 2);
    const unique = Array.from(new Set(tokens));
    setParsedIds(unique);
  };

  // Run the batch pipeline
  const handleRunBatch = async () => {
    if (parsedIds.length === 0) return;

    setRunning(true);
    setExecutionError(null);
    setBatchResults(null);

    try {
      const resp = await fetch('/api/batch/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: parsedIds,
          with_info: withInfo,
          with_genomic: withGenomic,
          split_sorted: splitSorted,
          fmt: format,
          delay: 0.2,
        }),
      });

      if (!resp.ok) {
        const errJson = await resp.json();
        throw new Error(errJson.detail || 'Batch execution failed.');
      }

      const res = await resp.json();
      setBatchResults(res);
    } catch (err) {
      console.error(err);
      setExecutionError(err.message || 'Error running batch pipeline.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-bold text-white">Batch Processing & Pipeline Hub</span>
              <span className="text-xs bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded-full border border-blue-500/30">
                Core uniret Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Upload spreadsheets or text files containing UniProt IDs to run the automated pipeline (Fetch → Parse → Sort → PredictSNP).
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setInputMode('file')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                inputMode === 'file'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Upload Spreadsheet / File
            </button>
            <button
              onClick={() => setInputMode('text')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                inputMode === 'text'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Paste ID List
            </button>
          </div>
        </div>

        {/* Input Area */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Dropzone / Input */}
          <div className="lg:col-span-7 space-y-4">
            {/* Quick Load Test Data Buttons */}
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <span className="text-xs text-slate-400">Sample Test Data:</span>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setParsedIds(['P10721']);
                  setFileError(null);
                  setBatchResults(null);
                }}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-300 font-mono px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                title="Loads original project benchmark: P10721 (c-KIT)"
              >
                🧪 Original Test Data (P10721 / c-KIT)
              </button>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setParsedIds(['P10721', 'P04637', 'P00533', 'P38398', 'P01116']);
                  setFileError(null);
                  setBatchResults(null);
                }}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-purple-300 font-mono px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                title="Loads benchmark suite with 5 target proteins"
              >
                🧪 Multi-Protein Suite (5 IDs)
              </button>
            </div>

            {inputMode === 'file' ? (
              <div className="border-2 border-dashed border-slate-700/80 hover:border-blue-500/80 rounded-2xl p-6 text-center transition-all bg-slate-950/60 relative group">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".xlsx,.xls,.csv,.tsv,.txt"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="flex flex-col items-center justify-center space-y-2.5">
                  <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">Click or drag & drop input file</span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Supports Excel (<span className="text-emerald-400 font-mono">.xlsx</span>, <span className="text-emerald-400 font-mono">.xls</span>), CSV, TSV, or TXT
                    </p>
                  </div>
                  <div className="text-[11px] text-slate-500 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                    Auto-detects columns: <code className="text-slate-300">UniprotID</code>, <code className="text-slate-300">Accession</code>, or one ID per line
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Paste UniProt IDs (separated by spaces, commas, or new lines):
                </label>
                <textarea
                  value={pastedText}
                  onChange={(e) => handlePastedTextChange(e.target.value)}
                  placeholder="e.g. P04637 P00533 P38398 P01116 P68871"
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {fileError && (
              <div className="bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            {parsingFile && (
              <div className="text-xs text-blue-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Parsing spreadsheet and extracting UniProt IDs...</span>
              </div>
            )}

            {/* Detected IDs Pill List */}
            {parsedIds.length > 0 && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Detected {parsedIds.length} Unique UniProt IDs
                  </span>
                  {file && <span className="text-slate-400 font-mono text-[11px]">{file.name}</span>}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {parsedIds.map((id) => (
                    <span
                      key={id}
                      className="text-[11px] font-mono bg-slate-900 text-blue-300 px-2 py-0.5 rounded border border-slate-800"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pipeline Configuration Options */}
          <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Pipeline Options</span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={withInfo}
                    onChange={(e) => setWithInfo(e.target.checked)}
                    className="mt-0.5 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-medium text-slate-200">Fetch UniProt Metadata</span>
                    <p className="text-[11px] text-slate-400">Generates <code className="text-blue-300">uniprot_info.csv</code> (gene, organism, sequence, function)</p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={splitSorted}
                    onChange={(e) => setSplitSorted(e.target.checked)}
                    className="mt-0.5 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-medium text-slate-200">Sort by Variation Type</span>
                    <p className="text-[11px] text-slate-400">Splits tables into per-type files (<code className="text-blue-300">Natural variant</code>, <code className="text-blue-300">Mutagenesis</code>)</p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={withGenomic}
                    onChange={(e) => setWithGenomic(e.target.checked)}
                    className="mt-0.5 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-medium text-slate-200">Reformat for PredictSNP</span>
                    <p className="text-[11px] text-slate-400">Converts coordinates to <code className="text-emerald-300">chr,pos,ref,alt</code></p>
                  </div>
                </label>

                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <span className="text-slate-400">Output Table Format:</span>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1"
                  >
                    <option value="csv">CSV (.csv)</option>
                    <option value="tsv">TSV (.tsv)</option>
                    <option value="json">JSON (.json)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunBatch}
              disabled={running || parsedIds.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {running ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing Pipeline ({parsedIds.length} Proteins)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Run Batch Pipeline ({parsedIds.length} Proteins)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Execution Results View */}
      {executionError && (
        <div className="bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs p-4 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <span className="font-bold text-white">Pipeline Execution Error: </span>
            <span>{executionError}</span>
          </div>
        </div>
      )}

      {batchResults && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">Batch Execution Completed</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {batchResults.results?.length} Processed
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Results compiled according to the canonical UniRet directory layout.
              </p>
            </div>

            {batchResults.download_url && (
              <a
                href={batchResults.download_url}
                download
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-colors"
              >
                <FolderArchive className="w-4 h-4" />
                <span>Download Complete Results (.ZIP)</span>
              </a>
            )}
          </div>

          {/* Per-Protein Summary Table with 3D Workbench Link */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">UniProt Accession</th>
                  <th className="py-2.5 px-3">Fetch Status</th>
                  <th className="py-2.5 px-3">Parsed Variations</th>
                  <th className="py-2.5 px-3 text-right">Interactive 3D Workbench</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {batchResults.results?.map((r) => (
                  <tr key={r.accession} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {r.accession}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          r.status === 'ok'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <span className="text-blue-400 font-bold">{r.variant_count}</span> variations
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectProteinFor3D(r.accession)}
                        className="bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs px-3 py-1 rounded-lg transition-all inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect in 3D</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
