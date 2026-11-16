import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import ProteinHeader from './components/ProteinHeader';
import StructureViewer3D from './components/StructureViewer3D';
import SequenceTrack from './components/SequenceTrack';
import VariationsTable from './components/VariationsTable';
import PredictSNPDrawer from './components/PredictSNPDrawer';
import BatchHub from './components/BatchHub';
import { AlertCircle, RefreshCw, Columns, Table2, Layers, Maximize2 } from 'lucide-react';

// Fallback client-side genomic parser if backend is offline
function parseGenomicLocationFallback(loc) {
  if (!loc || typeof loc !== 'string') return null;
  const subMatch = loc.match(/NC_(\d+)\.\d+:g\.(\d+)([ACGT])>([ACGT])/);
  if (subMatch) {
    return `${parseInt(subMatch[1], 10)},${subMatch[2]},${subMatch[3]},${subMatch[4]}`;
  }
  const delMatch = loc.match(/NC_(\d+)\.\d+:g\.(\d+)_([\d]+)del/);
  if (delMatch) {
    return `${parseInt(delMatch[1], 10)},${delMatch[2]}-${delMatch[3]},del`;
  }
  return null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('landing'); // 'landing', 'workbench', 'batch'
  const [workbenchLayout, setWorkbenchLayout] = useState('split'); // 'split', 'table', 'structure'
  const [accession, setAccession] = useState('P00533'); // Default: Human EGFR
  const [proteinData, setProteinData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isPredictSNPOpen, setIsPredictSNPOpen] = useState(false);

  // Fetch protein info & variations
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setSelectedVariant(null);

    const fetchData = async () => {
      try {
        // Try FastAPI backend first
        let data = null;
        try {
          const resp = await fetch(`/api/protein/${accession}`);
          if (resp.ok) {
            data = await resp.json();
          }
        } catch (apiErr) {
          console.warn('Backend /api/protein call failed, trying direct EBI/UniProt fallback:', apiErr);
        }

        // Fallback: If backend is not running, query public EBI & UniProt APIs directly
        if (!data) {
          const [infoResp, varResp] = await Promise.all([
            fetch(`https://rest.uniprot.org/uniprotkb/${accession}.json`),
            fetch(`https://www.ebi.ac.uk/proteins/api/variation/${accession}?format=json`),
          ]);

          if (!infoResp.ok) throw new Error(`UniProt accession ${accession} not found`);

          const rawInfo = await infoResp.json();
          let rawVars = [];
          if (varResp.ok) {
            const varJson = await varResp.json();
            rawVars = varJson.features || [];
          }

          // Process variations
          const processedVariations = rawVars.map((v, i) => {
            const locStr = v.genomicLocation?.[0] || v.genomicLocation || '';
            const descList = [];
            if (Array.isArray(v.descriptions)) {
              v.descriptions.forEach((d) => {
                if (d.value) {
                  descList.push(d.sources?.length ? `${d.value} (${d.sources.join(', ')})` : d.value);
                }
              });
            }
            if (!descList.length && Array.isArray(v.association)) {
              v.association.forEach((a) => {
                if (a.name) descList.push(a.name);
              });
            }
            if (!descList.length && v.description) {
              descList.push(v.description);
            }

            // Extract dbSNP rsIDs, ClinVar RCVs, and COSMIC IDs
            const xrefs = v.xrefs || [];
            const rsids = [];
            const clinvars = [];
            const cosmics = [];
            xrefs.forEach((x) => {
              const xName = x.name || '';
              const xId = String(x.id || '').trim();
              if (!xId) return;
              if (xName === 'dbSNP' || xId.startsWith('rs')) {
                if (!rsids.includes(xId)) rsids.push(xId);
              } else if (xName === 'ClinVar' || xId.startsWith('RCV') || xId.startsWith('VCV')) {
                if (!clinvars.includes(xId)) clinvars.push(xId);
              } else if (xName.toUpperCase().includes('COSMIC') || xId.startsWith('COSM') || xId.startsWith('COSV')) {
                if (!cosmics.includes(xId)) cosmics.push(xId);
              }
            });
            const rs_id = rsids[0] || '';

            return {
              id: v.ftId || `var_${i}`,
              begin: v.begin,
              end: v.end,
              wildType: v.wildType,
              mutatedType: v.mutatedType,
              type: v.type,
              rs_id: rs_id,
              rs_ids: rsids,
              clinvar_ids: clinvars,
              cosmic_ids: cosmics,
              genomicLocation: locStr,
              predictsnp: parseGenomicLocationFallback(locStr),
              clinical_significance: v.clinicalSignificances?.[0]?.type || '',
              type_clin: v.clinicalSignificances?.[0]?.type || '',
              description: descList.join('; '),
              descriptions: descList,
              reviewStatus: v.clinicalSignificances?.[0]?.reviewStatus || '',
              score: v.predictions?.[0]?.score || '',
              predAlgorithmNameType: v.predictions?.[0]?.predAlgorithmNameType || '',
            };
          });

          // Compute type counts
          const counts = {};
          processedVariations.forEach((v) => {
            if (v.type) counts[v.type] = (counts[v.type] || 0) + 1;
          });

          data = {
            accession,
            info: {
              accession,
              protein_name: rawInfo.proteinDescription?.recommendedName?.fullName?.value || 'Unknown',
              gene_name: rawInfo.genes?.[0]?.geneName?.value || 'N/A',
              organism: rawInfo.organism?.scientificName || 'N/A',
              length: rawInfo.sequence?.length || 0,
              sequence: rawInfo.sequence?.value || '',
              function: rawInfo.comments?.find((c) => c.commentType === 'FUNCTION')?.text?.[0]?.value || '',
            },
            variations: processedVariations,
            total_variations: processedVariations.length,
            type_counts: counts,
            alphafold: {
              has_structure: true,
              pdb_url: `/api/structure/${accession}`,
              cif_url: `https://alphafold.ebi.ac.uk/files/AF-${accession}-F1-model_v6.cif`,
              entry_url: `https://alphafold.ebi.ac.uk/entry/${accession}`,
            },
          };
        }

        if (isMounted) {
          setProteinData(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Data retrieval failed:', err);
        if (isMounted) {
          setError(err.message || 'Failed to fetch protein variation data.');
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [accession]);

  const handleSearch = (newId) => {
    if (newId) {
      if (newId !== accession) {
        setAccession(newId);
      }
      setActiveTab('workbench');
    }
  };

  const handleSelectProteinFromBatch = (newId) => {
    if (newId) {
      setAccession(newId);
    }
    setActiveTab('workbench');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        currentId={accession}
        onSearch={handleSearch}
        loading={loading}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      {/* VIEW 1: PRODUCT LANDING PAGE */}
      {activeTab === 'landing' && (
        <LandingPage
          onSelectProtein={handleSearch}
          onNavigate={(tab) => setActiveTab(tab)}
        />
      )}

      {/* VIEW 2: BATCH PIPELINE HUB */}
      {activeTab === 'batch' && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-5">
          <BatchHub onSelectProteinFor3D={handleSelectProteinFromBatch} />
        </main>
      )}

      {/* VIEW 3: 3D WORKBENCH */}
      {activeTab === 'workbench' && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-5">
          {/* Loading Spinner */}
          {loading && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center backdrop-blur">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-base font-semibold text-white">Retrieving UniProt & Variation Annotations for {accession}...</p>
              <p className="text-xs text-slate-400 mt-1">Aggregating EBI Proteins API, UniProtKB, and AlphaFold coordinates.</p>
            </div>
          )}

          {/* Error Alert */}
          {error && !loading && (
            <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-6 text-center text-slate-300">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">Error Retrieving Data</h3>
              <p className="text-xs text-slate-300 mt-1">{error}</p>
              <button
                onClick={() => setAccession('P00533')}
                className="mt-4 bg-slate-800 hover:bg-slate-700 text-xs px-4 py-2 rounded-xl text-blue-400 font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset to EGFR (P00533)
              </button>
            </div>
          )}

          {/* Loaded Content */}
          {!loading && !error && proteinData && (
            <>
              {/* Protein Meta Header */}
              <ProteinHeader
                data={proteinData}
                onOpenPredictSNP={() => setIsPredictSNPOpen(true)}
              />

              {/* 1D Sequence Lollipop Track */}
              <SequenceTrack
                sequenceLength={proteinData.info?.length}
                variations={proteinData.variations}
                selectedVariant={selectedVariant}
                onSelectVariant={(v) => setSelectedVariant(v)}
              />

              {/* Workbench Layout Switcher Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Layout:</span>
                  <div className="inline-flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 shadow-sm">
                    <button
                      onClick={() => setWorkbenchLayout('split')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                        workbenchLayout === 'split'
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Columns className="w-3.5 h-3.5" />
                      <span>Split (3D + Table)</span>
                    </button>
                    <button
                      onClick={() => setWorkbenchLayout('table')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                        workbenchLayout === 'table'
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Table2 className="w-3.5 h-3.5" />
                      <span>Full Variations Table</span>
                    </button>
                    <button
                      onClick={() => setWorkbenchLayout('structure')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                        workbenchLayout === 'structure'
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>3D Focus</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-mono hidden md:block">
                  {workbenchLayout === 'table' && 'Full-width dataset view: all 25 rows fit with relaxed column widths'}
                  {workbenchLayout === 'split' && 'Dual view: 3D structure synchronized with variation dataset'}
                  {workbenchLayout === 'structure' && 'Full canvas 3D view for structural inspection'}
                </div>
              </div>

              {/* LAYOUT OPTION 1: SPLIT VIEW (3D + TABLE) */}
              {workbenchLayout === 'split' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 lg:h-[760px]">
                  {/* Left Column: 3D Structure Viewer (5 cols on lg) */}
                  <div className="lg:col-span-5 h-[500px] lg:h-full min-h-0">
                    <StructureViewer3D
                      accession={accession}
                      selectedVariant={selectedVariant}
                      onResidueClick={(v) => setSelectedVariant(v)}
                      isExpanded={false}
                      onToggleExpand={() => setWorkbenchLayout('structure')}
                    />
                  </div>

                  {/* Right Column: Variations Table (7 cols on lg) */}
                  <div className="lg:col-span-7 h-[640px] lg:h-full min-h-0">
                    <VariationsTable
                      variations={proteinData.variations}
                      selectedVariant={selectedVariant}
                      onSelectVariant={(v) => setSelectedVariant(v)}
                      accession={accession}
                      isExpanded={false}
                      onToggleExpand={() => setWorkbenchLayout('table')}
                    />
                  </div>
                </div>
              )}

              {/* LAYOUT OPTION 2: FULL-WIDTH TABLE VIEW (25 ROWS COMFORTABLY) */}
              {workbenchLayout === 'table' && (
                <div className="w-full h-[820px] min-h-0">
                  <VariationsTable
                    variations={proteinData.variations}
                    selectedVariant={selectedVariant}
                    onSelectVariant={(v) => setSelectedVariant(v)}
                    accession={accession}
                    isExpanded={true}
                    onToggleExpand={() => setWorkbenchLayout('split')}
                  />
                </div>
              )}

              {/* LAYOUT OPTION 3: FULL-WIDTH 3D STRUCTURE FOCUS */}
              {workbenchLayout === 'structure' && (
                <div className="w-full h-[760px] min-h-0">
                  <StructureViewer3D
                    accession={accession}
                    selectedVariant={selectedVariant}
                    onResidueClick={(v) => setSelectedVariant(v)}
                    isExpanded={true}
                    onToggleExpand={() => setWorkbenchLayout('split')}
                  />
                </div>
              )}
            </>
          )}
        </main>
      )}

      {/* PredictSNP Modal Drawer */}
      {proteinData && (
        <PredictSNPDrawer
          isOpen={isPredictSNPOpen}
          onClose={() => setIsPredictSNPOpen(false)}
          variations={proteinData.variations}
          accession={accession}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            UniRet 3D Predict Platform • Core Batch Pipeline + Concept B 3D Workbench
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <a href="https://www.uniprot.org/" target="_blank" rel="noreferrer" className="hover:text-slate-200">UniProt</a>
            <a href="https://www.ebi.ac.uk/proteins/api/doc/" target="_blank" rel="noreferrer" className="hover:text-slate-200">EBI Proteins</a>
            <a href="https://alphafold.ebi.ac.uk/" target="_blank" rel="noreferrer" className="hover:text-slate-200">AlphaFold DB</a>
            <a href="https://loschmidt.chemi.muni.cz/predictsnp1/" target="_blank" rel="noreferrer" className="hover:text-slate-200">PredictSNP</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
