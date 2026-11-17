import React, { useState, useEffect, useMemo } from 'react';
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
  Atom,
  Flame,
  ShieldAlert,
  Stethoscope,
  Search,
  Building2,
  Pill,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { analyzeResidueMutation } from '../utils/biophysics';
import { fetchClinicalTrials } from '../utils/trials';

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
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'trials'
  const [trialsData, setTrialsData] = useState({ total: 0, studies: [] });
  const [trialsLoading, setTrialsLoading] = useState(false);
  const [trialsError, setTrialsError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTrialNct, setExpandedTrialNct] = useState(null);

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

  // All React hooks must be called unconditionally before early return
  const biophysical = useMemo(() => {
    if (!variant) return null;
    return analyzeResidueMutation(variant.wildType, variant.mutatedType);
  }, [variant]);

  // Derive default search query (e.g. "KIT T670I" or "EGFR L858R")
  const defaultSearchTerm = useMemo(() => {
    if (!variant) return '';
    const gene = proteinInfo?.gene_name && proteinInfo.gene_name !== 'N/A' ? proteinInfo.gene_name : '';
    const mut = `${variant.wildType || ''}${variant.begin}${variant.mutatedType || ''}`;
    return gene ? `${gene} ${mut}` : mut;
  }, [variant, proteinInfo?.gene_name]);

  // Sync searchQuery when defaultSearchTerm changes
  useEffect(() => {
    setSearchQuery(defaultSearchTerm);
    setTrialsData({ total: 0, studies: [] });
    setTrialsError(null);
  }, [defaultSearchTerm]);

  // Fetch clinical trials when drawer opens, variant changes, or tab switches to trials
  useEffect(() => {
    if (!isOpen || !variant || !defaultSearchTerm) return;

    let isCancelled = false;
    const loadTrials = async () => {
      setTrialsLoading(true);
      setTrialsError(null);
      try {
        const queryToUse = defaultSearchTerm;
        const res = await fetchClinicalTrials(queryToUse, 12);
        if (!isCancelled) {
          setTrialsData(res);
        }
      } catch {
        if (!isCancelled) {
          setTrialsError('Failed to query ClinicalTrials.gov API. Please verify network connectivity.');
        }
      } finally {
        if (!isCancelled) {
          setTrialsLoading(false);
        }
      }
    };

    if (activeTab === 'trials') {
      loadTrials();
    }
    return () => {
      isCancelled = true;
    };
  }, [isOpen, variant, defaultSearchTerm, activeTab]);

  const handleRunSearch = async (termToRun) => {
    const term = termToRun || searchQuery;
    if (!term.trim()) return;
    setTrialsLoading(true);
    setTrialsError(null);
    try {
      const res = await fetchClinicalTrials(term.trim(), 12);
      setTrialsData(res);
    } catch (err) {
      setTrialsError('Error querying ClinicalTrials.gov');
    } finally {
      setTrialsLoading(false);
    }
  };

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
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Download Variant JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
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
              className="text-xs text-blue-400 hover:text-blue-300 bg-blue-950/60 border border-blue-800/60 hover:border-blue-700 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
              title={`Filter dataset to variants at position ${variant.begin}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter Pos #{variant.begin}</span>
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/80 px-5 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Overview & Biophysics</span>
          </button>

          <button
            onClick={() => setActiveTab('trials')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'trials'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Clinical Trials</span>
            {trialsLoading ? (
              <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
            ) : trialsData.studies?.length > 0 ? (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {trialsData.studies.length}
              </span>
            ) : null}
          </button>
        </div>

        {/* Scrollable Inspector Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5 text-slate-300 text-xs">
          {activeTab === 'overview' ? (
            <>
              {/* 1. Full Un-truncated Phenotype & Disease Description */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    Clinical Phenotype & Disease Annotation
                  </span>
                  <button
                    onClick={() => handleCopy(variant.description || descriptionLines.join('; '), 'desc')}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    title="Copy description"
                  >
                    {copiedField === 'desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>

                {descriptionLines.length > 0 ? (
                  <div className="space-y-2">
                    {descriptionLines.map((line, idx) => {
                      const isDisease =
                        line.toLowerCase().includes('disease') ||
                        line.toLowerCase().includes('cancer') ||
                        line.toLowerCase().includes('syndrome');
                      const isFunctional =
                        line.toLowerCase().includes('mutation') ||
                        line.toLowerCase().includes('hydrolysis') ||
                        line.toLowerCase().includes('activity') ||
                        line.toLowerCase().includes('cleavage');

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

              {/* 2. Instant Biophysical Triage & Structural Risk */}
              {biophysical && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Atom className="w-3.5 h-3.5 text-cyan-400" />
                      Biophysical Triage & Structural Risk
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                      Instant Empirical Scoring
                    </span>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3.5">
                    {/* Pocket Clash / Risk Alert */}
                    <div
                      className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                        biophysical.pocketRisk === 'HIGH'
                          ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                          : biophysical.pocketRisk === 'MEDIUM'
                          ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                          : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs flex items-center gap-2">
                          <span>Pocket Interference Risk: {biophysical.pocketRisk}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-90">{biophysical.pocketSummary}</p>
                      </div>
                    </div>

                    {/* 3 Metrics: Volume, Charge, Hydropathy */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {/* Volume Delta */}
                      <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-400 block mb-1">Volume Delta (ΔV)</span>
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                            biophysical.deltaVolume >= 20
                              ? 'text-rose-400 bg-rose-950/40'
                              : biophysical.deltaVolume <= -20
                              ? 'text-cyan-400 bg-cyan-950/40'
                              : 'text-emerald-400 bg-emerald-950/40'
                          }`}
                        >
                          {biophysical.deltaVolume > 0 ? `+${biophysical.deltaVolume}` : biophysical.deltaVolume} Å³
                        </span>
                        <span className="text-[9px] text-slate-500 block mt-1 truncate" title={biophysical.steric.label}>
                          {biophysical.steric.label}
                        </span>
                      </div>

                      {/* Charge Shift */}
                      <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-400 block mb-1">Charge Delta (Δq)</span>
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                            biophysical.deltaCharge !== 0 ? 'text-amber-400 bg-amber-950/40' : 'text-slate-300 bg-slate-800/60'
                          }`}
                        >
                          {biophysical.deltaCharge > 0 ? `+${biophysical.deltaCharge}` : biophysical.deltaCharge === 0 ? '0' : biophysical.deltaCharge}
                        </span>
                        <span className="text-[9px] text-slate-500 block mt-1 truncate" title={biophysical.charge.label}>
                          {biophysical.charge.label}
                        </span>
                      </div>

                      {/* Hydropathy Delta */}
                      <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-400 block mb-1">Hydropathy (ΔH)</span>
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                            Math.abs(biophysical.deltaHydropathy) >= 2 ? 'text-purple-400 bg-purple-950/40' : 'text-slate-300 bg-slate-800/60'
                          }`}
                        >
                          {biophysical.deltaHydropathy > 0 ? `+${biophysical.deltaHydropathy}` : biophysical.deltaHydropathy}
                        </span>
                        <span className="text-[9px] text-slate-500 block mt-1 truncate">
                          {biophysical.wt.type} → {biophysical.mut.type}
                        </span>
                      </div>
                    </div>

                    {/* Structural Alerts if any */}
                    {biophysical.structuralAlerts.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Structural Alerts:
                        </span>
                        <div className="space-y-1">
                          {biophysical.structuralAlerts.map((alert, aIdx) => (
                            <div key={aIdx} className="text-[11px] text-amber-300 flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{alert}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 3. Registry Identifiers & Cross-References */}
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
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded cursor-pointer"
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
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded cursor-pointer"
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
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded cursor-pointer"
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
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded cursor-pointer"
                          title="Copy Feature ID"
                        >
                          {copiedField === 'ftId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. Genomic & Computational Predictor Pipeline */}
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
                          className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
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

              {/* 5. Sequence & Residue Context */}
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
            </>
          ) : (
            <div className="space-y-4">
              {/* Search Bar & Quick Filter Chips */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRunSearch();
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search gene, variant, or disease (e.g. KIT T670I)"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={trialsLoading || !searchQuery.trim()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {trialsLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Search</span>
                  </button>
                </form>

                {/* Quick Query Shortcut Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500">Quick Filters:</span>
                  {proteinInfo?.gene_name && (
                    <button
                      type="button"
                      onClick={() => {
                        const term = `${proteinInfo.gene_name} ${mutationNotation}`;
                        setSearchQuery(term);
                        handleRunSearch(term);
                      }}
                      className="text-[10px] bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-900/60 px-2 py-0.5 rounded-md font-mono transition-colors cursor-pointer"
                    >
                      {proteinInfo.gene_name} {mutationNotation}
                    </button>
                  )}
                  {proteinInfo?.gene_name && (
                    <button
                      type="button"
                      onClick={() => {
                        const term = proteinInfo.gene_name;
                        setSearchQuery(term);
                        handleRunSearch(term);
                      }}
                      className="text-[10px] bg-slate-900 hover:bg-slate-800 text-blue-400 border border-blue-900/60 px-2 py-0.5 rounded-md font-mono transition-colors cursor-pointer"
                    >
                      All {proteinInfo.gene_name} Trials
                    </button>
                  )}
                  {proteinInfo?.gene_name && (
                    <button
                      type="button"
                      onClick={() => {
                        const term = `${proteinInfo.gene_name} ${variant.begin}`;
                        setSearchQuery(term);
                        handleRunSearch(term);
                      }}
                      className="text-[10px] bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-indigo-900/60 px-2 py-0.5 rounded-md font-mono transition-colors cursor-pointer"
                    >
                      Codon #{variant.begin}
                    </button>
                  )}
                </div>
              </div>

              {/* Status Header */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    ClinicalTrials.gov API v2: <strong className="text-white">{trialsData.studies?.length || 0}</strong> active studies
                  </span>
                </span>
                <a
                  href={`https://clinicaltrials.gov/search?term=${encodeURIComponent(searchQuery || defaultSearchTerm)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1 text-[11px]"
                >
                  <span>Open on ClinicalTrials.gov</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* Loading State */}
              {trialsLoading && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto" />
                  <p className="text-xs text-slate-300 font-medium">Fetching real-time trials from ClinicalTrials.gov...</p>
                </div>
              )}

              {/* Error State */}
              {trialsError && !trialsLoading && (
                <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{trialsError}</span>
                </div>
              )}

              {/* Empty State */}
              {!trialsLoading && !trialsError && trialsData.studies?.length === 0 && (
                <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-xl text-center space-y-3">
                  <p className="text-slate-400">
                    No active/recruiting trials specifically found for <code className="text-emerald-400 font-mono">"{searchQuery}"</code>.
                  </p>
                  {proteinInfo?.gene_name && (
                    <button
                      type="button"
                      onClick={() => {
                        const term = proteinInfo.gene_name;
                        setSearchQuery(term);
                        handleRunSearch(term);
                      }}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Search All Ongoing {proteinInfo.gene_name} Studies
                    </button>
                  )}
                </div>
              )}

              {/* Studies List */}
              {!trialsLoading && trialsData.studies?.length > 0 && (
                <div className="space-y-3">
                  {trialsData.studies.map((study) => {
                    const isExpanded = expandedTrialNct === study.nctId;
                    const isRecruiting = study.status === 'RECRUITING';

                    return (
                      <div
                        key={study.nctId}
                        className="bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 space-y-3 transition-all"
                      >
                        {/* Header: NCT ID, Status, Phase */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <a
                              href={study.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60"
                            >
                              <span>{study.nctId}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopy(study.nctId, study.nctId)}
                              className="p-1 hover:bg-slate-800 text-slate-500 hover:text-slate-300 rounded cursor-pointer"
                              title="Copy NCT ID"
                            >
                              {copiedField === study.nctId ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                isRecruiting
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              }`}
                            >
                              {isRecruiting ? '● RECRUITING' : study.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] font-mono bg-indigo-950/60 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800/60">
                              {study.phaseText}
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-semibold text-white leading-snug">
                          {study.title}
                        </h4>

                        {/* Sponsor & Interventions */}
                        <div className="space-y-1.5 text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{study.leadSponsor}</span>
                          </div>

                          {study.interventions?.length > 0 && (
                            <div className="flex items-center gap-1.5 text-emerald-300">
                              <Pill className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">{study.interventions.join(', ')}</span>
                            </div>
                          )}

                          {study.conditions?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                              {study.conditions.slice(0, 3).map((cond, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800"
                                >
                                  {cond}
                                </span>
                              ))}
                              {study.conditions.length > 3 && (
                                <span className="text-[10px] text-slate-500">
                                  +{study.conditions.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Expandable Summary Accordion */}
                        {study.briefSummary && (
                          <div className="pt-2 border-t border-slate-800/60">
                            <button
                              type="button"
                              onClick={() => setExpandedTrialNct(isExpanded ? null : study.nctId)}
                              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3 h-3" />
                                  <span>Hide Study Synopsis</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3" />
                                  <span>View Study Synopsis</span>
                                </>
                              )}
                            </button>
                            {isExpanded && (
                              <p className="mt-2 text-[11px] text-slate-300 leading-relaxed bg-slate-900/90 p-3 rounded-lg border border-slate-800 animate-in fade-in">
                                {study.briefSummary}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Navigation & Close Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              disabled={!hasPrev}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Previous variant in dataset"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Next variant in dataset"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </aside>
    </>
  );
}
