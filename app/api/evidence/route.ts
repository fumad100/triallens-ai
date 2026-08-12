// External scientific APIs are narrowed field-by-field after retrieval.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnknownRecord = Record<string, any>;

const asArray = <T,>(value: T[] | undefined): T[] => Array.isArray(value) ? value : [];

function clean(value: unknown, fallback = "Not reported") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function fetchJson(url: string, label: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "TrialLens/1.0 (evidence-research-workspace)" },
  });
  if (!response.ok) throw new Error(`${label} returned ${response.status}`);
  return response.json() as Promise<UnknownRecord>;
}

async function fetchText(url: string, label: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "TrialLens/1.0 (evidence-research-workspace)" },
  });
  if (!response.ok) throw new Error(`${label} returned ${response.status}`);
  return response.text();
}

function decodeXml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ").trim();
}

function parsePubMedDetails(xml: string) {
  const details = new Map<string, { abstract: string; publicationTypes: string[] }>();
  const articles = xml.match(/<PubmedArticle\b[\s\S]*?<\/PubmedArticle>/g) ?? [];
  for (const article of articles) {
    const pmid = article.match(/<PMID\b[^>]*>(\d+)<\/PMID>/)?.[1];
    if (!pmid) continue;
    const abstract = [...article.matchAll(/<AbstractText\b([^>]*)>([\s\S]*?)<\/AbstractText>/g)]
      .map((match) => {
        const label = match[1].match(/Label="([^"]+)"/)?.[1];
        const text = decodeXml(match[2]);
        return label && text ? `${decodeXml(label)}: ${text}` : text;
      }).filter(Boolean).join("\n");
    const publicationTypes = [...article.matchAll(/<PublicationType\b[^>]*>([\s\S]*?)<\/PublicationType>/g)]
      .map((match) => decodeXml(match[1])).filter(Boolean);
    details.set(pmid, { abstract, publicationTypes });
  }
  return details;
}

function normaliseTrial(study: UnknownRecord) {
  const protocol = study.protocolSection ?? {};
  const id = protocol.identificationModule ?? {};
  const status = protocol.statusModule ?? {};
  const design = protocol.designModule ?? {};
  const outcomes = protocol.outcomesModule ?? {};
  const sponsor = protocol.sponsorCollaboratorsModule ?? {};
  const results = study.resultsSection ?? {};

  return {
    nctId: clean(id.nctId),
    title: clean(id.briefTitle),
    acronym: clean(id.acronym, ""),
    phase: asArray<string>(design.phases).map((phase) => phase.replaceAll("_", " ")).join(" / ") || "Not applicable",
    status: clean(status.overallStatus).replaceAll("_", " "),
    enrollment: design.enrollmentInfo?.count ?? null,
    sponsor: clean(sponsor.leadSponsor?.name),
    conditions: asArray<string>(protocol.conditionsModule?.conditions),
    primaryOutcomes: asArray<UnknownRecord>(outcomes.primaryOutcomes).slice(0, 2).map((item) => clean(item.measure)),
    hasResults: Boolean(study.hasResults || Object.keys(results).length),
    startDate: clean(status.startDateStruct?.date, ""),
    completionDate: clean(status.completionDateStruct?.date, ""),
    url: `https://clinicaltrials.gov/study/${clean(id.nctId)}`,
  };
}

