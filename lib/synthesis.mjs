export const citationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["sourceType", "sourceId", "claim"],
  properties: {
    sourceType: { type: "string", enum: ["trial", "publication"] },
    sourceId: { type: "string", minLength: 1 },
    claim: { type: "string", minLength: 1 },
  },
};

const findingSchema = {
  type: "object",
  additionalProperties: false,
  required: ["finding", "citations"],
  properties: {
    finding: { type: "string", minLength: 1 },
    citations: { type: "array", minItems: 1, items: citationSchema },
  },
};

export const synthesisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "supportiveEvidence", "challengingEvidence", "conflictingEvidence", "evidenceGaps", "uncertainties", "confidence", "humanReviewQuestions"],
  properties: {
    summary: { type: "string", minLength: 1 },
    supportiveEvidence: { type: "array", items: findingSchema },
    challengingEvidence: { type: "array", items: findingSchema },
    conflictingEvidence: { type: "array", items: findingSchema },
    evidenceGaps: { type: "array", items: { type: "string", minLength: 1 } },
    uncertainties: { type: "array", items: { type: "string", minLength: 1 } },
    confidence: { type: "string", enum: ["low", "moderate", "high"] },
    humanReviewQuestions: { type: "array", items: { type: "string", minLength: 1 } },
  },
};

const weaknessSchema = {
  type: "object",
  additionalProperties: false,
  required: ["weakness", "whyItMatters", "citations", "suggestedFollowUp"],
  properties: {
    weakness: { type: "string", minLength: 1 },
    whyItMatters: { type: "string", minLength: 1 },
    citations: { type: "array", minItems: 1, items: citationSchema },
    suggestedFollowUp: { type: "string", minLength: 1 },
  },
};

export const challengeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["overview", "weaknesses", "residualUncertainties", "reviewerQuestions"],
  properties: {
    overview: { type: "string", minLength: 1 },
    weaknesses: { type: "array", items: weaknessSchema },
    residualUncertainties: { type: "array", items: { type: "string", minLength: 1 } },
    reviewerQuestions: { type: "array", items: { type: "string", minLength: 1 } },
  },
};

export function compactEvidence(input) {
  return {
    drug: String(input?.query?.drug ?? "").slice(0, 200),
    condition: String(input?.query?.condition ?? "All indications").slice(0, 300),
    readiness: input?.readiness ?? null,
    trials: Array.isArray(input?.trials) ? input.trials.slice(0, 20).map((trial) => ({
      id: String(trial.nctId ?? ""),
      title: String(trial.title ?? "").slice(0, 500),
      phase: String(trial.phase ?? ""),
      status: String(trial.status ?? ""),
      enrollment: typeof trial.enrollment === "number" ? trial.enrollment : null,
      sponsor: String(trial.sponsor ?? "").slice(0, 250),
      conditions: Array.isArray(trial.conditions) ? trial.conditions.slice(0, 10).map(String) : [],
      primaryOutcomes: Array.isArray(trial.primaryOutcomes) ? trial.primaryOutcomes.slice(0, 5).map(String) : [],
      hasResults: Boolean(trial.hasResults),
    })).filter((trial) => /^NCT\d{8}$/.test(trial.id)) : [],
    publications: Array.isArray(input?.publications) ? input.publications.slice(0, 15).map((publication) => ({
      id: String(publication.pmid ?? ""),
      title: String(publication.title ?? "").slice(0, 500),
      journal: String(publication.journal ?? "").slice(0, 250),
      date: String(publication.date ?? "").slice(0, 80),
      publicationTypes: Array.isArray(publication.publicationTypes) ? publication.publicationTypes.slice(0, 10).map(String) : [],
      abstract: String(publication.abstract ?? "").slice(0, 5000),
    })).filter((publication) => /^\d+$/.test(publication.id)) : [],
  };
}

export function collectCitations(result, mode = "synthesis") {
  if (mode === "challenge") return Array.isArray(result?.weaknesses) ? result.weaknesses.flatMap((item) => Array.isArray(item?.citations) ? item.citations : []) : [];
  return ["supportiveEvidence", "challengingEvidence", "conflictingEvidence"].flatMap((key) => Array.isArray(result?.[key]) ? result[key].flatMap((item) => Array.isArray(item?.citations) ? item.citations : []) : []);
}

export function validateCitationIds(result, evidence, mode = "synthesis") {
  const trialIds = new Set(evidence.trials.map((item) => item.id));
  const publicationIds = new Set(evidence.publications.map((item) => item.id));
  const invalid = collectCitations(result, mode).filter((citation) => {
    if (citation?.sourceType === "trial") return !trialIds.has(citation.sourceId);
    if (citation?.sourceType === "publication") return !publicationIds.has(citation.sourceId);
    return true;
  });
  return { valid: invalid.length === 0, invalid };
}

export function groundingReport(result, evidence, mode = "synthesis") {
  const validation = validateCitationIds(result, evidence, mode);
  const claims = mode === "challenge"
    ? (Array.isArray(result?.weaknesses) ? result.weaknesses : [])
    : ["supportiveEvidence", "challengingEvidence", "conflictingEvidence"].flatMap((key) => Array.isArray(result?.[key]) ? result[key] : []);
  const groundedClaims = claims.filter((item) => Array.isArray(item?.citations) && item.citations.length > 0 && item.citations.every((citation) => !validation.invalid.includes(citation))).length;
  return {
    status: !validation.valid ? "unsupported" : groundedClaims === claims.length ? "grounded" : "partially_grounded",
    identifierGroundingPercent: claims.length ? Math.round((groundedClaims / claims.length) * 100) : 100,
    checkedClaims: claims.length,
    invalidCitationIds: validation.invalid.map((item) => item?.sourceId ?? "unknown"),
    note: "Identifier grounding verifies that cited NCT IDs and PMIDs were retrieved; it does not prove semantic entailment.",
  };
}
