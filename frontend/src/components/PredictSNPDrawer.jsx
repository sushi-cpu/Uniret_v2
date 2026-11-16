import React, { useState } from 'react';
import { X, Copy, Check, Download, ExternalLink, Dna, FileText } from 'lucide-react';

export default function PredictSNPDrawer({ isOpen, onClose, variations, accession }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Extract all non-empty PredictSNP formatted lines
  const predictsnpLines = variations
    .map((v) => v.predictsnp)
    .filter(Boolean);

  const formattedText = predictsnpLines.join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([formattedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${accession}_predictsnp_formatted.txt`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Dna className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">PredictSNP Coordinate Exporter</h2>
              <p className="text-xs text-slate-400">Reformatted from EBI genomicLocation for PredictSNP / VEP ingestion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
          <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-2">
            <div className="font-semibold text-white flex items-center gap-2">
              <span>Standard Format:</span>
              <code className="text-emerald-400 font-mono text-[11px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                Chromosome,Position,Ref_Base,Alt_Base
              </code>
            </div>
            <p className="text-slate-400 leading-relaxed">
              UniRet automatically converts EBI format (e.g. <span className="font-mono text-slate-300">NC_000007.14:g.55019281C&gt;T</span>)
              into standard input for PredictSNP, Ensembl VEP, or FoldX pipelines.
            </p>
            <div className="text-slate-400">
              Found <strong className="text-white">{predictsnpLines.length}</strong> compatible variations for <span className="font-mono text-blue-300">{accession}</span>.
            </div>
          </div>

          {/* Formatted Code Block */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-300">Preview Formatted Lines ({predictsnpLines.length}):</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 font-medium"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy All'}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-medium shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Download .txt
                </button>
              </div>
            </div>

            <textarea
              readOnly
              value={formattedText || 'No compatible genomic locations found for this protein.'}
              rows={12}
              className="w-full bg-slate-950 font-mono text-[11px] text-emerald-400 p-3.5 rounded-xl border border-slate-800 focus:outline-none resize-none shadow-inner"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <a
            href="https://loschmidt.chemi.muni.cz/predictsnp1/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium text-xs"
          >
            Go to PredictSNP Web Server <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-1.5 rounded-xl text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
