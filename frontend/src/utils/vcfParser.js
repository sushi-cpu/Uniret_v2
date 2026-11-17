/**
 * vcfParser.js - Client-Side VCF (Variant Call Format) Parser & Clinical Triage Engine.
 *
 * Designed for clinicians, oncologists, and wet-lab researchers:
 * Parses patient genomic VCF files (standard VCF 4.1/4.2, GATK Mutect2 somatic callsets,
 * VEP-annotated, SnpEff-annotated, or targeted NGS panels).
 * Provides DIRECT Ensembl VEP REST API annotation across all 20,000+ human genes
 * without artificial interval heuristics.
 */

import { analyzeResidueMutation, normalizeAA } from './biophysics.js';

// Curated Gene Symbol -> UniProt Accession Mapping
export const GENE_ACCESSION_MAP = {
  EGFR: 'P00533',
  KIT: 'P10721',
  TP53: 'P04637',
  KRAS: 'P01116',
  PIK3CA: 'P42336',
  BRCA1: 'P38398',
  BRCA2: 'P51587',
  BRAF: 'P15056',
  PDGFRA: 'P16234',
  PTEN: 'P60484',
  APC: 'P25054',
  MET: 'P08581',
  ALK: 'Q9UM73',
  ERBB2: 'P04626',
  RET: 'P07949',
  ROS1: 'P08922',
  NRAS: 'P01111',
  HRAS: 'P01112',
  AKT1: 'P31749',
  ESR1: 'P03372',
  CDK4: 'P11802',
  RB1: 'P06400',
  VHL: 'P40337',
  IDH1: 'O75874',
  IDH2: 'P48735',
  FBXW7: 'Q969H0',
  FAT1: 'Q14517',
  SMAD4: 'Q13485',
  NOTCH1: 'P46531',
  KMT2D: 'O14686',
  KMT2C: 'Q8NEZ4',
  MYC: 'P01106',
  CCND1: 'P24385',
  STK11: 'Q15831',
  ARID1A: 'O14497',
  CDKN2A: 'P42771',
  ATM: 'Q13315',
  CHEK2: 'O96017',
  CDH1: 'P12830',
  CTNNB1: 'P35222',
  CASP8: 'Q14790',
  B2M: 'P61769',
  NFE2L2: 'Q16236',
  JAK2: 'O60674',
  MPL: 'P40238',
  CALR: 'P27797',
  FLT3: 'P36888',
  NF1: 'P21359',
  NF2: 'P35240',
  BAP1: 'Q92560',
  POLE: 'Q07864',
  POLD1: 'P28340',
  MSH2: 'P43246',
  MSH6: 'P52701',
  MLH1: 'P40692',
  PMS2: 'P54278',
  FGFR1: 'P11362',
  FGFR2: 'P21802',
  FGFR3: 'P22607',
};

