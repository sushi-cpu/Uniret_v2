/**
 * trials.js - ClinicalTrials.gov API v2 real-time connector.
 *
 * Fetches recruiting and active clinical trials for a specific gene and variant
 * directly in the browser (with fallback to local backend proxy).
 */

export async function fetchClinicalTrials(searchTerm, pageSize = 12) {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return { total: 0, studies: [] };
  }

  const cleanTerm = searchTerm.trim();
  const directUrl = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(
    cleanTerm
  )}&filter.overallStatus=RECRUITING|ACTIVE_NOT_RECRUITING&pageSize=${pageSize}`;

  let rawData = null;

  // 1. Try direct browser call to ClinicalTrials.gov API v2
  try {
    const res = await fetch(directUrl, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      rawData = await res.json();
    }
  } catch (err) {
    console.warn('Direct ClinicalTrials.gov browser fetch failed, trying proxy:', err);
  }

  // 2. Fallback to local FastAPI proxy if direct browser request fails or is blocked
  if (!rawData) {
    try {
      const proxyUrl = `/api/trials?term=${encodeURIComponent(cleanTerm)}&page_size=${pageSize}`;
      const pRes = await fetch(proxyUrl);
      if (pRes.ok) {
        rawData = await pRes.json();
      }
    } catch (proxyErr) {
      console.error('Proxy ClinicalTrials fetch also failed:', proxyErr);
    }
  }

  if (!rawData || !Array.isArray(rawData.studies)) {
    return { total: 0, studies: [] };
  }

  // 3. Normalize into clean, presentation-ready trial objects
  const studies = rawData.studies.map((s) => {
    const proto = s.protocolSection || {};
    const idMod = proto.identificationModule || {};
    const statusMod = proto.statusModule || {};
    const designMod = proto.designModule || {};
    const sponsorMod = proto.sponsorCollaboratorsModule || {};
    const conditionsMod = proto.conditionsModule || {};
    const armsMod = proto.armsInterventionsModule || {};

    const phases = designMod.phases || [];
    const formattedPhase =
      phases.length > 0
        ? phases
            .map((p) =>
              p
                .replace('EARLY_', 'Early ')
                .replace('PHASE', 'Phase ')
                .replace('_', '/')
            )
            .join(' / ')
        : 'Not Specified';

    const interventions = (armsMod.interventions || [])
      .map((i) => (i.name ? `${i.name} (${i.type || 'Drug'})` : null))
      .filter(Boolean);

    return {
      nctId: idMod.nctId || '',
      title: idMod.briefTitle || idMod.officialTitle || 'Untitled Clinical Study',
      status: statusMod.overallStatus || 'UNKNOWN',
      phaseText: formattedPhase,
      leadSponsor: sponsorMod.leadSponsor?.name || 'Sponsor Not Listed',
      conditions: conditionsMod.conditions || [],
      interventions,
      briefSummary: proto.descriptionModule?.briefSummary || '',
      url: `https://clinicaltrials.gov/study/${idMod.nctId}`,
    };
  });

  return {
    total: rawData.totalCount ?? studies.length,
    studies,
  };
}

