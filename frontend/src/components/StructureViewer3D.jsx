import React, { useEffect, useRef, useState } from 'react';
import { RotateCw, Camera, Eye, Maximize2, Minimize2, ShieldAlert, Sparkles, RefreshCw, Layers } from 'lucide-react';

export default function StructureViewer3D({
  accession,
  selectedVariant,
  onResidueClick,
  isExpanded = false,
  onToggleExpand,
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showSurface, setShowSurface] = useState(false);
  const [colorScheme, setColorScheme] = useState('spectrum'); // 'spectrum', 'plddt', 'secondary'
  const [showNeighborhood, setShowNeighborhood] = useState(true);
  const [pdbLoaded, setPdbLoaded] = useState(false);
  const [structureMeta, setStructureMeta] = useState({
    source: 'AlphaFold DB',
    id: `AF-${accession}-F1`,
    resolution: null,
    chains: null,
  });

  // Handle auto-resize when container dimensions change
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (viewerRef.current) {
        viewerRef.current.resize();
        viewerRef.current.render();
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Also trigger resize when layout expansion state toggles
  useEffect(() => {
    const timer = setTimeout(() => {
      if (viewerRef.current) {
        viewerRef.current.resize();
        viewerRef.current.render();
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  // Initialize and load structure
  useEffect(() => {
    if (!accession) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setPdbLoaded(false);

    const initViewer = async () => {
      // Check if 3Dmol is loaded in window
      if (!window.$3Dmol) {
        setError('3Dmol library is loading... Please refresh in a moment.');
        setLoading(false);
        return;
      }

      try {
        // Clear previous viewer if any
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        const viewer = window.$3Dmol.createViewer(containerRef.current, {
          backgroundColor: '#090d16',
          id: `mol_${accession}`,
        });
        viewerRef.current = viewer;

        // 1. First try our local backend proxy which resolves AlphaFold and auto-falls back to RCSB PDB crystal structures
        let pdbData = null;
        let meta = {
          source: 'AlphaFold DB',
          id: `AF-${accession}-F1`,
          resolution: null,
          chains: null,
        };

        try {
          const proxyResp = await fetch(`/api/structure/${accession}`);
          if (proxyResp.ok) {
            const text = await proxyResp.text();
            if (text && text.includes('ATOM')) {
              pdbData = text;
              meta = {
                source: proxyResp.headers.get('x-structure-source') || 'AlphaFold DB',
                id: proxyResp.headers.get('x-structure-id') || `AF-${accession}-F1`,
                resolution: proxyResp.headers.get('x-structure-resolution') || null,
                chains: proxyResp.headers.get('x-structure-chains') || null,
              };
            }
          }
        } catch (e) {
          console.warn('Backend proxy /api/structure not reachable, trying direct AlphaFold API...');
        }

        // 2. Fallback: Query AlphaFold prediction API directly
        if (!pdbData || !pdbData.includes('ATOM')) {
          try {
            const afMetaResp = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${accession}`);
            if (afMetaResp.ok) {
              const afMeta = await afMetaResp.json();
              if (afMeta && afMeta.length > 0 && afMeta[0].pdbUrl) {
                const directResp = await fetch(afMeta[0].pdbUrl);
                if (directResp.ok) {
                  pdbData = await directResp.text();
                  meta = {
                    source: 'AlphaFold DB',
                    id: `AF-${accession}-F1`,
                    resolution: null,
                    chains: null,
                  };
                }
              }
            }
          } catch (afErr) {
            console.warn('Direct AlphaFold API query failed:', afErr);
          }
        }

        // 3. Fallback: Try v6 then v4 standard URLs
        if (!pdbData || !pdbData.includes('ATOM')) {
          for (const ver of ['v6', 'v4']) {
            try {
              const directResp = await fetch(`https://alphafold.ebi.ac.uk/files/AF-${accession}-F1-model_${ver}.pdb`);
              if (directResp.ok) {
                const text = await directResp.text();
                if (text.includes('ATOM')) {
                  pdbData = text;
                  meta = {
                    source: 'AlphaFold DB',
                    id: `AF-${accession}-F1-${ver}`,
                    resolution: null,
                    chains: null,
                  };
                  break;
                }
              }
            } catch (err) {
              // ignore and continue
            }
          }
        }

        if (!pdbData || !pdbData.includes('ATOM')) {
          throw new Error(`No 3D structural model found in AlphaFold DB or RCSB PDB for ${accession}.`);
        }

        if (!isMounted) return;

        setStructureMeta(meta);
        viewer.addModel(pdbData, 'pdb');
        applyBaseStyle(viewer, colorScheme);
        viewer.zoomTo();
        viewer.render();

        setPdbLoaded(true);
        setLoading(false);
      } catch (err) {
        console.error('3D Viewer error:', err);
        if (isMounted) {
          setError(err.message || 'Could not load 3D structure.');
          setLoading(false);
        }
      }
    };

    initViewer();

    return () => {
      isMounted = false;
      if (viewerRef.current && viewerRef.current.spin) {
        viewerRef.current.spin(false);
      }
    };
  }, [accession]);

  // Apply base style based on colorScheme
  const applyBaseStyle = (viewer, scheme) => {
    if (!viewer) return;

    viewer.removeAllSurfaces();
    viewer.removeAllLabels();

    if (scheme === 'spectrum') {
      viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
    } else if (scheme === 'plddt') {
      // AlphaFold stores pLDDT in B-factor column:
      // >90: Dark Blue, 70-90: Cyan/Light Blue, 50-70: Yellow, <50: Orange
      viewer.setStyle(
        {},
        {
          cartoon: {
            colorscheme: {
              prop: 'b',
              gradient: 'roygb',
              min: 50,
              max: 95,
            },
          },
        }
      );
    } else if (scheme === 'secondary') {
      viewer.setStyle({}, { cartoon: { colorscheme: 'ssJmol' } });
    } else {
      viewer.setStyle({}, { cartoon: { color: '#38bdf8' } });
    }

    if (showSurface) {
      viewer.addSurface(window.$3Dmol.SurfaceType.MS, {
        opacity: 0.25,
        color: '#94a3b8',
      });
    }

    viewer.render();
  };

  // Re-apply style when colorScheme or showSurface changes
  useEffect(() => {
    if (!viewerRef.current || !pdbLoaded) return;
    applyBaseStyle(viewerRef.current, colorScheme);

    // Re-apply selected variant if one is active
    if (selectedVariant) {
      highlightVariant(selectedVariant);
    }
  }, [colorScheme, showSurface, pdbLoaded]);

  // Highlight selected variant
  useEffect(() => {
    if (!viewerRef.current || !pdbLoaded) return;
    if (selectedVariant) {
      highlightVariant(selectedVariant);
    } else {
      applyBaseStyle(viewerRef.current, colorScheme);
      viewerRef.current.zoomTo({}, 600);
    }
  }, [selectedVariant, showNeighborhood, pdbLoaded]);

  const highlightVariant = (variant) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const resiNum = parseInt(variant.begin || variant.position, 10);
    if (isNaN(resiNum)) return;

    // Reset base style
    applyBaseStyle(viewer, colorScheme);

    // 1. Highlight surrounding 5Å shell if enabled
    if (showNeighborhood) {
      viewer.setStyle(
        { within: { distance: 5.0, sel: { resi: [resiNum] } } },
        { stick: { color: '#64748b', radius: 0.15 } }
      );
    }

    // 2. Highlight mutated residue with vibrant sticks
    viewer.setStyle(
      { resi: [resiNum] },
      {
        stick: { colorscheme: 'magentaCarbon', radius: 0.35 },
        sphere: { color: '#f43f5e', radius: 0.5 },
      }
    );

    // 3. Add 3D floating label
    const labelText = `${variant.wildType || ''}${resiNum}${variant.mutatedType || ''}`;
    viewer.addLabel(labelText, {
      font: 'sans-serif',
      fontSize: 14,
      fontColor: '#ffffff',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#f43f5e',
      borderThickness: 1.5,
      inFront: true,
      position: { resi: resiNum },
    });

    // 4. Smooth camera zoom to residue
    viewer.zoomTo({ resi: [resiNum] }, 800);
    viewer.render();
  };

  // Toggle Spin
  const toggleSpin = () => {
    if (!viewerRef.current) return;
    const nextSpin = !isSpinning;
    setIsSpinning(nextSpin);
    viewerRef.current.spin(nextSpin ? 'y' : false);
  };

  // Reset Camera View
  const handleResetCamera = () => {
    if (!viewerRef.current) return;
    viewerRef.current.zoomTo({}, 600);
    viewerRef.current.render();
  };

  // Capture Screenshot
  const handleScreenshot = () => {
    if (!viewerRef.current) return;
    const imgData = viewerRef.current.pngURI();
    const link = document.createElement('a');
    link.download = `${accession}_AlphaFold_3D.png`;
    link.href = imgData;
    link.click();
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col h-full min-h-0 overflow-hidden shadow-xl">
      {/* Viewer Header */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${structureMeta.source === 'RCSB PDB' ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse`} />
          <span className="text-sm font-semibold text-white">
            {structureMeta.source === 'RCSB PDB' ? '3D Crystal Structure (PDB)' : 'AlphaFold 3D Structural View'}
          </span>
          <span
            className="text-xs font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded"
            title={
              structureMeta.source === 'RCSB PDB'
                ? `Experimental crystal structure from RCSB PDB: ${structureMeta.id} (${structureMeta.resolution || ''}), Chains: ${structureMeta.chains || ''}`
                : `AlphaFold predicted model`
            }
          >
            {structureMeta.id} {structureMeta.resolution ? `(${structureMeta.resolution})` : ''}
          </span>
          {structureMeta.chains && (
            <span className="text-[10px] text-slate-400 hidden xl:inline font-mono">
              Chains: {structureMeta.chains}
            </span>
          )}
        </div>

        {/* Color Scheme Selector & Expand Controls */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 hidden sm:inline">Color:</span>
          <select
            value={colorScheme}
            onChange={(e) => setColorScheme(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="spectrum">Rainbow Spectrum (N→C)</option>
            <option value="plddt">AlphaFold Confidence (pLDDT)</option>
            <option value="secondary">Secondary Structure (α/β)</option>
          </select>

          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
              title={isExpanded ? 'Collapse 3D view' : 'Expand 3D view full width'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      <div className="relative flex-1 min-h-[380px] w-full bg-[#090d16]">
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm text-slate-300">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Fetching 3D Coordinates from AlphaFold DB...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 text-slate-300">
            <ShieldAlert className="w-10 h-10 text-amber-500 mb-2" />
            <p className="text-sm font-semibold text-white">{error}</p>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              AlphaFold predicted model might be unavailable or undergoing update for accession {accession}.
            </p>
            <a
              href={`https://alphafold.ebi.ac.uk/entry/${accession}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-1.5 rounded-lg border border-slate-700"
            >
              Check directly on AlphaFold DB →
            </a>
          </div>
        )}

        {/* Selected Variant Toast Overlay */}
        {selectedVariant && (
          <div className="absolute top-3 left-3 z-10 bg-slate-900/90 border border-rose-500/40 rounded-xl px-3 py-2 text-xs shadow-lg backdrop-blur flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <div>
              <span className="text-slate-400">Inspecting Mutation: </span>
              <span className="font-mono font-bold text-rose-300">
                {selectedVariant.wildType}{selectedVariant.begin || selectedVariant.position}{selectedVariant.mutatedType}
              </span>
              <span className="text-slate-400 ml-2 font-mono">Residue #{selectedVariant.begin || selectedVariant.position}</span>
            </div>
            <button
              onClick={() => onResidueClick && onResidueClick(null)}
              className="text-slate-400 hover:text-white font-bold ml-1 text-sm"
              title="Clear Selection"
            >
              ×
            </button>
          </div>
        )}

        {/* Floating Controls Overlay */}
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 backdrop-blur shadow-md">
          <button
            onClick={toggleSpin}
            className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-all ${
              isSpinning ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="Toggle Spin"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowSurface(!showSurface)}
            className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-all ${
              showSurface ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="Toggle Molecular Surface Mesh"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowNeighborhood(!showNeighborhood)}
            className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-all ${
              showNeighborhood ? 'bg-purple-600 text-white' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="Toggle 5Å Contact Residues"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleResetCamera}
            className="p-2 hover:bg-slate-800 text-slate-300 rounded-lg text-xs"
            title="Reset Camera"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleScreenshot}
            className="p-2 hover:bg-slate-800 text-slate-300 rounded-lg text-xs"
            title="Export PNG Snapshot"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3D WebGL Canvas Container */}
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* Legend & Confidence Footer */}
      <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span>pLDDT Confidence:</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0053D6]" /> &gt;90 (Very High)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#65CBF3]" /> 70-90 (Confident)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FFDB13]" /> 50-70 (Low)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FF7D45]" /> &lt;50 (Very Low)</span>
        </div>
        <div className="text-slate-400 italic">Click any mutation row to pivot camera & highlight 3D pocket</div>
      </div>
    </div>
  );
}
