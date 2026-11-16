import React, { useState, useMemo } from 'react';

export default function SequenceTrack({
  sequenceLength,
  variations = [],
  selectedVariant,
  onSelectVariant,
}) {
  const [hoveredBin, setHoveredBin] = useState(null);
  const length = parseInt(sequenceLength, 10) || 100;
  const numBins = 75;

  // Build density histogram across all amino acids
  const { bins, maxCount, maxPathCount } = useMemo(() => {
    const b = Array.from({ length: numBins }, (_, i) => ({
      index: i,
      start: Math.round((i * length) / numBins) + 1,
      end: Math.round(((i + 1) * length) / numBins),
      count: 0,
      pathogenicCount: 0,
      variants: [],
      pathogenicVariants: [],
    }));

    variations.forEach((v) => {
      const pos = parseInt(v.begin, 10);
      if (isNaN(pos) || pos < 1 || pos > length) return;

      const binIdx = Math.min(Math.floor(((pos - 1) / length) * numBins), numBins - 1);
      b[binIdx].count += 1;
      b[binIdx].variants.push(v);

      const clin = `${v.clinical_significance || v.type_clin || ''} ${v.reviewStatus || ''}`.toLowerCase();
      const isPath = clin.includes('pathogenic');
      if (isPath) {
        b[binIdx].pathogenicCount += 1;
        b[binIdx].pathogenicVariants.push(v);
      }
    });

    let max = 1;
    let maxP = 1;
    b.forEach((bin) => {
      if (bin.count > max) max = bin.count;
      if (bin.pathogenicCount > maxP) maxP = bin.pathogenicCount;
    });

    return { bins: b, maxCount: max, maxPathCount: maxP };
  }, [length, variations]);

  // Dynamically calibrate major hotspot threshold for high-density mega-proteins (e.g. APC)
  const majorThreshold = useMemo(() => {
    if (maxPathCount <= 5) return 2;
    if (maxPathCount <= 12) return 3;
    return Math.max(4, Math.round(maxPathCount * 0.4));
  }, [maxPathCount]);

  // Select target variant from bin (prioritizes pathogenic if present)
  const handleBinClick = (bin) => {
    if (!bin.variants.length) return;
    const target = bin.pathogenicVariants.length > 0 ? bin.pathogenicVariants[0] : bin.variants[0];
    onSelectVariant(target);
  };

  const selectedPct = selectedVariant
    ? Math.max(0.5, Math.min(99.5, ((parseInt(selectedVariant.begin, 10) - 1) / Math.max(length - 1, 1)) * 100))
    : null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur mb-5">
      {/* Top Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">1D Sequence Mutation Density Landscape</span>
          <span className="text-[11px] text-slate-400">({length} amino acids • {variations.length.toLocaleString()} mutations)</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-blue-600 to-cyan-400" />
            Mutation Density
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-1 ring-white" />
            Pathogenic Hotspot (≥{majorThreshold})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Low Pathogenic (1–{Math.max(1, majorThreshold - 1)})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 ring-1 ring-white" />
            Selected Mutation
          </span>
        </div>
      </div>

      {/* Main Skyline Graph Container */}
      <div className="relative pt-7 pb-1 px-1">
        {/* Bars Container */}
        <div className="relative h-20 flex items-end w-full gap-[1px]">
          {bins.map((bin) => {
            const heightPercent = Math.max((bin.count / maxCount) * 100, 6);
            const isMajorHotspot = bin.pathogenicCount >= majorThreshold;
            const isMinorPathogenic = bin.pathogenicCount > 0 && bin.pathogenicCount < majorThreshold;
            const isHovered = hoveredBin?.index === bin.index;

            return (
              <div
                key={bin.index}
                onMouseEnter={() => setHoveredBin(bin)}
                onMouseLeave={() => setHoveredBin(null)}
                onClick={() => handleBinClick(bin)}
                className="flex-1 h-full flex items-end cursor-pointer group relative"
                title={`Residues ${bin.start}–${bin.end}: ${bin.count} variants${bin.pathogenicCount > 0 ? ` (${bin.pathogenicCount} ClinVar pathogenic)` : ''}`}
              >
                {/* Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t transition-all relative ${
                    isMajorHotspot
                      ? 'bg-gradient-to-t from-rose-700 via-rose-500 to-amber-400 shadow-sm shadow-rose-500/25'
                      : isMinorPathogenic
                      ? 'bg-gradient-to-t from-blue-700 via-indigo-600 to-amber-500/80'
                      : 'bg-gradient-to-t from-blue-700 to-cyan-400 group-hover:from-blue-500 group-hover:to-cyan-300'
                  } ${isHovered ? 'brightness-125 ring-1 ring-white' : ''}`}
                >
                  {/* Major Hotspot Crown (≥3 pathogenic mutations) */}
                  {isMajorHotspot && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-1 ring-white shadow-md shadow-rose-500/80 pointer-events-none animate-pulse" />
                  )}

                  {/* Minor Pathogenic Dot (1-2 mutations) - Small and subtle */}
                  {isMinorPathogenic && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400/90 pointer-events-none" />
                  )}
                </div>
              </div>
            );
          })}

          {/* Active Selected Variant Marker Pin & Guideline (Flush at the ruler line) */}
          {selectedVariant && selectedPct !== null && (
            <div
              style={{ left: `${selectedPct}%` }}
              className="absolute -top-4 bottom-0 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20"
            >
              <div className="bg-rose-600 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg ring-2 ring-white whitespace-nowrap animate-bounce">
                {selectedVariant.wildType}{selectedVariant.begin}{selectedVariant.mutatedType}
              </div>
              <div className="w-0.5 flex-1 bg-gradient-to-b from-rose-500 via-rose-300 to-white shadow" />
            </div>
          )}
        </div>

        {/* Base Backbone Ruler Line (Aligned flush with bars) */}
        <div className="relative mt-1 h-1.5 bg-slate-800 rounded-full border border-slate-700 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-indigo-500/30 to-blue-500/20" />
        </div>

        {/* Ruler Ticks & Position Labels (Precision aligned percentages) */}
        <div className="relative h-4 text-[10px] text-slate-400 font-mono mt-1.5 w-full">
          <span className="absolute left-0 top-0">1</span>
          <span className="absolute left-1/4 top-0 -translate-x-1/2">{Math.round(length * 0.25)}</span>
          <span className="absolute left-1/2 top-0 -translate-x-1/2">{Math.round(length * 0.5)} (Midpoint)</span>
          <span className="absolute left-3/4 top-0 -translate-x-1/2">{Math.round(length * 0.75)}</span>
          <span className="absolute right-0 top-0 text-right">{length} aa</span>
        </div>
      </div>

      {/* Hover / Selected Info Tooltip Banner */}
      <div className="mt-1 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
        {hoveredBin ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400">Residues {hoveredBin.start}–{hoveredBin.end}:</span>
            <span className="font-bold text-cyan-300">{hoveredBin.count} variations</span>
            {hoveredBin.pathogenicCount > 0 && (
              <span className="text-rose-400 font-semibold">• {hoveredBin.pathogenicCount} ClinVar pathogenic</span>
            )}
            <button
              onClick={() => handleBinClick(hoveredBin)}
              className="text-[11px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded transition-colors ml-1"
            >
              Focus in table & 3D
            </button>
          </div>
        ) : selectedVariant ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400">Selected Mutation:</span>
            <span className="font-mono font-bold text-rose-300 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-800/50">
              {selectedVariant.wildType}{selectedVariant.begin}{selectedVariant.mutatedType}
            </span>
            {selectedVariant.clinical_significance && (
              <span className="text-rose-400 font-medium">
                • {selectedVariant.clinical_significance}
              </span>
            )}
            {selectedVariant.description && (
              <span className="text-slate-300 truncate max-w-sm">
                • {selectedVariant.description}
              </span>
            )}
            {selectedVariant.predictsnp && (
              <span className="text-emerald-400 font-mono text-[11px]">
                • PredictSNP: {selectedVariant.predictsnp}
              </span>
            )}
          </div>
        ) : (
          <div className="text-slate-400 text-[11px]">
            Click any bar or pathogenic crown dot to jump directly to it in the 3D model and table.
          </div>
        )}
      </div>
    </div>
  );
}