// Known recurrent cancer hotspots indexed by rsID (when present in panel files)
const HOTSPOT_REGISTRY = {
  // EGFR
  rs121434568: { gene: 'EGFR', accession: 'P00533', wt: 'L', mut: 'R', pos: 858, clinSig: 'Pathogenic' },
  rs121434569: { gene: 'EGFR', accession: 'P00533', wt: 'T', mut: 'M', pos: 790, clinSig: 'Pathogenic' },
  rs797044941: { gene: 'EGFR', accession: 'P00533', wt: 'C', mut: 'S', pos: 797, clinSig: 'Pathogenic' },
  // KRAS
  rs121913529: { gene: 'KRAS', accession: 'P01116', wt: 'G', mut: 'C', pos: 12, clinSig: 'Pathogenic' },
  rs121913530: { gene: 'KRAS', accession: 'P01116', wt: 'G', mut: 'D', pos: 12, clinSig: 'Pathogenic' },
  rs121913527: { gene: 'KRAS', accession: 'P01116', wt: 'G', mut: 'V', pos: 12, clinSig: 'Pathogenic' },
  rs121913240: { gene: 'KRAS', accession: 'P01116', wt: 'Q', mut: 'H', pos: 61, clinSig: 'Pathogenic' },
  // KIT
  rs121913507: { gene: 'KIT', accession: 'P10721', wt: 'T', mut: 'I', pos: 670, clinSig: 'Pathogenic' },
  rs121913511: { gene: 'KIT', accession: 'P10721', wt: 'V', mut: 'A', pos: 654, clinSig: 'Pathogenic' },
  rs121913508: { gene: 'KIT', accession: 'P10721', wt: 'D', mut: 'V', pos: 816, clinSig: 'Pathogenic' },
  // TP53
  rs28934578: { gene: 'TP53', accession: 'P04637', wt: 'R', mut: 'H', pos: 175, clinSig: 'Pathogenic' },
  rs11540652: { gene: 'TP53', accession: 'P04637', wt: 'R', mut: 'W', pos: 248, clinSig: 'Pathogenic' },
  rs121912651: { gene: 'TP53', accession: 'P04637', wt: 'R', mut: 'Q', pos: 248, clinSig: 'Pathogenic' },
  rs28934576: { gene: 'TP53', accession: 'P04637', wt: 'R', mut: 'H', pos: 273, clinSig: 'Pathogenic' },
  // BRAF
  rs113488022: { gene: 'BRAF', accession: 'P15056', wt: 'V', mut: 'E', pos: 600, clinSig: 'Pathogenic' },
  // PIK3CA
  rs121913279: { gene: 'PIK3CA', accession: 'P42336', wt: 'E', mut: 'K', pos: 545, clinSig: 'Pathogenic' },
  rs104886003: { gene: 'PIK3CA', accession: 'P42336', wt: 'H', mut: 'R', pos: 1047, clinSig: 'Pathogenic' },
  // BRCA1
  rs80357474: { gene: 'BRCA1', accession: 'P38398', wt: 'C', mut: 'G', pos: 61, clinSig: 'Pathogenic' },
  // PDGFRA
  rs121908585: { gene: 'PDGFRA', accession: 'P16234', wt: 'D', mut: 'V', pos: 842, clinSig: 'Pathogenic' },
  // FBXW7
  rs149680468: { gene: 'FBXW7', accession: 'Q969H0', wt: 'R', mut: 'G', pos: 505, clinSig: 'Likely Pathogenic' },
};

/**
 * Extracts amino acid substitution from HGVS or single-letter strings.
 * e.g., 'p.Leu858Arg', 'L858R', 'p.L858R', 'Leu858Arg', 'Thr670Ile'
 */
export function extractAASubstitution(str) {
  if (!str || typeof str !== 'string') return null;

  // Clean prefixes: 'p.', 'p.(', ')'
  const clean = str.replace(/^p\./, '').replace(/^\(/, '').replace(/\)$/, '').trim();

  // Pattern 1: Single letter: e.g. L858R, T670I, G12C
  const m1 = clean.match(/^([A-Za-z])(\d+)([A-Za-z])$/);
  if (m1) {
    const wt = normalizeAA(m1[1]);
    const pos = parseInt(m1[2], 10);
    const mut = normalizeAA(m1[3]);
    if (wt && mut && !isNaN(pos)) {
      return { wt, pos, mut, notation: `${wt}${pos}${mut}` };
    }
  }

  // Pattern 2: 3-letter codes: e.g. Leu858Arg, Thr670Ile, Gly12Cys
  const m2 = clean.match(/^([A-Za-z]{3})(\d+)([A-Za-z]{3})$/);
  if (m2) {
    const wt = normalizeAA(m2[1]);
    const pos = parseInt(m2[2], 10);
    const mut = normalizeAA(m2[3]);
    if (wt && mut && !isNaN(pos)) {
      return { wt, pos, mut, notation: `${wt}${pos}${mut}` };
    }
  }

  return null;
}

/**
 * Parse an INFO field string into a dictionary.
 */
function parseInfoString(infoStr) {
  if (!infoStr || infoStr === '.') return {};
  const res = {};
  const tokens = infoStr.split(';');
  for (const token of tokens) {
    const eqIdx = token.indexOf('=');
    if (eqIdx !== -1) {
      const key = token.substring(0, eqIdx).trim();
      const val = token.substring(eqIdx + 1).trim();
      res[key] = val;
    } else {
      res[token.trim()] = true;
    }
  }
  return res;
}

/**
 * Parse a raw VCF text string and perform Instant Biophysical Triage on each variant.
 * Handles standard VCF 4.1/4.2, VEP/SnpEff, AND raw caller outputs such as GATK Mutect2!
 *
 * @param {string} vcfText - Raw VCF file content
 * @returns {object} Triage result containing metadata, somatic metrics, and variant records
 */
