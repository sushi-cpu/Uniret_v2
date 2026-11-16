import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Atom, Layers, FileSpreadsheet, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function ProteinHeader({ data, onOpenPredictSNP }) {
  const [expandedFunc, setExpandedFunc] = useState(false);

  if (!data || !data.info) return null;

  const { info, total_variations, variations = [], type_counts = {}, alphafold } = data;

  // Compute smart counts
  const naturalCount = type_counts?.['Natural variant'] || type_counts?.['VARIANT'] || 0;
  const mutaCount = type_counts?.['Mutagenesis'] || 0;
  
  const pathogenicCount = variations.filter((v) => {
    const text = `${v.type_clin || ''} ${v.reviewStatus || ''}`.toLowerCase();
    return text.includes('pathogenic');
  }).length;

  const predictsnpCount = variations.filter((v) => Boolean(v.predictsnp)).length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
            <span className="font-mono text-xl font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
              {info.accession}
            </span>
            <span className="text-xl font-semibold text-blue-300">
              {info.gene_name !== 'N/A' ? info.gene_name : ''}
            </span>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 font-medium px-2 py-0.5 rounded-full border border-emerald-500/20">
              {info.organism}
            </span>
            {alphafold?.has_structure && (
              <span className="text-xs bg-purple-500/10 text-purple-400 font-medium px-2 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1">
                <Atom className="w-3 h-3" /> AlphaFold 3D Available
              </span>
            )}
          </div>
          <h1 className="text-base text-slate-300 font-medium leading-relaxed">
            {info.protein_name}
          </h1>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenPredictSNP}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all shadow-md shadow-blue-500/10"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> PredictSNP Exporter ({predictsnpCount})
          </button>
          <a
            href={`https://www.uniprot.org/uniprotkb/${info.accession}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium px-3 py-2 rounded-xl border border-slate-700 transition-colors"
          >
            UniProtKB <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={`https://alphafold.ebi.ac.uk/entry/${info.accession}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium px-3 py-2 rounded-xl border border-slate-700 transition-colors"
          >
            AlphaFold DB <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="text-xs text-slate-400 font-medium">Protein Length</div>
          <div className="text-lg font-bold text-white mt-0.5">
            {info.length} <span className="text-xs text-slate-400 font-normal">aa</span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="text-xs text-slate-400 font-medium">Total Variations</div>
          <div className="text-lg font-bold text-blue-400 mt-0.5">{total_variations}</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="text-xs text-slate-400 font-medium">Natural / Population</div>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">{naturalCount}</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="text-xs text-slate-400 font-medium">PredictSNP Compatible</div>
          <div className="text-lg font-bold text-purple-400 mt-0.5">{predictsnpCount}</div>
        </div>
      </div>

      {/* Function Description Dropdown */}
      {info.function && (
        <div className="mt-2 text-xs text-slate-400">
          <div
            className="flex items-center justify-between cursor-pointer py-1"
            onClick={() => setExpandedFunc(!expandedFunc)}
          >
            <span className="font-semibold text-slate-300">UniProt Biological Function Annotation</span>
            <button className="text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
              {expandedFunc ? <>Collapse <ChevronUp className="w-3 h-3" /></> : <>Expand Details <ChevronDown className="w-3 h-3" /></>}
            </button>
          </div>
          {expandedFunc && (
            <p className="mt-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-300 leading-relaxed font-sans">
              {info.function}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
