import React, { useState } from 'react';
import {
  Dna,
  Atom,
  Layers,
  Search,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  ExternalLink,
  Database,
  Cpu,
  Zap,
  BarChart3,
  Activity,
  FolderArchive,
  ChevronRight,
  ShieldCheck,
  Eye,
  GitBranch,
} from 'lucide-react';

const PRESET_PROTEINS = [
  {
    accession: 'P00533',
    gene: 'EGFR',
    name: 'Epidermal Growth Factor Receptor',
    desc: 'Target of tyrosine kinase inhibitors in Non-Small Cell Lung Cancer (NSCLC). Heavy pathogenic clustering in kinase domain (exons 18-21).',
    variants: '5,656',
    pathogenic: '125',
    length: '1,210 aa',
    color: 'from-blue-500/20 to-indigo-500/10',
    borderColor: 'border-blue-500/40',
    tagColor: 'text-blue-400 bg-blue-950/60 border-blue-800/60',
  },
  {
    accession: 'P10721',
    gene: 'KIT',
    name: 'Mast / Stem Cell Growth Factor Receptor',
    desc: 'UniRet core benchmark protein (uniprotids.xlsx). Key driver in Gastrointestinal Stromal Tumors (GIST) and systemic mastocytosis.',
    variants: '3,483',
    pathogenic: '94',
    length: '976 aa',
    color: 'from-emerald-500/20 to-teal-500/10',
    borderColor: 'border-emerald-500/40',
    tagColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
  },
  {
    accession: 'P04637',
    gene: 'TP53',
    name: 'Cellular Tumor Antigen p53',
    desc: 'The guardian of the genome. Over 80% of missense alterations cluster inside the sequence-specific DNA-binding domain.',
    variants: '4,102',
    pathogenic: '312',
    length: '393 aa',
    color: 'from-rose-500/20 to-pink-500/10',
    borderColor: 'border-rose-500/40',
    tagColor: 'text-rose-400 bg-rose-950/60 border-rose-800/60',
  },
  {
    accession: 'P42336',
    gene: 'PIK3CA',
    name: 'Phosphatidylinositol 4,5-bisphosphate 3-kinase',
    desc: 'Associated with Cowden syndrome and somatic overgrowth. Hotspot mutations induce constitutive lipid kinase activation.',
    variants: '4,198',
    pathogenic: '139',
    length: '1,068 aa',
    color: 'from-amber-500/20 to-orange-500/10',
    borderColor: 'border-amber-500/40',
    tagColor: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
  },
  {
    accession: 'P38398',
    gene: 'BRCA1',
    name: 'Breast Cancer Type 1 Susceptibility Protein',
    desc: 'Critical DNA double-strand break repair mediator. Zinc-binding RING and BRCT tandem domains harbor deleterious clinical variants.',
    variants: '6,210',
    pathogenic: '420',
    length: '1,863 aa',
    color: 'from-purple-500/20 to-violet-500/10',
    borderColor: 'border-purple-500/40',
    tagColor: 'text-purple-400 bg-purple-950/60 border-purple-800/60',
  },
  {
    accession: 'P01116',
    gene: 'KRAS',
    name: 'GTPase KRas (Oncogene KRAS)',
    desc: 'Pivotal molecular switch in MAPK signaling. Recurrent oncogenic codons at Gly12, Gly13, and Gln61 alter intrinsic GTP hydrolysis.',
    variants: '840',
    pathogenic: '78',
    length: '189 aa',
    color: 'from-cyan-500/20 to-blue-500/10',
    borderColor: 'border-cyan-500/40',
    tagColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60',
  },
];

