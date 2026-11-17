/**
 * biophysics.js - Instant Variant Biophysical Triage & Structural Risk Scorer.
 *
 * Computes empirical van der Waals volume delta (ΔV), formal charge delta (Δq),
 * Kyte-Doolittle hydropathy shift (ΔH), and structural alert heuristics in <0.05ms
 * entirely client-side without cloud compute or GPU requirements.
 *
 * References:
 * - Richards, F. M. (1977). Areas, volumes, packing, and protein structure. Annu Rev Biophys Bioeng.
 * - Chothia, C. (1975). Structural invariants in protein folding. Nature.
 * - Kyte, J., & Doolittle, R. F. (1982). A simple method for displaying the hydropathic character of a protein.
 */

// 1-letter to 3-letter & full name mapping with standard empirical volumes & charges
export const AA_MAP = {
  A: { code3: 'Ala', name: 'Alanine', volume: 88.6, charge: 0, hydropathy: 1.8, type: 'Aliphatic' },
  R: { code3: 'Arg', name: 'Arginine', volume: 173.4, charge: 1, hydropathy: -4.5, type: 'Basic' },
  N: { code3: 'Asn', name: 'Asparagine', volume: 114.1, charge: 0, hydropathy: -3.5, type: 'Polar' },
  D: { code3: 'Asp', name: 'Aspartic Acid', volume: 111.1, charge: -1, hydropathy: -3.5, type: 'Acidic' },
  C: { code3: 'Cys', name: 'Cysteine', volume: 108.5, charge: 0, hydropathy: 2.5, type: 'Thiol' },
  Q: { code3: 'Gln', name: 'Glutamine', volume: 143.8, charge: 0, hydropathy: -3.5, type: 'Polar' },
  E: { code3: 'Glu', name: 'Glutamic Acid', volume: 138.4, charge: -1, hydropathy: -3.5, type: 'Acidic' },
  G: { code3: 'Gly', name: 'Glycine', volume: 60.1, charge: 0, hydropathy: -0.4, type: 'Flexible' },
  H: { code3: 'His', name: 'Histidine', volume: 153.2, charge: 0.1, hydropathy: -3.2, type: 'Aromatic' },
  I: { code3: 'Ile', name: 'Isoleucine', volume: 166.7, charge: 0, hydropathy: 4.5, type: 'Aliphatic' },
  L: { code3: 'Leu', name: 'Leucine', volume: 166.7, charge: 0, hydropathy: 3.8, type: 'Aliphatic' },
  K: { code3: 'Lys', name: 'Lysine', volume: 168.6, charge: 1, hydropathy: -3.9, type: 'Basic' },
  M: { code3: 'Met', name: 'Methionine', volume: 162.9, charge: 0, hydropathy: 1.9, type: 'Aliphatic' },
  F: { code3: 'Phe', name: 'Phenylalanine', volume: 189.9, charge: 0, hydropathy: 2.8, type: 'Aromatic' },
  P: { code3: 'Pro', name: 'Proline', volume: 112.7, charge: 0, hydropathy: -1.6, type: 'Rigid Kink' },
  S: { code3: 'Ser', name: 'Serine', volume: 89.0, charge: 0, hydropathy: -0.8, type: 'Polar' },
  T: { code3: 'Thr', name: 'Threonine', volume: 116.1, charge: 0, hydropathy: -0.7, type: 'Polar' },
  W: { code3: 'Trp', name: 'Tryptophan', volume: 227.8, charge: 0, hydropathy: -0.9, type: 'Aromatic' },
  Y: { code3: 'Tyr', name: 'Tyrosine', volume: 193.6, charge: 0, hydropathy: -1.3, type: 'Aromatic' },
  V: { code3: 'Val', name: 'Valine', volume: 140.0, charge: 0, hydropathy: 4.2, type: 'Aliphatic' },
};

// Normalize input character to 1-letter uppercase amino acid code
export function normalizeAA(val) {
  if (!val || typeof val !== 'string') return null;
  const clean = val.trim().toUpperCase();
  if (clean.length === 1 && AA_MAP[clean]) return clean;

  // Check 3-letter codes (e.g. 'Leu', 'Arg', 'Thr')
  for (const [code1, data] of Object.entries(AA_MAP)) {
    if (data.code3.toUpperCase() === clean) return code1;
  }
  return null;
}

/**
 * Instant Variant Biophysical Triage & Structural Risk Scorer.
 * Evaluates residue-level consequence without simulation overhead.
 *
 * @param {string} wtChar - Wild type residue (e.g. 'T' or 'Thr')
 * @param {string} mutChar - Mutated residue (e.g. 'I' or 'Ile')
 * @returns {object} Biophysical triage report
 */