function normalisePublication(record: UnknownRecord, uid: string, details?: { abstract: string; publicationTypes: string[] }) {
  const authors = asArray<UnknownRecord>(record.authors).slice(0, 3).map((author) => clean(author.name, "")).filter(Boolean);
  return {
    pmid: uid,
    title: clean(record.title),
    journal: clean(record.fulljournalname || record.source),
    date: clean(record.pubdate, "Date unavailable"),
    authors,
    abstract: details?.abstract ?? "",
    publicationTypes: details?.publicationTypes ?? [],
    url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const drug = url.searchParams.get("drug")?.trim() ?? "";
  const condition = url.searchParams.get("condition")?.trim() ?? "";

  if (drug.length < 2) {
    return Response.json({ error: "Enter a drug or asset to search." }, { status: 400 });
  }

  const trialsUrl = new URL("https://clinicaltrials.gov/api/v2/studies");
  trialsUrl.searchParams.set("query.intr", drug);
  if (condition) trialsUrl.searchParams.set("query.cond", condition);
  trialsUrl.searchParams.set("pageSize", "12");
  trialsUrl.searchParams.set("countTotal", "true");
  trialsUrl.searchParams.set("format", "json");

  const pubmedSearchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  pubmedSearchUrl.searchParams.set("db", "pubmed");
  pubmedSearchUrl.searchParams.set("term", condition ? `${drug} AND ${condition}` : drug);
  pubmedSearchUrl.searchParams.set("retmode", "json");
  pubmedSearchUrl.searchParams.set("retmax", "8");
  pubmedSearchUrl.searchParams.set("sort", "relevance");
  pubmedSearchUrl.searchParams.set("tool", "triallens");

  try {
    const [trialData, searchData] = await Promise.all([
      fetchJson(trialsUrl.toString(), "ClinicalTrials.gov"),
      fetchJson(pubmedSearchUrl.toString(), "PubMed"),
    ]);

    const ids = asArray<string>(searchData.esearchresult?.idlist);
    let publications: ReturnType<typeof normalisePublication>[] = [];

    if (ids.length) {
      const summaryUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi");
      summaryUrl.searchParams.set("db", "pubmed");
      summaryUrl.searchParams.set("id", ids.join(","));
      summaryUrl.searchParams.set("retmode", "json");
      summaryUrl.searchParams.set("tool", "triallens");
      const detailsUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi");
      detailsUrl.searchParams.set("db", "pubmed");
      detailsUrl.searchParams.set("id", ids.join(","));
      detailsUrl.searchParams.set("retmode", "xml");
      detailsUrl.searchParams.set("tool", "triallens");
      const [summaryData, detailsXml] = await Promise.all([
        fetchJson(summaryUrl.toString(), "PubMed summaries"),
        fetchText(detailsUrl.toString(), "PubMed abstracts"),
      ]);
      const details = parsePubMedDetails(detailsXml);
      publications = ids.map((uid) => normalisePublication(summaryData.result?.[uid] ?? {}, uid, details.get(uid)));
    }

    const trials = asArray<UnknownRecord>(trialData.studies).map(normaliseTrial);
    const completed = trials.filter((trial) => trial.status === "COMPLETED").length;
    const ongoing = trials.filter((trial) => ["RECRUITING", "ACTIVE NOT RECRUITING", "NOT YET RECRUITING", "ENROLLING BY INVITATION"].includes(trial.status)).length;
    const lateStage = trials.filter((trial) => /PHASE3|PHASE 3|PHASE4|PHASE 4/i.test(trial.phase)).length;
    const withResults = trials.filter((trial) => trial.hasResults).length;
    const totalTrials = Number(trialData.totalCount ?? trials.length);
    const totalPublications = Number(searchData.esearchresult?.count ?? publications.length);

    const readiness = totalTrials === 0
      ? { level: "Insufficient evidence", tone: "low", rationale: "No matching registered trials were found for this drug–indication pair." }
      : lateStage > 0 && withResults > 0
        ? { level: "Decision review ready", tone: "high", rationale: "Late-stage evidence and posted study results are available for structured expert review." }
        : completed >= 2 || totalPublications >= 5
          ? { level: "Evidence developing", tone: "medium", rationale: "A meaningful evidence base exists, but maturity or result availability remains limited." }
          : { level: "Early evidence", tone: "low", rationale: "The retrieved evidence base is small or early-stage; progression conclusions would be premature." };

    return Response.json({
      query: { drug, condition: condition || "All indications" },
      retrievedAt: new Date().toISOString(),
      counts: { totalTrials, totalPublications, completed, ongoing, lateStage, withResults },
      readiness,
      trials,
      publications,
      sources: [
        { name: "ClinicalTrials.gov", url: trialsUrl.toString() },
        { name: "PubMed", url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(condition ? `${drug} ${condition}` : drug)}` },
      ],
    }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Evidence services are temporarily unavailable.";
    return Response.json({ error: message }, { status: 502 });
  }
}
