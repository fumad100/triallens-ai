function safe(value: string | null, fallback = "Not provided") {
  return value?.trim().slice(0, 500) || fallback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const drug = safe(url.searchParams.get("drug"));
  const condition = safe(url.searchParams.get("condition"));
  const readiness = safe(url.searchParams.get("readiness"), "Pending expert review");
  const trials = Number(url.searchParams.get("trials") || 0);
  const publications = Number(url.searchParams.get("publications") || 0);
  const lateStage = Number(url.searchParams.get("lateStage") || 0);
  const results = Number(url.searchParams.get("results") || 0);
  const reviewed = url.searchParams.get("reviewed") === "true";
  const body = [
    "TRIALLENS AI — LIVE EVIDENCE LANDSCAPE", "", `Asset: ${drug}`,
    `Indication: ${condition}`, `Evidence readiness: ${readiness}`,
    `Human review: ${reviewed ? "Evidence set accepted" : "Pending"}`, "",
    "EVIDENCE SNAPSHOT", `ClinicalTrials.gov records: ${trials}`,
    `PubMed publications: ${publications}`, `Late-stage records in retrieved set: ${lateStage}`,
    `Records with posted results in retrieved set: ${results}`, "", "INTERPRETATION BOUNDARY",
    "Registry status and publication volume describe evidence maturity—not efficacy, safety, study quality or benefit–risk. Review individual endpoints, results and population relevance before reaching a progression conclusion.", "",
    "TrialLens is decision support only and does not provide medical advice or autonomously make clinical-development decisions.",
  ].join("\n");
  const filename = `triallens-${drug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "evidence"}.txt`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` } });
}
