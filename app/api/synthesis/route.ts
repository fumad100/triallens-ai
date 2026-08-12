import { challengeSchema, compactEvidence, groundingReport, synthesisSchema, validateCitationIds } from "@/lib/synthesis.mjs";

const SYSTEM_PROMPT = `You are an evidence-synthesis assistant for drug-development review.
Use only the evidence supplied in this request. Never browse or introduce outside knowledge.
Do not infer efficacy, safety, statistical significance, or benefit-risk unless explicitly stated in a supplied publication abstract.
A trial's phase, status, primary-outcome name, or hasResults flag does not reveal its result.
Every substantive evidence finding or challenge must cite at least one supplied NCT ID or PMID.
If evidence is insufficient, say so. Distinguish observed evidence, interpretation, uncertainty, and missing evidence.
Do not make an autonomous progression decision. Use cautious scientific language.`;

type OpenAIOutput = { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };

function outputText(response: OpenAIOutput) {
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("The model returned no structured output.");
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1_000_000) return Response.json({ error: "Evidence payload is too large." }, { status: 413 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "AI synthesis is not configured on this deployment." }, { status: 503 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const mode = body.mode === "challenge" ? "challenge" : "synthesis";
    const evidence = compactEvidence(body.evidence);
    if (!evidence.drug || (!evidence.trials.length && !evidence.publications.length)) {
      return Response.json({ error: "Retrieved evidence is required before synthesis." }, { status: 400 });
    }

    const previousSynthesis = mode === "challenge" ? body.previousSynthesis ?? null : null;
    if (mode === "challenge" && !previousSynthesis) return Response.json({ error: "Generate a synthesis before challenging it." }, { status: 400 });

    const schema = mode === "challenge" ? challengeSchema : synthesisSchema;
    const task = mode === "challenge"
      ? "Act as a critical scientific reviewer. Identify unsupported assumptions, population or outcome mismatch, immature evidence, missing comparators, small samples, absent posted results, conflicting records, and gaps in the previous synthesis."
      : "Synthesize what the supplied records can and cannot support. Separate supportive, challenging, and conflicting evidence, then identify gaps, uncertainties, confidence, and questions for expert review.";

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
        store: false,
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify({ task, evidence, previousSynthesis }) },
        ],
        text: { format: { type: "json_schema", name: mode === "challenge" ? "evidence_challenge" : "evidence_synthesis", strict: true, schema } },
      }),
    });
    if (!response.ok) throw new Error(`OpenAI Responses API returned ${response.status}`);
    const modelResponse = await response.json() as OpenAIOutput;
    const result = JSON.parse(outputText(modelResponse));
    const validation = validateCitationIds(result, evidence, mode);
    if (!validation.valid) {
      return Response.json({ error: "The synthesis contained citations outside the retrieved evidence set.", invalidCitationIds: validation.invalid.map((item: { sourceId?: string }) => item.sourceId) }, { status: 502 });
    }
    return Response.json({ mode, result, grounding: groundingReport(result, evidence, mode), model: process.env.OPENAI_MODEL ?? "gpt-5-mini", generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Evidence synthesis failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
