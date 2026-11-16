import React, { useState } from 'react';
import {
  Dna,
  Search,
  Layers,
  FolderArchive,
  Sparkles,
  Atom,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';

const PRESETS = [
  { id: 'P00533', gene: 'EGFR', label: 'EGFR • Epidermal Growth Factor' },
  { id: 'P10721', gene: 'KIT', label: 'KIT • Mast / Stem Cell Receptor' },
  { id: 'P04637', gene: 'TP53', label: 'TP53 • Cellular Tumor Antigen p53' },
  { id: 'P42336', gene: 'PIK3CA', label: 'PIK3CA • PI3-Kinase Catalytic Alpha' },
  { id: 'P38398', gene: 'BRCA1', label: 'BRCA1 • Breast Cancer 1' },
  { id: 'P01116', gene: 'KRAS', label: 'KRAS • GTPase KRas Oncogene' },
];

export default function Navbar({
  currentId,
  onSearch,
  loading,
  activeTab,
  onTabChange,
}) {
  const [inputVal, setInputVal] = useState('');
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSearch(inputVal.trim().toUpperCase());
      setInputVal('');
      if (activeTab !== 'workbench') {
        onTabChange('workbench');
      }
    }
  };

  const handleSelectPreset = (id) => {
    onSearch(id);
    setPresetDropdownOpen(false);
    if (activeTab !== 'workbench') {
      onTabChange('workbench');
    }
  };

  return (
    <header className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 px-4 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Brand & Navigation Links */}
        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
          {/* Brand */}
          <div
            onClick={() => onTabChange('landing')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2 rounded-xl text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Dna className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-blue-300 transition-colors">
                  UniRet
                </span>
                <span className="text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-400 border border-blue-800/60">
                  3D Predict
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Mode Switcher */}
          <nav className="flex items-center bg-slate-900 border border-slate-800/80 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => onTabChange('landing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'landing'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => onTabChange('workbench')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'workbench'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Atom className="w-3.5 h-3.5" />
              <span>3D Workbench</span>
            </button>
            <button
              onClick={() => onTabChange('batch')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'batch'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Batch Hub</span>
            </button>
          </nav>
        </div>

        {/* Right: Mode-Specific Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {activeTab === 'workbench' ? (
            <>
              {/* Presets Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="text-slate-400 text-[11px]">Active:</span>
                  <span className="font-mono font-bold text-white text-[11px]">{currentId}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {presetDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs divide-y divide-slate-800/60">
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Select Benchmark Model
                    </div>
                    {PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPreset(p.id)}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors ${
                          currentId === p.id ? 'bg-blue-950/60 text-blue-300 font-semibold' : 'text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold">{p.gene}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{p.id}</div>
                        </div>
                        {currentId === p.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Search Bar */}
              <form onSubmit={handleSubmit} className="relative min-w-[200px] max-w-xs flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Accession or Gene..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-12 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-inner font-mono"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-1 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Go
                </button>
              </form>
            </>
          ) : activeTab === 'landing' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onSearch(currentId || 'P00533');
                  onTabChange('workbench');
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Launch 3D Explorer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onTabChange('workbench')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Atom className="w-3.5 h-3.5 text-blue-400" />
                <span>Single 3D View</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