export function analyzeResidueMutation(wtChar, mutChar) {
  const wt = normalizeAA(wtChar);
  const mut = normalizeAA(mutChar);

  if (!wt || !mut) {
    return null;
  }

  const wtData = AA_MAP[wt];
  const mutData = AA_MAP[mut];

  const deltaVolume = Math.round((mutData.volume - wtData.volume) * 10) / 10;
  const deltaCharge = Math.round((mutData.charge - wtData.charge) * 10) / 10;
  const deltaHydropathy = Math.round((mutData.hydropathy - wtData.hydropathy) * 10) / 10;

  // Determine Steric Impact
  let stericCategory = 'CONSERVATIVE';
  let stericLabel = 'Iso-steric / Minimal';
  let stericColor = 'text-slate-300 bg-slate-800/80 border-slate-700';

  if (deltaVolume >= 40) {
    stericCategory = 'SEVERE_EXPANSION';
    stericLabel = `Severe Expansion (+${deltaVolume} Å³)`;
    stericColor = 'text-rose-400 bg-rose-950/70 border-rose-500/50';
  } else if (deltaVolume >= 18) {
    stericCategory = 'MODERATE_EXPANSION';
    stericLabel = `Moderate Expansion (+${deltaVolume} Å³)`;
    stericColor = 'text-amber-400 bg-amber-950/70 border-amber-500/50';
  } else if (deltaVolume <= -35) {
    stericCategory = 'CAVITY_CREATING';
    stericLabel = `Cavity Creating (${deltaVolume} Å³)`;
    stericColor = 'text-cyan-400 bg-cyan-950/70 border-cyan-500/50';
  } else if (deltaVolume <= -18) {
    stericCategory = 'MODERATE_CONTRACTION';
    stericLabel = `Volume Contraction (${deltaVolume} Å³)`;
    stericColor = 'text-blue-400 bg-blue-950/70 border-blue-500/50';
  }

  // Determine Electrostatic Impact
  let chargeCategory = 'NEUTRAL';
  let chargeLabel = 'No Charge Shift';
  let chargeColor = 'text-slate-400 bg-slate-900 border-slate-800';

  if (wtData.charge > 0 && mutData.charge < 0) {
    chargeCategory = 'CHARGE_INVERSION';
    chargeLabel = 'Positive to Negative Inversion';
    chargeColor = 'text-rose-400 bg-rose-950/80 border-rose-600/60';
  } else if (wtData.charge < 0 && mutData.charge > 0) {
    chargeCategory = 'CHARGE_INVERSION';
    chargeLabel = 'Negative to Positive Inversion';
    chargeColor = 'text-rose-400 bg-rose-950/80 border-rose-600/60';
  } else if (wtData.charge !== 0 && mutData.charge === 0) {
    chargeCategory = 'CHARGE_LOSS';
    chargeLabel = `Loss of Charge (${wtData.charge > 0 ? '+1' : '-1'} → 0)`;
    chargeColor = 'text-amber-400 bg-amber-950/80 border-amber-600/60';
  } else if (wtData.charge === 0 && mutData.charge !== 0) {
    chargeCategory = 'CHARGE_GAIN';
    chargeLabel = `Gain of Charge (0 → ${mutData.charge > 0 ? '+1' : '-1'})`;
    chargeColor = 'text-purple-400 bg-purple-950/80 border-purple-600/60';
  }

  // Structural Alerts
  const structuralAlerts = [];
  if (wt === 'C' && mut !== 'C') {
    structuralAlerts.push('Loss of Cysteine (Disrupts potential disulfide bond)');
  }
  if (wt !== 'P' && mut === 'P') {
    structuralAlerts.push('Proline Introduced (Helix-breaker / backbone rigidity)');
  }
  if (wt === 'P' && mut !== 'P') {
    structuralAlerts.push('Proline Removed (Loss of structural kink)');
  }
  if (wt === 'G' && mut !== 'G') {
    structuralAlerts.push('Glycine Lost (Restricts Ramachandran backbone flexibility)');
  }
  if (deltaHydropathy >= 3.0) {
    structuralAlerts.push('Hydrophobic Shift (Surface aggregation risk)');
  } else if (deltaHydropathy <= -3.0) {
    structuralAlerts.push('Hydrophilic Shift (Core packing destabilization)');
  }

  // Overall Triage Risk Scoring
  let riskTier = 'LOW';
  let riskScore = 1;
  let pocketSummary = 'Favorable or neutral fit';

  if (
    stericCategory === 'SEVERE_EXPANSION' ||
    chargeCategory === 'CHARGE_INVERSION' ||
    (wt === 'C' && mut !== 'C')
  ) {
    riskTier = 'HIGH';
    riskScore = 3;
    pocketSummary =
      stericCategory === 'SEVERE_EXPANSION'
        ? 'Severe steric clash obstacle likely to disrupt binding pockets or packing core.'
        : 'Electrostatic inversion likely to disrupt catalytic salt bridges or active sites.';
  } else if (
    stericCategory === 'MODERATE_EXPANSION' ||
    stericCategory === 'CAVITY_CREATING' ||
    chargeCategory === 'CHARGE_LOSS' ||
    wt === 'P' ||
    mut === 'P' ||
    wt === 'G'
  ) {
    riskTier = 'MODERATE';
    riskScore = 2;
    pocketSummary =
      stericCategory === 'CAVITY_CREATING'
        ? 'Loss of core packing density may cause pocket collapse or conformational shifts.'
        : 'Moderate spatial or charge perturbation that may affect local stability.';
  }

  return {
    wt: { code1: wt, ...wtData },
    mut: { code1: mut, ...mutData },
    deltaVolume,
    deltaCharge,
    deltaHydropathy,
    steric: {
      category: stericCategory,
      label: stericLabel,
      color: stericColor,
    },
    charge: {
      category: chargeCategory,
      label: chargeLabel,
      color: chargeColor,
    },
    structuralAlerts,
    pocketRisk: riskTier,
    riskTier,
    riskScore,
    pocketSummary,
  };
}