export function parseVcfAndTriage(vcfText) {
  if (!vcfText || typeof vcfText !== 'string') {
    return { error: 'Empty or invalid VCF content.', records: [] };
  }

  const lines = vcfText.split(/\r?\n/);
  const records = [];
  let lineCount = 0;

  // Metadata headers
  let callerName = 'Standard VCF';
  let isSomaticCaller = false;
  let tumorSampleName = null;
  let normalSampleName = null;
  let tumorColIdx = -1;
  let normalColIdx = -1;
  const filterCounts = {};

  // First pass: scan headers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('##')) {
      const lower = line.toLowerCase();
      if (lower.includes('mutect') || lower.includes('filtermutectcalls')) {
        callerName = 'GATK Mutect2';
        isSomaticCaller = true;
      }
      const tumorMatch = line.match(/##tumor_sample=([^\s]+)/i);
      if (tumorMatch) {
        tumorSampleName = tumorMatch[1];
        isSomaticCaller = true;
      }
      const normalMatch = line.match(/##normal_sample=([^\s]+)/i);
      if (normalMatch) {
        normalSampleName = normalMatch[1];
      }
      continue;
    }

    if (line.startsWith('#CHROM')) {
      const headerCols = line.split('\t');
      if (headerCols.length > 9) {
        isSomaticCaller = true;
        const sampleNames = headerCols.slice(9);
        for (let s = 0; s < sampleNames.length; s++) {
          const sName = sampleNames[s];
          const colIdx = 9 + s;
          if (tumorSampleName && sName === tumorSampleName) {
            tumorColIdx = colIdx;
          } else if (normalSampleName && sName === normalSampleName) {
            normalColIdx = colIdx;
          } else if (/tumor|[_-]t$|t$/i.test(sName)) {
            if (tumorColIdx === -1) {
              tumorColIdx = colIdx;
              tumorSampleName = sName;
            }
          } else if (/normal|germline|[_-]b$|[_-]n$|b$|n$/i.test(sName)) {
            if (normalColIdx === -1) {
              normalColIdx = colIdx;
              normalSampleName = sName;
            }
          }
        }
        if (tumorColIdx === -1 && headerCols.length >= 10) {
          tumorColIdx = headerCols.length > 10 ? 10 : 9;
          tumorSampleName = headerCols[tumorColIdx];
        }
        if (normalColIdx === -1 && headerCols.length >= 11 && normalColIdx !== tumorColIdx) {
          normalColIdx = 9;
          normalSampleName = headerCols[normalColIdx];
        }
      }
      break;
    }
  }

  // Second pass: parse variant records
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    lineCount++;
    const cols = line.split('\t');
    const fields = cols.length >= 5 ? cols : line.split(/\s+/);
    if (fields.length < 5) continue;

    const chrom = fields[0];
    const pos = parseInt(fields[1], 10);
    const id = fields[2] && fields[2] !== '.' ? fields[2] : null;
    const ref = fields[3];
    const alt = fields[4];
    const qual = fields[5] && fields[5] !== '.' ? fields[5] : null;
    const filter = fields[6] && fields[6] !== '.' ? fields[6] : 'PASS';
    const isPass = filter === 'PASS' || filter === '.';
    const infoStr = fields[7] || '';
    const info = parseInfoString(infoStr);

    // Track filter stats
    if (filter) {
      const tokens = filter.split(';');
      for (const t of tokens) {
        filterCounts[t] = (filterCounts[t] || 0) + 1;
      }
    }

    // Parse Sample FORMAT fields (e.g. GT:AD:AF:DP for Mutect2)
    let formatKeys = [];
    let tumorAF = null;
    let tumorDP = null;
    let tumorAD = null;
    let tumorGT = null;
    let normalDP = null;
    let normalAF = null;
    let normalGT = null;

    if (fields.length > 8) {
      formatKeys = fields[8].split(':');

      if (tumorColIdx !== -1 && fields[tumorColIdx]) {
        const tumorVals = fields[tumorColIdx].split(':');
        const tMap = {};
        for (let k = 0; k < formatKeys.length; k++) {
          tMap[formatKeys[k]] = tumorVals[k] || '';
        }
        if (tMap.AF) {
          const parsed = parseFloat(tMap.AF.split(',')[0]);
          if (!isNaN(parsed)) tumorAF = parsed;
        }
        if (tMap.DP) {
          const parsed = parseInt(tMap.DP, 10);
          if (!isNaN(parsed)) tumorDP = parsed;
        }
        if (tMap.AD) tumorAD = tMap.AD;
        if (tMap.GT) tumorGT = tMap.GT;
      }

      if (normalColIdx !== -1 && fields[normalColIdx]) {
        const normalVals = fields[normalColIdx].split(':');
        const nMap = {};
        for (let k = 0; k < formatKeys.length; k++) {
          nMap[formatKeys[k]] = normalVals[k] || '';
        }
        if (nMap.DP) normalDP = parseInt(nMap.DP, 10);
        if (nMap.AF) normalAF = parseFloat(nMap.AF.split(',')[0]);
        if (nMap.GT) normalGT = nMap.GT;
      }
    }

    let af = tumorAF !== null ? tumorAF : (info.AF ? parseFloat(info.AF.split(',')[0]) : null);

    let gene = info.GENE || info.SYMBOL || null;
    let aaChange = null;
    let clinSig = info.CLNSIG || info.SIG || null;

    // 1. Try parsing from VEP CSQ annotation (if present in INFO)
    if (info.CSQ) {
      const csqParts = info.CSQ.split(',')[0].split('|');
      for (const part of csqParts) {
        if (!gene && GENE_ACCESSION_MAP[part.toUpperCase()]) {
          gene = part.toUpperCase();
        }
        if (!aaChange) {
          const extracted = extractAASubstitution(part);
          if (extracted) aaChange = extracted;
        }
      }
    }

    // 2. Try parsing from SnpEff ANN annotation (if present in INFO)
    if (info.ANN) {
      const annParts = info.ANN.split(',')[0].split('|');
      if (annParts[3] && !gene) gene = annParts[3].toUpperCase();
      if (annParts[10] && !aaChange) aaChange = extractAASubstitution(annParts[10]);
    }

    // 3. Try parsing explicit AA or HGVS fields in INFO
    if (!aaChange) {
      const aaStr = info.AA || info.MUT || info.HGVS || info.HGVSp || info.PROTEIN || null;
      if (aaStr) aaChange = extractAASubstitution(aaStr);
    }

    // 4. Try Hotspot Dictionary by rsID if rsID is present in VCF
    if (id && HOTSPOT_REGISTRY[id]) {
      const spot = HOTSPOT_REGISTRY[id];
      if (!gene) gene = spot.gene;
      if (!aaChange) {
        aaChange = {
          wt: spot.wt,
          pos: spot.pos,
          mut: spot.mut,
          notation: `${spot.wt}${spot.pos}${spot.mut}`,
        };
      }
      if (!clinSig) clinSig = spot.clinSig;
    }

    // Determine UniProt Accession
    const accession = gene && GENE_ACCESSION_MAP[gene.toUpperCase()] ? GENE_ACCESSION_MAP[gene.toUpperCase()] : null;

    // Run Biophysical Triage if we have WT and Mutant residues
    let biophysical = null;
    if (aaChange) {
      biophysical = analyzeResidueMutation(aaChange.wt, aaChange.mut);
    }

    const record = {
      index: lineCount,
      chrom,
      pos,
      id,
      ref,
      alt,
      qual,
      filter,
      isPass,
      gene: gene || null,
      isAnnotated: Boolean(gene || aaChange),
      consequence: null,
      accession,
      mutation: aaChange ? aaChange.notation : `${ref}>${alt}`,
      wt: aaChange ? aaChange.wt : null,
      mut: aaChange ? aaChange.mut : null,
      residuePos: aaChange ? aaChange.pos : null,
      clinSig: clinSig || (isPass ? 'Somatic PASS Call' : 'Filtered Call'),
      af: !isNaN(af) ? af : null,
      tumorDepth: tumorDP,
      tumorAD,
      tumorGT,
      normalDepth: normalDP,
      normalAF,
      normalGT,
      tumorLOD: info.TLOD ? parseFloat(info.TLOD) : null,
      biophysical,
      riskTier: biophysical ? biophysical.riskTier : 'UNANNOTATED',
      riskScore: biophysical ? biophysical.riskScore : 0,
      deltaVolume: biophysical ? biophysical.deltaVolume : 0,
      deltaCharge: biophysical ? biophysical.deltaCharge : 0,
      deltaHydropathy: biophysical ? biophysical.deltaHydropathy : 0,
    };

    records.push(record);
  }

  // Triage Statistics
  const total = records.length;
  const passRecords = records.filter((r) => r.isPass);
  const passCount = passRecords.length;
  const filteredCount = total - passCount;
  const highRiskCount = records.filter((r) => r.riskTier === 'HIGH').length;
  const moderateRiskCount = records.filter((r) => r.riskTier === 'MODERATE').length;
  const lowRiskCount = records.filter((r) => r.riskTier === 'LOW').length;
  const uniqueGenes = Array.from(new Set(records.map((r) => r.gene).filter((g) => Boolean(g) && g !== 'Unknown')));
  const annotatedCount = records.filter((r) => r.isAnnotated).length;

  // Calculate average VAF & median Depth of PASS records
  let meanTumorVAF = 0;
  let medianTumorDP = 0;
  const passVAFs = passRecords.map((r) => r.af).filter((v) => v !== null && !isNaN(v));
  if (passVAFs.length > 0) {
    meanTumorVAF = passVAFs.reduce((a, b) => a + b, 0) / passVAFs.length;
  }
  const passDPs = passRecords.map((r) => r.tumorDepth).filter((d) => d !== null && !isNaN(d)).sort((a, b) => a - b);
  if (passDPs.length > 0) {
    medianTumorDP = passDPs[Math.floor(passDPs.length / 2)];
  }

  return {
    total,
    passCount,
    filteredCount,
    filterCounts,
    highRiskCount,
    moderateRiskCount,
    lowRiskCount,
    uniqueGenes,
    annotatedCount,
    callerName,
    isSomaticCaller,
    tumorSampleName,
    normalSampleName,
    meanTumorVAF,
    medianTumorDP,
    records,
  };
}

