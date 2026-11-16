import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Eye,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertTriangle,
  Dna,
  Activity,
  Layers,
  Sparkles,
  BookOpen,
  Share2,
} from 'lucide-react';

export default function VariantDetailDrawer({
  isOpen,
  onClose,
  variant,
  proteinInfo,
  variations = [],
  onSelectVariant,
  onFilterResidue,
}) {
  const [copiedField, setCopiedField] = useState(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !variant) return null;

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const downloadVariantJSON = () => {
    const blob = new Blob([JSON.stringify(variant, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proteinInfo?.accession || 'protein'}_variant_${variant.wildType || ''}${variant.begin}${variant.mutatedType || ''}.json`;
    a.click();
  };

  // Find index in current variations array for Prev/Next navigation
  const currentIndex = variations.findIndex(
    (v) =>
      (v.id && variant.id && v.id === variant.id) ||
      (String(v.begin) === String(variant.begin) &&
        String(v.mutatedType || '') === String(variant.mutatedType || ''))
  );

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < variations.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      const prevV = variations[currentIndex - 1];
      if (onSelectVariant) onSelectVariant(prevV);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextV = variations[currentIndex + 1];
      if (onSelectVariant) onSelectVariant(nextV);
    }
  };

  // Clinical badge helper
  const getClinBadge = (val) => {
    if (!val || val === '(blank)') {
      return (
        <span className="text-slate-400 font-mono text-xs bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
          Not Reported
        </span>
      );
    }
    const lower = val.toLowerCase();
    let bg = 'bg-slate-800 text-slate-300 border-slate-700';

    if (lower === 'pathogenic') {
      bg = 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
    } else if (lower.includes('likely pathogenic')) {
      bg = 'bg-orange-500/20 text-orange-300 border-orange-500/40 font-semibold';
    } else if (lower.includes('uncertain') || lower.includes('vus')) {
      bg = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    } else if (lower.includes('likely benign')) {
      bg = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    } else if (lower === 'benign') {
      bg = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    } else if (lower.includes('drug response')) {
      bg = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    }

    return (
      <span className={`text-xs px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 ${bg}`}>
        <Activity className="w-3.5 h-3.5" />
        {val}
      </span>
    );
  };

  // Extract all distinct description lines
  const descriptionLines = (() => {
    if (Array.isArray(variant.descriptions) && variant.descriptions.length > 0) {
      return variant.descriptions;
    }
    if (variant.description) {
      return variant.description
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  })();

  const mutationNotation = `${variant.wildType || ''}${variant.begin}${variant.mutatedType || ''}`;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
      />

      {/* Slide-over Drawer Panel */}
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] lg:w-[560px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 ease-out"
        aria-label="Variant Details Inspector"
      >
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-slate-800/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-mono font-bold text-sm shadow-md shadow-blue-500/20">
              {mutationNotation}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono tracking-tight">
                  {mutationNotation}
                </h2>
                <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                  Residue #{variant.begin}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
                {proteinInfo?.gene_name ? `${proteinInfo.gene_name} • ` : ''}
                {proteinInfo?.protein_name || proteinInfo?.accession || 'Protein Variant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={downloadVariantJSON}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Download Variant JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Close panel (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Actions Ribbon */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {getClinBadge(variant.clinical_significance || variant.type_clin)}
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {variant.type === 'VARIANT' ? 'Natural variant' : variant.type || 'Variant'}
            </span>
          </div>

          {/* Residue Table Filter Action */}
          {onFilterResidue && (
            <button
              onClick={() => onFilterResidue(variant.begin)}
              className="text-xs text-blue-400 hover:text-blue-300 bg-blue-950/60 border border-blue-800/60 hover:border-blue-700 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 transition-colors font-medium"
              title={`Filter dataset to variants at position ${variant.begin}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter Pos #{variant.begin}</span>
            </button>
          )}
        </div>

        {/* Scrollable Inspector Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5 text-slate-300 text-xs">
          {/* 1. Full Un-truncated Phenotype & Disease Description */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                Clinical Phenotype & Disease Annotation
              </span>
              <button
                onClick={() => handleCopy(variant.description || descriptionLines.join('; '), 'desc')}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                title="Copy description"
              >
                {copiedField === 'desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>

            {descriptionLines.length > 0 ? (
              <div className="space-y-2">
                {descriptionLines.map((line, idx) => {
                  const isDisease = line.toLowerCase().includes('disease') || line.toLowerCase().includes('cancer') || line.toLowerCase().includes('syndrome');
                  const isFunctional = line.toLowerCase().includes('mutation') || line.toLowerCase().includes('hydrolysis') || line.toLowerCase().includes('activity') || line.toLowerCase().includes('cleavage');

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border leading-relaxed ${
                        isDisease
                          ? 'bg-rose-950/20 border-rose-800/40 text-slate-200'
                          : isFunctional
                          ? 'bg-blue-950/20 border-blue-800/40 text-slate-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                          {isDisease ? (
                            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                          )}
                        </div>
                        <p className="text-xs leading-relaxed font-sans">{line}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-500 italic">
                No specific phenotype, disease association, or functional literature annotation recorded in UniProt for this variant.
              </div>
            )}
          </section>

          {/* 2. Registry Identifiers & Cross-References */}
          <section className="space-y-2.5">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-indigo-400" />
              Cross-References & External Registries
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* dbSNP */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[11px] text-slate-400 font-medium">NCBI dbSNP</span>
                <div className="mt-1 flex items-center justify-between">
                  {variant.rs_id ? (
                    <a
                      href={`https://www.ncbi.nlm.nih.gov/snp/${variant.rs_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-sm font-bold text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1"
                    >
                      <span>{variant.rs_id}</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>
                  ) : (
                    <span className="text-slate-600 font-mono text-xs">Not indexed</span>
                  )}
                  {variant.rs_id && (
                    <button
                      onClick={() => handleCopy(variant.rs_id, 'rs_id')}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                      title="Copy rsID"
                    >
                      {copiedField === 'rs_id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* ClinVar Accession */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[11px] text-slate-400 font-medium">NCBI ClinVar</span>
                <div className="mt-1 flex items-center justify-between">
                  {Array.isArray(variant.clinvar_ids) && variant.clinvar_ids.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {variant.clinvar_ids.map((cid) => (
                        <a
                          key={cid}
                          href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${cid.replace(/[^0-9]/g, '') || cid}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs font-bold text-orange-400 hover:text-orange-300 hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>{cid}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-600 font-mono text-xs">-</span>
                  )}
                  {Array.isArray(variant.clinvar_ids) && variant.clinvar_ids.length > 0 && (
                    <button
                      onClick={() => handleCopy(variant.clinvar_ids.join(', '), 'clinvar')}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                      title="Copy ClinVar ID"
                    >
                      {copiedField === 'clinvar' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* COSMIC Somatic Mutation */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[11px] text-slate-400 font-medium">COSMIC Cancer Registry</span>
                <div className="mt-1 flex items-center justify-between">
                  {Array.isArray(variant.cosmic_ids) && variant.cosmic_ids.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {variant.cosmic_ids.map((cid) => (
                        <a
                          key={cid}
                          href={`https://cancer.sanger.ac.uk/cosmic/mutation/overview?id=${cid.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>{cid}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-600 font-mono text-xs">-</span>
                  )}
                  {Array.isArray(variant.cosmic_ids) && variant.cosmic_ids.length > 0 && (
                    <button
                      onClick={() => handleCopy(variant.cosmic_ids.join(', '), 'cosmic')}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                      title="Copy COSMIC ID"
                    >
                      {copiedField === 'cosmic' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* UniProt Feature ID */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[11px] text-slate-400 font-medium">UniProtKB Feature ID</span>
                <div className="mt-1 flex items-center justify-between">
                  {variant.id ? (
                    <a
                      href={`https://www.uniprot.org/uniprotkb/${proteinInfo?.accession || ''}#variants`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs font-bold text-slate-300 hover:text-white hover:underline inline-flex items-center gap-1"
                    >
                      <span>{variant.id}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </a>
                  ) : (
                    <span className="text-slate-600 font-mono text-xs">-</span>
                  )}
                  {variant.id && (
                    <button
                      onClick={() => handleCopy(variant.id, 'ftId')}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                      title="Copy Feature ID"
                    >
                      {copiedField === 'ftId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 3. Genomic & Computational Predictor Pipeline */}
          <section className="space-y-2.5">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Dna className="w-3.5 h-3.5 text-emerald-400" />
              Genomics & Computational Predictions
            </span>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              {/* PredictSNP Coordinate */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                <div>
                  <span className="text-slate-400 font-medium">PredictSNP Coordinate:</span>
                  <p className="text-[11px] text-slate-500">Reformatted chromosome, position, ref, alt for machine learning ingestion</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/60">
                    {variant.predictsnp || 'N/A'}
                  </span>
                  {variant.predictsnp && (
                    <button
                      onClick={() => handleCopy(variant.predictsnp, 'psnp')}
                      className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                      title="Copy PredictSNP coordinate"
                    >
                      {copiedField === 'psnp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Genomic Location */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                <span className="text-slate-400 font-medium">EBI Genomic Assembly:</span>
                <span className="font-mono text-xs text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 truncate max-w-xs">
                  {variant.genomicLocation || 'N/A'}
                </span>
              </div>

              {/* In Silico Score */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-slate-400 font-medium">In Silico Predictor Score:</span>
                  <p className="text-[11px] text-slate-500">
                    {variant.predAlgorithmNameType ? `${variant.predAlgorithmNameType} algorithm` : 'PolyPhen / SIFT damage index'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {variant.score ? (
                    <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/40 px-2 py-1 rounded border border-amber-800/60">
                      Score: {variant.score}
                    </span>
                  ) : (
                    <span className="text-slate-500 font-mono text-xs">No score computed</span>
                  )}
                </div>
              </div>

              {/* Review Status */}
              {variant.reviewStatus && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">ClinVar Review Status:</span>
                  <span className="text-slate-300 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {variant.reviewStatus}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* 4. Sequence & Residue Context */}
          <section className="space-y-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Sequence Substitution
            </span>

            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl flex items-center justify-around text-center">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Wild-Type</span>
                <span className="font-mono text-lg font-bold text-white bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                  {variant.wildType || '-'}
                </span>
              </div>
              <div className="text-slate-600 font-mono text-lg">→</div>
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Position</span>
                <span className="font-mono text-lg font-bold text-blue-400 bg-blue-950/40 px-3 py-1 rounded-lg border border-blue-800/60">
                  #{variant.begin}
                </span>
              </div>
              <div className="text-slate-600 font-mono text-lg">→</div>
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Mutated</span>
                <span className="font-mono text-lg font-bold text-rose-400 bg-rose-950/40 px-3 py-1 rounded-lg border border-rose-800/60">
                  {variant.mutatedType || '-'}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom Navigation & Close Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              disabled={!hasPrev}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors"
              title="Previous variant in dataset"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors"
              title="Next variant in dataset"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </aside>
    </>
  );
}
