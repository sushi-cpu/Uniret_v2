import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Download,
  Copy,
  Check,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  SlidersHorizontal,
  RotateCcw,
  ExternalLink,
  Maximize2,
  Minimize2,
  BookOpen,
} from 'lucide-react';

export default function VariationsTable({
  variations = [],
  selectedVariant,
  onSelectVariant,
  onInspectVariant,
  accession,
  isExpanded = false,
  onToggleExpand,
}) {
  const selectedRowRef = useRef(null);

  // Filters
  const [selectedClins, setSelectedClins] = useState([]); // Empty array = ALL significances
  const [selectedTypes, setSelectedTypes] = useState([]); // Empty array = ALL types
  const [posMin, setPosMin] = useState('');
  const [posMax, setPosMax] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Sorting
  const [sortField, setSortField] = useState('begin');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [copiedId, setCopiedId] = useState(null);

  // Pagination (Standard Paged Mode)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Debounce search input for 60fps typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClins, selectedTypes, posMin, posMax, pageSize]);

  // Extract all distinct Clinical Significances and their counts
  const clinCategories = useMemo(() => {
    const counts = {};
    variations.forEach((v) => {
      const c = v.clinical_significance || v.type_clin || '(blank)';
      counts[c] = (counts[c] || 0) + 1;
    });

    // Standard clinical significance order
    const priority = [
      'Pathogenic',
      'Likely pathogenic',
      'Drug response',
      'Variant of uncertain significance',
      'Likely benign',
      'Benign',
      '(blank)',
    ];

    const sortedKeys = Object.keys(counts).sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.localeCompare(a);
    });

    return sortedKeys.map((k) => ({
      key: k,
      label: k === '(blank)' ? 'Not Reported' : k,
      count: counts[k],
    }));
  }, [variations]);

  // Extract all distinct Variation Types and their counts
  const typeCategories = useMemo(() => {
    const counts = {};
    variations.forEach((v) => {
      let t = v.type || 'Other';
      if (t === 'VARIANT') t = 'Natural variant';
      counts[t] = (counts[t] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
    }));
  }, [variations]);

  // Toggle single Clinical Significance filter pill (multi-select)
  const toggleClin = (key) => {
    setSelectedClins((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  // Toggle single Variation Type filter pill (multi-select)
  const toggleType = (name) => {
    setSelectedTypes((prev) => {
      if (prev.includes(name)) {
        return prev.filter((t) => t !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  // Reset all filters
  const resetAllFilters = () => {
    setSelectedClins([]);
    setSelectedTypes([]);
    setPosMin('');
    setPosMax('');
    setSearchQuery('');
    setDebouncedQuery('');
    setCurrentPage(1);
  };

  // Total active filter criteria count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedClins.length > 0) count += selectedClins.length;
    if (selectedTypes.length > 0) count += selectedTypes.length;
    if (posMin !== '' || posMax !== '') count += 1;
    if (debouncedQuery.trim()) count += 1;
    return count;
  }, [selectedClins, selectedTypes, posMin, posMax, debouncedQuery]);

  // Filtering & Sorting
  const filteredRows = useMemo(() => {
    let result = [...variations];

    // 1. Clinical Significance (matches any selected)
    if (selectedClins.length > 0) {
      result = result.filter((r) => {
        const val = r.clinical_significance || r.type_clin || '(blank)';
        return selectedClins.includes(val);
      });
    }

    // 2. Variation Type (matches any selected)
    if (selectedTypes.length > 0) {
      result = result.filter((r) => {
        let t = r.type || 'Other';
        if (t === 'VARIANT') t = 'Natural variant';
        return selectedTypes.includes(t);
      });
    }

    // 3. Position Range (Residue Min / Max)
    const minP = parseInt(posMin, 10);
    const maxP = parseInt(posMax, 10);
    if (!isNaN(minP)) {
      result = result.filter((r) => {
        const b = parseInt(r.begin, 10);
        return !isNaN(b) && b >= minP;
      });
    }
    if (!isNaN(maxP)) {
      result = result.filter((r) => {
        const b = parseInt(r.begin, 10);
        return !isNaN(b) && b <= maxP;
      });
    }

    // 4. Debounced Free-Text Search
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter((r) => {
        const mutationCode = `${r.wildType || ''}${r.begin || ''}${r.mutatedType || ''}`;
        const rowStr = `${mutationCode} ${r.begin || ''} ${r.wildType || ''} ${r.mutatedType || ''} ${r.rs_id || ''} ${(r.rs_ids || []).join(' ')} ${r.type || ''} ${r.clinical_significance || ''} ${r.description || ''} ${r.predictsnp || ''} ${r.xref_id || ''} ${r.xref_name || ''} ${r.id || ''}`.toLowerCase();
        return rowStr.includes(q);
      });
    }

    // 5. Sorting
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'begin') {
        valA = parseInt(valA, 10) || 0;
        valB = parseInt(valB, 10) || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    variations,
    selectedClins,
    selectedTypes,
    posMin,
    posMax,
    debouncedQuery,
    sortField,
    sortOrder,
  ]);

  // Paginated Rows Slice
  const totalPages = Math.max(Math.ceil(filteredRows.length / pageSize), 1);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Auto-jump to page containing selected variant and smoothly center it
  useEffect(() => {
    if (!selectedVariant) return;

    // Find row by ID, or by begin + mutatedType, or by begin residue
    const index = filteredRows.findIndex(
      (r) =>
        (r.id && selectedVariant.id && r.id === selectedVariant.id) ||
        (String(r.begin) === String(selectedVariant.begin) &&
         String(r.mutatedType || '') === String(selectedVariant.mutatedType || '')) ||
        (String(r.begin) === String(selectedVariant.begin))
    );

    if (index !== -1) {
      const targetPage = Math.floor(index / pageSize) + 1;
      setCurrentPage((prev) => (prev !== targetPage ? targetPage : prev));
      setTimeout(() => {
        if (selectedRowRef.current) {
          selectedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 80);
    }
  }, [selectedVariant, filteredRows, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleCopyPredictSNP = (val, id) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export functions (Exports ALL records matching filter criteria)
  const downloadCSV = () => {
    if (!filteredRows.length) return;
    const headers = Object.keys(filteredRows[0]);
    const csvContent = [
      headers.join(','),
      ...filteredRows.map((r) =>
        headers.map((h) => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${accession}_variations_${filteredRows.length}.csv`;
    a.click();
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(filteredRows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${accession}_variations_${filteredRows.length}.json`;
    a.click();
  };

  // Helper for Clinical Significance Badge Colors
  const getClinBadge = (val) => {
    if (!val || val === '(blank)') {
      return <span className="text-slate-500 font-mono text-[11px]">-</span>;
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
      <span className={`text-[10px] px-2 py-0.5 rounded border inline-block ${bg}`}>
        {val}
      </span>
    );
  };

  // Check if selected variant is hidden by current active filters
  const isSelectedHidden =
    selectedVariant &&
    !filteredRows.some((r) => String(r.begin) === String(selectedVariant.begin));

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col h-full min-h-0 overflow-hidden shadow-xl">
      {/* Table Toolbar */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 space-y-3">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-blue-400" />
              Variations Dataset
            </span>
            <span className="text-xs bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded-full border border-blue-500/30">
              {filteredRows.length.toLocaleString()} matching
            </span>
            {activeFilterCount > 0 && (
              <span className="text-[11px] text-slate-400">
                (of {variations.length.toLocaleString()} total)
              </span>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
            <button
              onClick={downloadCSV}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
              title="Download Filtered CSV"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" /> Export CSV ({filteredRows.length})
            </button>
            <button
              onClick={downloadJSON}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
              title="Download Filtered JSON"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" /> Export JSON
            </button>
            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className="hidden sm:flex items-center gap-1 bg-blue-950/70 hover:bg-blue-900/80 text-blue-300 text-xs px-2.5 py-1.5 rounded-lg border border-blue-800/80 transition-colors font-medium shadow-sm"
                title={isExpanded ? "Collapse to Split View" : "Expand Table to Full Width"}
              >
                {isExpanded ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Split View</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Expand Table</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 1. CLINICAL SIGNIFICANCE PILLS (Single-row horizontal scroll) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs shrink-0">
          <span className="text-xs font-semibold text-slate-400 shrink-0 mr-0.5">
            ClinVar:
          </span>

          {/* 'All' button */}
          <button
            onClick={() => setSelectedClins([])}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
              selectedClins.length === 0
                ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            <span>All</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                selectedClins.length === 0 ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {variations.length}
            </span>
          </button>

          {/* Individual categories (toggleable) */}
          {clinCategories.map((c) => {
            const isSelected = selectedClins.includes(c.key);
            const k = c.key.toLowerCase();
            let activeColor = 'bg-blue-600 text-white border-blue-500';

            if (k === 'pathogenic') activeColor = 'bg-rose-600 text-white border-rose-500 ring-1 ring-rose-400';
            else if (k.includes('likely pathogenic')) activeColor = 'bg-orange-600 text-white border-orange-500 ring-1 ring-orange-400';
            else if (k.includes('uncertain')) activeColor = 'bg-amber-600 text-white border-amber-500 ring-1 ring-amber-400';
            else if (k.includes('likely benign')) activeColor = 'bg-emerald-600 text-white border-emerald-500 ring-1 ring-emerald-400';
            else if (k === 'benign') activeColor = 'bg-blue-600 text-white border-blue-500 ring-1 ring-blue-400';
            else if (k.includes('drug response')) activeColor = 'bg-purple-600 text-white border-purple-500 ring-1 ring-purple-400';

            return (
              <button
                key={c.key}
                onClick={() => toggleClin(c.key)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? `${activeColor} shadow-md`
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
                title={`Filter by ${c.label}`}
              >
                <span>{c.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {c.count}
                </span>
                {isSelected && <Check className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })}
        </div>

        {/* 2. SECONDARY CONTROLS ROW: SEARCH, TYPE, RESIDUE RANGE, PAGE SIZE */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          {/* Search Bar */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table (pos, change, rsID, xref)..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Toggles (only rendered if multiple distinct types exist) */}
          {typeCategories.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Type:</span>
              <button
                onClick={() => setSelectedTypes([])}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  selectedTypes.length === 0
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                All
              </button>
              {typeCategories.map((t) => {
                const isSelected = selectedTypes.includes(t.name);
                return (
                  <button
                    key={t.name}
                    onClick={() => toggleType(t.name)}
                    className={`text-xs px-2 py-0.5 rounded border flex items-center gap-1 transition-colors ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                    title={`Toggle ${t.name}`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5" />}
                    <span>{t.name}</span>
                    <span className="text-[10px] font-mono opacity-80">({t.count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Residue Position Range */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Residue Pos:</span>
            <input
              type="number"
              value={posMin}
              onChange={(e) => setPosMin(e.target.value)}
              placeholder="From"
              className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
            />
            <span>–</span>
            <input
              type="number"
              value={posMax}
              onChange={(e) => setPosMax(e.target.value)}
              placeholder="To"
              className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
            />
            {(posMin !== '' || posMax !== '') && (
              <button
                onClick={() => {
                  setPosMin('');
                  setPosMax('');
                }}
                className="text-slate-400 hover:text-white p-0.5"
                title="Clear position range"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-0.5 focus:outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
        </div>
      </div>

      {/* Selected Variant Focus Banner (Compact single-line) */}
      {selectedVariant && (
        <div className="mx-3 mt-1.5 mb-1 bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-1 flex items-center justify-between text-xs text-slate-200 gap-2 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
            <span className="text-slate-400 text-[11px] shrink-0">Selected:</span>
            <strong className="font-mono text-white bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700 text-xs shrink-0">
              {selectedVariant.wildType}{selectedVariant.begin}{selectedVariant.mutatedType}
            </strong>
            <span className="text-slate-400 text-[11px] shrink-0">(#{selectedVariant.begin})</span>
            {selectedVariant.rs_id && (
              <a
                href={`https://www.ncbi.nlm.nih.gov/snp/${selectedVariant.rs_id}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-mono text-blue-400 hover:text-blue-300 bg-blue-950/70 border border-blue-800/60 px-1.5 py-0.2 rounded text-[11px] inline-flex items-center gap-1 hover:underline shrink-0"
                title="View on NCBI dbSNP"
              >
                <span>{selectedVariant.rs_id}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </a>
            )}
            {selectedVariant.clinical_significance && (
              <span className="shrink-0">{getClinBadge(selectedVariant.clinical_significance)}</span>
            )}
            {selectedVariant.description && (
              <span className="text-slate-300 text-[11px] truncate max-w-xs hidden sm:inline" title={selectedVariant.description}>
                • {selectedVariant.description}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onInspectVariant && (
              <button
                onClick={() => onInspectVariant(selectedVariant)}
                className="text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-medium px-2 py-0.5 rounded transition-colors flex items-center gap-1 shadow-sm"
                title="Open detailed variant inspection panel"
              >
                <BookOpen className="w-3 h-3" />
                <span>Variant Panel</span>
              </button>
            )}
            {isSelectedHidden ? (
              <button
                onClick={resetAllFilters}
                className="text-[11px] bg-amber-600 hover:bg-amber-500 text-white font-medium px-2 py-0.5 rounded transition-colors"
              >
                Clear filters
              </button>
            ) : (
              <button
                onClick={() => {
                  setPosMin(String(selectedVariant.begin));
                  setPosMax(String(selectedVariant.begin));
                }}
                className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline"
                title="Filter table exclusively to variants at this residue"
              >
                Filter residue #{selectedVariant.begin}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead className="bg-slate-950 text-slate-400 font-semibold sticky top-0 z-10 border-b border-slate-800">
            <tr>
              <th className="py-2 px-3 whitespace-nowrap cursor-pointer hover:text-white" onClick={() => handleSort('begin')}>
                <div className="flex items-center gap-1">Pos <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-2 px-3 whitespace-nowrap">Mutation</th>
              <th className="py-2 px-3 whitespace-nowrap cursor-pointer hover:text-white" onClick={() => handleSort('rs_id')}>
                <div className="flex items-center gap-1">rsID (dbSNP) <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-2 px-3 whitespace-nowrap cursor-pointer hover:text-white" onClick={() => handleSort('type')}>
                <div className="flex items-center gap-1">Type <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-2 px-3 whitespace-nowrap cursor-pointer hover:text-white" onClick={() => handleSort('description')}>
                <div className="flex items-center gap-1">Description <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-2 px-3 whitespace-nowrap cursor-pointer hover:text-white" onClick={() => handleSort('clinical_significance')}>
                <div className="flex items-center gap-1">Clinical Significance (ClinVar) <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-2 px-3 whitespace-nowrap">Predictor Score</th>
              <th className="py-2 px-3 whitespace-nowrap">PredictSNP Coordinate</th>
              <th className="py-2 px-3 whitespace-nowrap text-right">3D Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-16 text-center text-slate-400 text-xs">
                  <div className="max-w-sm mx-auto space-y-2">
                    <p className="text-slate-300 font-medium">No variations match your filter criteria.</p>
                    <button
                      onClick={resetAllFilters}
                      className="mt-2 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRows.map((v, i) => {
                const isSelected = selectedVariant && (
                  (v.id && selectedVariant.id && v.id === selectedVariant.id) ||
                  (v.predictsnp && selectedVariant.predictsnp && v.predictsnp === selectedVariant.predictsnp) ||
                  (v.genomicLocation && selectedVariant.genomicLocation && v.genomicLocation === selectedVariant.genomicLocation) ||
                  (String(v.begin) === String(selectedVariant.begin) &&
                   String(v.mutatedType || '') === String(selectedVariant.mutatedType || '') &&
                   String(v.clinical_significance || '') === String(selectedVariant.clinical_significance || '')) ||
                  (String(v.begin) === String(selectedVariant.begin) &&
                   String(v.mutatedType || '') === String(selectedVariant.mutatedType || ''))
                );
                const mutationText = `${v.wildType || ''}${v.begin}${v.mutatedType || ''}`;
                const hasPredictSNP = Boolean(v.predictsnp);
                const clinVal = v.clinical_significance || v.type_clin || '';

                return (
                  <tr
                    key={v.id || i}
                    ref={isSelected ? selectedRowRef : null}
                    onClick={() => onSelectVariant(v)}
                    className={`cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-blue-950/70 border-l-4 border-l-blue-400 ring-1 ring-blue-500/40 text-white font-medium shadow-lg'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Position */}
                    <td className="py-1.5 px-3 font-mono font-bold text-slate-200">
                      {v.begin}
                    </td>

                    {/* Mutation */}
                    <td className="py-1.5 px-3 font-mono">
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300 font-semibold border border-slate-700">
                        {mutationText}
                      </span>
                    </td>

                    {/* rsID (dbSNP) */}
                    <td className="py-1.5 px-3 font-mono">
                      {v.rs_id ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`https://www.ncbi.nlm.nih.gov/snp/${v.rs_id}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-400 hover:text-blue-300 hover:underline font-mono text-[11px] inline-flex items-center gap-0.5 group/rs"
                            title={`Open ${v.rs_id} in NCBI dbSNP`}
                          >
                            <span>{v.rs_id}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover/rs:opacity-100" />
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyPredictSNP(v.rs_id, `rs_${v.id || i}`);
                            }}
                            className="p-0.5 hover:bg-slate-700/80 rounded text-slate-500 hover:text-slate-200 transition-colors"
                            title="Copy rsID"
                          >
                            {copiedId === `rs_${v.id || i}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">-</span>
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-1.5 px-3">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          v.type === 'Natural variant' || v.type === 'VARIANT'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : v.type === 'Mutagenesis'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {v.type === 'VARIANT' ? 'Natural variant' : v.type || '(blank)'}
                      </span>
                    </td>

                    {/* Description (Clickable to open full detail drawer) */}
                    <td
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectVariant(v);
                        if (onInspectVariant) onInspectVariant(v);
                      }}
                      className={`py-1.5 px-3 text-[11px] text-slate-300 cursor-pointer group/desc ${
                        isExpanded ? 'max-w-md' : 'max-w-[200px] xl:max-w-[280px]'
                      }`}
                      title="Click to view full un-truncated description and clinical annotations"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate text-slate-200 group-hover/desc:text-blue-300 transition-colors">
                          {v.description || (v.descriptions || []).join('; ') || <span className="text-slate-500 font-mono">-</span>}
                        </span>
                        <BookOpen className="w-3 h-3 text-blue-400 opacity-0 group-hover/desc:opacity-100 shrink-0 transition-opacity" />
                      </div>
                    </td>

                    {/* Clinical Significance (ClinVar) */}
                    <td className="py-1.5 px-3 whitespace-nowrap">
                      {getClinBadge(clinVal)}
                    </td>

                    {/* Score */}
                    <td className="py-1.5 px-3 font-mono text-[11px]">
                      {v.score ? (
                        <span className="text-slate-200">
                          {v.score} {v.predAlgorithmNameType ? `(${v.predAlgorithmNameType})` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* PredictSNP Coordinate */}
                    <td className="py-1.5 px-3 font-mono text-[11px]">
                      {hasPredictSNP ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/60 font-mono">
                            {v.predictsnp}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyPredictSNP(v.predictsnp, v.id || i);
                            }}
                            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                            title="Copy PredictSNP coordinate"
                          >
                            {copiedId === (v.id || i) ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* Action Buttons: Details + 3D */}
                    <td className="py-1.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectVariant(v);
                            if (onInspectVariant) onInspectVariant(v);
                          }}
                          className="text-xs px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors flex items-center gap-1 border border-slate-700/80"
                          title="Open detailed variant inspection panel"
                        >
                          <BookOpen className="w-3 h-3 text-blue-400 group-hover:text-white" />
                          <span>Details</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectVariant(v);
                          }}
                          className={`text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 font-medium transition-colors border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-500 shadow'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/80'
                          }`}
                          title="Pivot 3D structure and focus pocket"
                        >
                          <Eye className="w-3 h-3" />
                          <span>3D</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing <strong className="text-slate-200">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-200">
              {Math.min(currentPage * pageSize, filteredRows.length).toLocaleString()}
            </strong>{' '}
            of <strong className="text-slate-200">{filteredRows.length.toLocaleString()}</strong> variations
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 font-mono text-slate-200 bg-slate-900 py-1 rounded border border-slate-800">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