/**
 * DIRECT annotation via Ensembl VEP REST API across all 20,000+ human genes.
 * Directly translates genomic coordinates into functional gene symbols, HGVS protein alterations,
 * and feeds the amino acid changes into the Instant Biophysical Triage engine.
 *
 * @param {Array} variantRecords - Array of parsed variant records
 * @param {string} assembly - 'GRCh38' (default) or 'GRCh37'
 * @returns {Promise<Array>} Updated records with direct VEP annotations
 */
export async function annotateVariantsWithVEP(variantRecords, assembly = 'GRCh38') {
  if (!variantRecords || variantRecords.length === 0) return [];

  const formatVariant = (r) => {
    const chrClean = r.chrom.replace(/^chr/i, '');
    return `${chrClean} ${r.pos} ${r.id || '.'} ${r.ref} ${r.alt} . . .`;
  };

  const payload = {
    variants: variantRecords.slice(0, 100).map(formatVariant),
  };

  let vepResults = null;
  let lastErr = null;

  // Try 1: Local backend proxy /api/vcf/vep
  try {
    const proxyResp = await fetch('/api/vcf/vep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variants: payload.variants, assembly }),
    });
    if (proxyResp.ok) {
      vepResults = await proxyResp.json();
    }
  } catch (proxyErr) {
    lastErr = proxyErr;
  }

  // Try 2: Direct Ensembl VEP REST API (CORS enabled)
  if (!vepResults) {
    try {
      const endpoint = assembly === 'GRCh37'
        ? 'https://grch37.rest.ensembl.org/vep/human/region'
        : 'https://rest.ensembl.org/vep/human/region';

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        vepResults = await resp.json();
      } else {
        throw new Error(`Ensembl VEP status ${resp.status}`);
      }
    } catch (directErr) {
      throw new Error(`VEP direct query failed: ${directErr.message || lastErr?.message || 'Network error'}`);
    }
  }

  if (!Array.isArray(vepResults)) return [];

  // Map VEP results back to records
  const updated = [...variantRecords];
  for (const res of vepResults) {
    const inputStr = res.input || '';
    const parts = inputStr.split(' ');
    const vChr = parts[0];
    const vPos = parseInt(parts[1], 10);
    const vRef = parts[3];
    const vAlt = parts[4];

    const matchIdx = updated.findIndex(
      (r) => r.chrom.replace(/^chr/i, '') === vChr && r.pos === vPos && r.ref === vRef && r.alt === vAlt
    );

    if (matchIdx !== -1) {
      const r = { ...updated[matchIdx] };
      r.isAnnotated = true;
      r.consequence = res.most_severe_consequence || 'unknown';

      // Pick the primary transcript consequence (prefer coding / missense)
      const tc = res.transcript_consequences?.find((t) => t.gene_symbol && t.amino_acids) ||
                 res.transcript_consequences?.find((t) => t.gene_symbol) ||
                 res.transcript_consequences?.[0];

      if (tc) {
        if (tc.gene_symbol) {
          r.gene = tc.gene_symbol;
          if (GENE_ACCESSION_MAP[tc.gene_symbol]) {
            r.accession = GENE_ACCESSION_MAP[tc.gene_symbol];
          }
        }

        if (tc.amino_acids && tc.protein_start) {
          const aaParts = tc.amino_acids.split('/');
          if (aaParts.length === 2) {
            const wt = normalizeAA(aaParts[0]);
            const mut = normalizeAA(aaParts[1]);
            const pos = tc.protein_start;
            if (wt && mut) {
              r.wt = wt;
              r.mut = mut;
              r.residuePos = pos;
              r.mutation = `${wt}${pos}${mut}`;
              r.biophysical = analyzeResidueMutation(wt, mut);
              r.riskTier = r.biophysical.riskTier;
              r.riskScore = r.biophysical.riskScore;
              r.deltaVolume = r.biophysical.deltaVolume;
              r.deltaCharge = r.biophysical.deltaCharge;
              r.deltaHydropathy = r.biophysical.deltaHydropathy;
            }
          }
        } else if (res.most_severe_consequence === 'synonymous_variant') {
          r.riskTier = 'LOW';
          r.mutation = 'Synonymous';
        } else if (res.most_severe_consequence?.includes('stop_gained') || res.most_severe_consequence?.includes('frameshift')) {
          r.riskTier = 'HIGH';
          r.mutation = res.most_severe_consequence.replace('_variant', '').replace('_', ' ');
        } else {
          r.riskTier = 'CONSERVATIVE';
          r.mutation = res.most_severe_consequence ? res.most_severe_consequence.replace('_variant', '').replace(/_/g, ' ') : `${r.ref}>${r.alt}`;
        }
      }

      // Colocated ClinVar significance & rsID
      if (res.colocated_variants?.length > 0) {
        for (const cv of res.colocated_variants) {
          if (cv.clin_sig && cv.clin_sig.length > 0) {
            r.clinSig = cv.clin_sig.join('; ');
          }
          if (cv.id && !r.id) {
            r.id = cv.id;
          }
        }
      }

      updated[matchIdx] = r;
    }
  }

  return updated;
}