export default function LandingPage({ onSelectProtein, onNavigate }) {
  const [searchVal, setSearchVal] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      onSelectProtein(searchVal.trim().toUpperCase());
      onNavigate('workbench');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-slate-900 bg-gradient-to-b from-slate-950 via-slate-900/40 to-slate-950">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-blue-600/15 via-indigo-500/15 to-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Release Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-950/70 border border-blue-800/60 rounded-full px-3.5 py-1 text-xs font-semibold text-blue-300 mb-6 shadow-lg shadow-blue-950/40 backdrop-blur">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>UniRet 3.0 • Structural Variant Intelligence Platform</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
            From Protein Variations to{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
              3D Structural Insights
            </span>{' '}
            in Seconds.
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Unifying UniProtKB functional annotations, ClinVar clinical classifications, dbSNP rsID registries, and AlphaFold 3D structures with automated PredictSNP pipelining.
          </p>

          {/* Interactive Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-8 max-w-xl mx-auto flex items-center bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2 shadow-2xl backdrop-blur focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all"
          >
            <div className="pl-3 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Enter Gene Symbol or UniProt ID (e.g. EGFR, P00533, TP53)..."
              className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <span>Explore 3D</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Secondary Hub CTAs */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className="text-slate-400">Or jump directly to:</span>
            <button
              onClick={() => {
                onSelectProtein('P00533');
                onNavigate('workbench');
              }}
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
            >
              <Atom className="w-3.5 h-3.5 text-blue-400" />
              <span>3D Workbench (EGFR)</span>
            </button>
            <button
              onClick={() => onNavigate('batch')}
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
            >
              <FolderArchive className="w-3.5 h-3.5 text-indigo-400" />
              <span>Batch Pipeline Hub</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. LIVE METRICS RIBBON */}
      <section className="bg-slate-950 border-b border-slate-900 py-6">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-blue-400">15 ms</div>
            <div className="text-xs text-slate-400 mt-0.5">In-Memory Flat Parsing</div>
          </div>
          <div className="p-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">98.3%</div>
            <div className="text-xs text-slate-400 mt-0.5">dbSNP rsID Resolution</div>
          </div>
          <div className="p-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-400">100%</div>
            <div className="text-xs text-slate-400 mt-0.5">AlphaFold DB 3D Models</div>
          </div>
          <div className="p-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400">1-Click</div>
            <div className="text-xs text-slate-400 mt-0.5">PredictSNP / VEP Format</div>
          </div>
        </div>
      </section>

      {/* 3. CURATED PROTEIN SHOWCASE */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
              Curated Research Presets
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Launch Pre-Configured Oncogenic & Disease Models
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-sm">
            Select an accession to instantly inspect variation density, AlphaFold 3D coordinates, and ClinVar pathogenicity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRESET_PROTEINS.map((p) => (
            <div
              key={p.accession}
              onClick={() => {
                onSelectProtein(p.accession);
                onNavigate('workbench');
              }}
              className={`bg-slate-900/80 border ${p.borderColor} rounded-2xl p-5 hover:scale-[1.01] hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between group`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-base bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {p.gene}
                    </span>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${p.tagColor}`}>
                      {p.accession}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{p.length}</span>
                </div>

                <h3 className="text-sm font-semibold text-slate-200 group-hover:text-blue-300 transition-colors">
                  {p.name}
                </h3>
                <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                  {p.desc}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Variants</span>
                    <strong className="text-slate-200 font-mono text-xs">{p.variants}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Pathogenic</span>
                    <strong className="text-rose-400 font-mono text-xs">{p.pathogenic}</strong>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-xs text-blue-400 group-hover:text-blue-300 font-medium">
                  Launch 3D <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PRODUCT CORE CAPABILITIES */}
      <section className="py-16 bg-slate-900/40 border-t border-b border-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Architecture & Features
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Engineered for Modern Bioinformatics Workflows
            </h2>
            <p className="text-xs text-slate-400 mt-2">
              UniRet eliminates fragmented data hunting by unifying sequence, structure, and clinical datasets into one synchronized interface.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Capability 1 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">1D Sequence Density Skyline</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                75-bin sequence mutation histogram with tiered ClinVar pathogenic hotspots and precision residue guidelines flush to the sequence ruler.
              </p>
            </div>

            {/* Capability 2 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Atom className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">AlphaFold 3D WebGL Viewer</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dynamic resolution of AlphaFold DB v4/v6 models in 3Dmol.js with pLDDT confidence coloring and 1-click mutation pocket focusing.
              </p>
            </div>

            {/* Capability 3 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">dbSNP rsID & ClinVar Registry</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automated extraction of dbSNP rsIDs with direct NCBI links, copy buttons, and clinical significance filtering (Pathogenic, VUS, Benign).
              </p>
            </div>

            {/* Capability 4 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">PredictSNP Coordinate Engine</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Converts complex HGVS genomic strings into PredictSNP / VEP format (<code className="text-emerald-400">chr,pos,ref,alt</code>) with batch preview and export.
              </p>
            </div>

            {/* Capability 5 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <FolderArchive className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Cohort Batch Pipeline</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Process hundreds of accession IDs (such as <code className="text-blue-300">uniprotids.xlsx</code>) concurrently with multi-threading, live progress, and zip packaging.
              </p>
            </div>

            {/* Capability 6 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">UniProt Phenotype Descriptions</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Directly unpacks disease associations, syndromes (e.g. Cowden syndrome, epidermal nevus), and somatic cancer annotations from UniProtKB.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WORKFLOW COMPARISON SECTION */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-white">Why Researchers Use UniRet</h2>
          <p className="text-xs text-slate-400 mt-1">Comparing standard manual workflows with the UniRet 3D portal.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Traditional Manual Workflow</h3>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold mt-0.5">✕</span>
                <span>Manually querying UniProt REST API, then parsing raw JSON responses by hand.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold mt-0.5">✕</span>
                <span>Writing custom regex scripts to convert HGVS coordinates to PredictSNP format.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold mt-0.5">✕</span>
                <span>Downloading separate AlphaFold PDB files and launching desktop PyMOL to locate mutations.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold mt-0.5">✕</span>
                <span>Copy-pasting rsIDs one by one into NCBI dbSNP to check clinical evidence.</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-blue-950/40 via-slate-900 to-indigo-950/30 border border-blue-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>UniRet 3D Predict Workflow</span>
            </h3>
            <ul className="space-y-3 text-xs text-slate-200">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>One-click search immediately pulls sequence, variants, and AlphaFold model in parallel.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Automatic PredictSNP coordinate synthesis with 1-click batch copy & file download.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Instant in-browser WebGL 3D viewer that auto-centers and highlights the active residue.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Embedded dbSNP links, ClinVar classifications, and UniProt disease annotations.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION FOOTER BANNER */}
      <section className="bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30 border-t border-slate-900 py-12 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Ready to explore protein variants in 3D?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl mx-auto">
            Launch the interactive workbench or run high-throughput batch pipelines on your cohort datasets.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                onSelectProtein('P00533');
                onNavigate('workbench');
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Atom className="w-4 h-4" />
              <span>Launch 3D Workbench</span>
            </button>
            <button
              onClick={() => onNavigate('batch')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <span>Batch Pipeline Hub</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
