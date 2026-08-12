import assert from "node:assert/strict";
import test from "node:test";
import { collectCitations, compactEvidence, groundingReport, synthesisSchema, validateCitationIds } from "../lib/synthesis.mjs";

const evidence = compactEvidence({
  query: { drug: "Example drug", condition: "Example condition" },
  readiness: { level: "Evidence developing" },
  trials: [{ nctId: "NCT12345678", title: "Phase II study", phase: "PHASE2", status: "COMPLETED", enrollment: 80, primaryOutcomes: ["Outcome"], hasResults: false }],
  publications: [{ pmid: "12345678", title: "Study abstract", journal: "Journal", abstract: "A supplied abstract.", publicationTypes: ["Clinical Trial"] }],
});

const groundedSynthesis = {
  summary: "The evidence remains limited.",
  supportiveEvidence: [],
  challengingEvidence: [{ finding: "The registry record has no posted results.", citations: [{ sourceType: "trial", sourceId: "NCT12345678", claim: "The supplied record hasResults field is false." }] }],
  conflictingEvidence: [],
  evidenceGaps: ["No posted trial results were supplied."],
  uncertainties: ["Outcome data were not available."],
  confidence: "low",
  humanReviewQuestions: ["Are results available from another verified source?"],
};

test("structured synthesis schema requires all review sections", () => {
  assert.deepEqual(synthesisSchema.required, ["summary", "supportiveEvidence", "challengingEvidence", "conflictingEvidence", "evidenceGaps", "uncertainties", "confidence", "humanReviewQuestions"]);
  assert.equal(synthesisSchema.additionalProperties, false);
});

test("valid retrieved NCT and PMID citations pass", () => {
  const result = { ...groundedSynthesis, supportiveEvidence: [{ finding: "An abstract is available.", citations: [{ sourceType: "publication", sourceId: "12345678", claim: "The publication includes an abstract." }] }] };
  assert.equal(validateCitationIds(result, evidence).valid, true);
  assert.equal(collectCitations(result).length, 2);
  assert.equal(groundingReport(result, evidence).identifierGroundingPercent, 100);
});

test("invented citation identifiers are rejected", () => {
  const result = { ...groundedSynthesis, supportiveEvidence: [{ finding: "Unsupported claim", citations: [{ sourceType: "trial", sourceId: "NCT99999999", claim: "Invented record" }] }] };
  const validation = validateCitationIds(result, evidence);
  assert.equal(validation.valid, false);
  assert.equal(validation.invalid[0].sourceId, "NCT99999999");
  assert.equal(groundingReport(result, evidence).status, "unsupported");
});

test("citation source type must match the retrieved identifier type", () => {
  const result = { ...groundedSynthesis, supportiveEvidence: [{ finding: "Mismatched claim", citations: [{ sourceType: "publication", sourceId: "NCT12345678", claim: "Wrong source type" }] }] };
  assert.equal(validateCitationIds(result, evidence).valid, false);
});

test("compact evidence removes malformed identifiers and limits text", () => {
  const compact = compactEvidence({ query: { drug: "x".repeat(500) }, trials: [{ nctId: "bad" }], publications: [{ pmid: "not-a-pmid" }] });
  assert.equal(compact.drug.length, 200);
  assert.equal(compact.trials.length, 0);
  assert.equal(compact.publications.length, 0);
});

test("grounding report explicitly does not claim semantic entailment", () => {
  assert.match(groundingReport(groundedSynthesis, evidence).note, /does not prove semantic entailment/i);
});