/**
 * Pre-configured Clinical Patient VCF Panels for 1-click clinical workflow testing.
 */
export const SAMPLE_VCFS = [
  {
    id: 'st22_mutect2',
    title: 'Patient ST-22-17T • Cervical Carcinoma Mutect2 Somatic WES Callset',
    desc: 'Real GATK Mutect2 tumor-normal paired WES callset (ST-22-17T tumor vs ST-22-17B normal). Raw caller coordinates ready for direct Ensembl VEP annotation.',
    badge: 'GATK Mutect2 Somatic',
    badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
    content: `##fileformat=VCFv4.2
##source=Mutect2
##source=FilterMutectCalls
##reference=GRCh38
##tumor_sample=ST-22-17T
##normal_sample=ST-22-17B
##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">
##FORMAT=<ID=AD,Number=R,Type=Integer,Description="Allelic depths for the ref and alt alleles">
##FORMAT=<ID=AF,Number=A,Type=Float,Description="Allele fractions of alternate alleles in the tumor">
##FORMAT=<ID=DP,Number=1,Type=Integer,Description="Approximate read depth">
##INFO=<ID=TLOD,Number=A,Type=Float,Description="Log 10 likelihood ratio score of candidate somatic variant">
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO	FORMAT	ST-22-17B	ST-22-17T
chr4	152326137	rs149680468	G	C	.	PASS	TLOD=18.42;DP=80	GT:AD:AF:DP	0/0:70,0:0.010:70	0/1:59,21:0.260:80
chr4	186617066	.	G	T	.	PASS	TLOD=14.15;DP=123	GT:AD:AF:DP	0/0:110,0:0.008:110	0/1:99,24:0.195:123
chr18	51048830	.	C	G	.	PASS	TLOD=12.80;DP=65	GT:AD:AF:DP	0/0:58,0:0.012:58	0/1:53,12:0.182:65
chr7	55168529	.	A	G	.	PASS	TLOD=9.20;DP=54	GT:AD:AF:DP	0/0:48,0:0.015:48	0/1:49,5:0.091:54
chr12	49037968	.	A	G	.	PASS	TLOD=7.80;DP=155	GT:AD:AF:DP	0/0:140,0:0.007:140	0/1:145,10:0.062:155
chr8	127736278	.	G	C	.	PASS	TLOD=6.40;DP=159	GT:AD:AF:DP	0/0:145,0:0.006:145	0/1:153,6:0.040:159
chr9	136501932	.	C	T	.	PASS	TLOD=5.90;DP=127	GT:AD:AF:DP	0/0:115,0:0.008:115	0/1:122,5:0.036:127
chr19	35488794	.	C	T	.	PASS	TLOD=24.10;DP=156	GT:AD:AF:DP	0/0:130,0:0.007:130	0/1:68,88:0.563:156
chr1	171575067	.	C	G	.	PASS	TLOD=21.50;DP=107	GT:AD:AF:DP	0/0:95,0:0.009:95	0/1:49,58:0.544:107
chr10	50814027	.	C	A	.	PASS	TLOD=15.20;DP=49	GT:AD:AF:DP	0/0:42,0:0.014:42	0/1:26,23:0.457:49
chr1	942563	.	G	C	.	haplotype;weak_evidence	TLOD=3.10;DP=119	GT:AD:AF:DP	0/0:93,0:0.014:93	0/1:109,10:0.055:119
chr1	970976	.	G	T	.	normal_artifact	TLOD=3.80;DP=44	GT:AD:AF:DP	0/0:34,0:0.035:34	0/1:42,2:0.059:44
`,
  },
  {
    id: 'nsclc_resistance',
    title: 'Patient NSCLC-042 • Lung Adenocarcinoma Resistance Panel',
    desc: 'Targeted WES panel from an EGFR-mutant NSCLC patient post-osimertinib progression. Demonstrates primary activating mutation (L858R), gatekeeper steric expansion (T790M), and KRAS bypass activation.',
    badge: 'Oncology TKI Resistance',
    badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-800/60',
    content: `##fileformat=VCFv4.2
##source=UniRetClinicalVCFPipeline
##reference=GRCh38
##INFO=<ID=GENE,Number=1,Type=String,Description="Gene Symbol">
##INFO=<ID=AA,Number=1,Type=String,Description="Amino Acid Change">
##INFO=<ID=CLNSIG,Number=1,Type=String,Description="ClinVar Clinical Significance">
##INFO=<ID=AF,Number=1,Type=Float,Description="Allele Frequency">
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
chr7	55181378	rs121434568	C	T	1200	PASS	GENE=EGFR;AA=L858R;CLNSIG=Pathogenic;AF=0.48
chr7	55191822	rs121434569	C	T	980	PASS	GENE=EGFR;AA=T790M;CLNSIG=Pathogenic;AF=0.34
chr7	55191843	rs797044941	G	C	650	PASS	GENE=EGFR;AA=C797S;CLNSIG=Pathogenic;AF=0.19
chr12	25245350	rs121913529	C	A	1100	PASS	GENE=KRAS;AA=G12C;CLNSIG=Pathogenic;AF=0.25
chr17	7674220	rs28934578	C	T	890	PASS	GENE=TP53;AA=R175H;CLNSIG=Pathogenic;AF=0.62
chr3	179218303	rs121913279	G	A	750	PASS	GENE=PIK3CA;AA=E545K;CLNSIG=Pathogenic;AF=0.18
`,
  },
  {
    id: 'gist_progression',
    title: 'Patient GIST-109 • Gastrointestinal Stromal Tumor Panel',
    desc: 'Core UniRet benchmark cohort patient. Features KIT gatekeeper severe steric clash (T670I +50.6 Å³) conferring secondary imatinib resistance alongside PDGFRA activation loop mutation.',
    badge: 'KIT / GIST Benchmark',
    badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
    content: `##fileformat=VCFv4.2
##source=UniRetClinicalVCFPipeline
##reference=GRCh38
##INFO=<ID=GENE,Number=1,Type=String,Description="Gene Symbol">
##INFO=<ID=AA,Number=1,Type=String,Description="Amino Acid Change">
##INFO=<ID=CLNSIG,Number=1,Type=String,Description="ClinVar Clinical Significance">
##INFO=<ID=AF,Number=1,Type=Float,Description="Allele Frequency">
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
chr4	54728515	rs121913507	C	T	1450	PASS	GENE=KIT;AA=T670I;CLNSIG=Pathogenic;AF=0.55
chr4	54728468	rs121913511	T	C	1120	PASS	GENE=KIT;AA=V654A;CLNSIG=Pathogenic;AF=0.38
chr4	54733155	rs121913508	A	T	870	PASS	GENE=KIT;AA=D816V;CLNSIG=Pathogenic;AF=0.22
chr4	54274943	rs121908585	A	T	990	PASS	GENE=PDGFRA;AA=D842V;CLNSIG=Pathogenic;AF=0.41
chr17	7673802	rs121912651	G	A	1300	PASS	GENE=TP53;AA=R248Q;CLNSIG=Pathogenic;AF=0.67
`,
  },
  {
    id: 'breast_ovarian_panel',
    title: 'Patient BR-088 • Hereditary Breast & Ovarian Cancer Panel',
    desc: 'Identifies high-impact DNA double-strand break repair disruption in BRCA1 (C61G zinc-ring destabilization) alongside PIK3CA and PTEN pathway alterations.',
    badge: 'BRCA1 / HRD Panel',
    badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800/60',
    content: `##fileformat=VCFv4.2
##source=UniRetClinicalVCFPipeline
##reference=GRCh38
##INFO=<ID=GENE,Number=1,Type=String,Description="Gene Symbol">
##INFO=<ID=AA,Number=1,Type=String,Description="Amino Acid Change">
##INFO=<ID=CLNSIG,Number=1,Type=String,Description="ClinVar Clinical Significance">
##INFO=<ID=AF,Number=1,Type=Float,Description="Allele Frequency">
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
chr17	43094464	rs80357474	G	A	1500	PASS	GENE=BRCA1;AA=C61G;CLNSIG=Pathogenic;AF=0.50
chr17	7673776	rs28934576	C	T	1280	PASS	GENE=TP53;AA=R273H;CLNSIG=Pathogenic;AF=0.45
chr3	179234297	rs104886003	A	G	920	PASS	GENE=PIK3CA;AA=H1047R;CLNSIG=Pathogenic;AF=0.31
chr10	87933147	.	G	A	880	PASS	GENE=PTEN;AA=R130Q;CLNSIG=Pathogenic;AF=0.28
chr7	140753336	rs113488022	T	A	1640	PASS	GENE=BRAF;AA=V600E;CLNSIG=Pathogenic;AF=0.40
`,
  },
];

/**
 * Decompress a BGZF (Blocked GNU Zip Format) buffer client-side.
 */
export async function decompressBGZF(uint8Array) {
  const u = uint8Array;
  let offset = 0;
  const chunks = [];

  while (offset < u.length) {
    if (offset + 18 > u.length) break;
    if (u[offset] !== 0x1f || u[offset + 1] !== 0x8b || u[offset + 2] !== 0x08) break;

    const xlen = u[offset + 10] | (u[offset + 11] << 8);
    let bsize = 0;
    let p = offset + 12;
    const extraEnd = p + xlen;

    while (p + 4 <= extraEnd) {
      const si1 = u[p];
      const si2 = u[p + 1];
      const slen = u[p + 2] | (u[p + 3] << 8);
      if (si1 === 0x42 && si2 === 0x43 && slen === 2) {
        bsize = u[p + 4] | (u[p + 5] << 8);
        break;
      }
      p += 4 + slen;
    }

    if (bsize === 0) break;
    const totalBlockSize = bsize + 1;
    const headerSize = 12 + xlen;
    const payloadStart = offset + headerSize;
    const payloadEnd = offset + totalBlockSize - 8;

    if (payloadEnd > payloadStart) {
      const payload = u.subarray(payloadStart, payloadEnd);
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(payload);
      writer.close();
      const text = await new Response(ds.readable).text();
      chunks.push(text);
    }
    offset += totalBlockSize;
  }

  return chunks.length > 0 ? chunks.join('') : null;
}

/**
 * Universal VCF decompressor.
 */
export async function decompressVcfFile(file) {
  const buf = await file.arrayBuffer();
  const u = new Uint8Array(buf);

  if (u.length < 2 || u[0] !== 0x1f || u[1] !== 0x8b) {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(u);
  }

  try {
    if (typeof DecompressionStream !== 'undefined') {
      const bgzfText = await decompressBGZF(u);
      if (bgzfText && bgzfText.length > 0) return bgzfText;
    }
  } catch (bgzfErr) {
    console.warn('BGZF unpacker attempt failed, trying standard gzip:', bgzfErr);
  }

  try {
    if (typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('gzip');
      const decompressedStream = new Response(buf).body.pipeThrough(ds);
      return await new Response(decompressedStream).text();
    }
  } catch (gzipErr) {
    console.warn('Standard gzip stream failed:', gzipErr);
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch('/api/vcf/decompress', {
      method: 'POST',
      body: formData,
    });
    if (resp.ok) return await resp.text();
  } catch (apiErr) {
    console.warn('Backend decompression fallback failed:', apiErr);
  }

  throw new Error('Could not decompress file: Format is not supported or stream was corrupted.');
}
