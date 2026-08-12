const $ = (selector) => document.querySelector(selector);
const form = $("#search-form");
const drugInput = $("#drug");
const conditionInput = $("#condition");
const button = $("#search-button");
const loading = $("#loading");
const results = $("#results");
const errorBox = $("#error");
let evidence = null;
let reviewed = false;

const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
const list = value => Array.isArray(value) ? value : [];
const clean = (value, fallback = "Not reported") => typeof value === "string" && value.trim() ? value.trim() : fallback;

async function fetchJson(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} returned ${response.status}`);
  return response.json();
}

function normaliseTrial(study) {
  const protocol = study.protocolSection || {};
  const id = protocol.identificationModule || {};
  const status = protocol.statusModule || {};
  const design = protocol.designModule || {};
  const outcomes = protocol.outcomesModule || {};
  const sponsor = protocol.sponsorCollaboratorsModule || {};
  const nctId = clean(id.nctId);
  return {
    nctId,
    title: clean(id.briefTitle),
    phase: list(design.phases).map(value => value.replaceAll("_", " ")).join(" / ") || "Not applicable",
    status: clean(status.overallStatus).replaceAll("_", " "),
    enrollment: design.enrollmentInfo?.count ?? null,
    sponsor: clean(sponsor.leadSponsor?.name),
    primaryOutcomes: list(outcomes.primaryOutcomes).slice(0, 2).map(item => clean(item.measure)),
    hasResults: Boolean(study.hasResults || study.resultsSection),
    url: `https://clinicaltrials.gov/study/${encodeURIComponent(nctId)}`
  };
}

function normalisePublication(record, pmid) {
  return {
    pmid,
    title: clean(record.title),
    journal: clean(record.fulljournalname || record.source),
    date: clean(record.pubdate, "Date unavailable"),
    authors: list(record.authors).slice(0, 3).map(author => clean(author.name, "")).filter(Boolean),
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
  };
}

async function retrieveEvidence(drug, condition) {
  const trialsUrl = new URL("https://clinicaltrials.gov/api/v2/studies");
  trialsUrl.searchParams.set("query.intr", drug);
  if (condition) trialsUrl.searchParams.set("query.cond", condition);
  trialsUrl.searchParams.set("pageSize", "12");
  trialsUrl.searchParams.set("countTotal", "true");
  trialsUrl.searchParams.set("format", "json");

  const pubmedUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  pubmedUrl.searchParams.set("db", "pubmed");
  pubmedUrl.searchParams.set("term", condition ? `${drug} AND ${condition}` : drug);
  pubmedUrl.searchParams.set("retmode", "json");
  pubmedUrl.searchParams.set("retmax", "8");
  pubmedUrl.searchParams.set("sort", "relevance");
  pubmedUrl.searchParams.set("tool", "triallens");

  const [trialData, searchData] = await Promise.all([
    fetchJson(trialsUrl, "ClinicalTrials.gov"),
    fetchJson(pubmedUrl, "PubMed")
  ]);
  const ids = list(searchData.esearchresult?.idlist);
  let publications = [];
  if (ids.length) {
    const summaryUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi");
    summaryUrl.searchParams.set("db", "pubmed");
    summaryUrl.searchParams.set("id", ids.join(","));
    summaryUrl.searchParams.set("retmode", "json");
    summaryUrl.searchParams.set("tool", "triallens");
    const summaryData = await fetchJson(summaryUrl, "PubMed summaries");
    publications = ids.map(id => normalisePublication(summaryData.result?.[id] || {}, id));
  }
  const trials = list(trialData.studies).map(normaliseTrial);
  const counts = {
    totalTrials: Number(trialData.totalCount ?? trials.length),
    totalPublications: Number(searchData.esearchresult?.count ?? publications.length),
    completed: trials.filter(item => item.status === "COMPLETED").length,
    ongoing: trials.filter(item => ["RECRUITING","ACTIVE NOT RECRUITING","NOT YET RECRUITING","ENROLLING BY INVITATION"].includes(item.status)).length,
    lateStage: trials.filter(item => /PHASE\s?3|PHASE\s?4/i.test(item.phase)).length,
    withResults: trials.filter(item => item.hasResults).length
  };
  const readiness = counts.totalTrials === 0
    ? {level:"Insufficient evidence", rationale:"No matching registered trials were found for this drug–indication pair."}
    : counts.lateStage && counts.withResults
      ? {level:"Decision review ready", rationale:"Late-stage evidence and posted study results are available for structured expert review."}
      : counts.completed >= 2 || counts.totalPublications >= 5
        ? {level:"Evidence developing", rationale:"A meaningful evidence base exists, but maturity or result availability remains limited."}
        : {level:"Early evidence", rationale:"The retrieved evidence base is small or early-stage; progression conclusions would be premature."};
  return {query:{drug, condition:condition || "All indications"}, retrievedAt:new Date().toISOString(), trials, publications, counts, readiness, trialsUrl:trialsUrl.toString()};
}

function recordHtml(item, kind) {
  if (kind === "publication") return `<a class="record" href="${item.url}" target="_blank" rel="noreferrer"><div><small>PMID ${escapeHtml(item.pmid)} · ${escapeHtml(item.date)}</small><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.authors.join(", "))} · ${escapeHtml(item.journal)}</span></div><em>PubMed ↗</em></a>`;
  return `<a class="record" href="${item.url}" target="_blank" rel="noreferrer"><div><small>${escapeHtml(item.nctId)} · ${escapeHtml(item.sponsor)}</small><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.phase)} · ${escapeHtml(item.status)} · ${item.enrollment ? `${Number(item.enrollment).toLocaleString()} participants` : "Enrollment not reported"}</span></div><em>${item.hasResults ? "RESULTS" : "RECORD"} ↗</em></a>`;
}

function overviewHtml() {
  const c = evidence.counts;
  return `<div class="result-grid"><div><div class="metrics">
    <article class="card metric"><span>Registered trials</span><strong>${c.totalTrials.toLocaleString()}</strong><small>ClinicalTrials.gov</small></article>
    <article class="card metric"><span>Publications</span><strong>${c.totalPublications.toLocaleString()}</strong><small>PubMed matches</small></article>
    <article class="card metric"><span>Late-stage</span><strong>${c.lateStage}</strong><small>in retrieved records</small></article>
    <article class="card metric"><span>Posted results</span><strong>${c.withResults}</strong><small>in retrieved records</small></article></div>
    <article class="card panel"><div class="panel-title"><p class="eyebrow">PRIORITY RECORDS</p><h3>Most relevant registered studies</h3></div>${evidence.trials.slice(0,5).map(item => recordHtml(item,"trial")).join("") || '<div class="brief"><p>No matching trial records were returned.</p></div>'}</article></div>
    <aside class="card decision"><p class="eyebrow">DECISION READINESS</p><h3>${escapeHtml(evidence.readiness.level)}</h3><p>${escapeHtml(evidence.readiness.rationale)}</p><div class="signals"><div><span>Evidence volume</span><b>${c.totalTrials >= 5 ? "Established" : "Limited"}</b></div><div><span>Late-stage coverage</span><b>${c.lateStage ? "Present" : "Not found"}</b></div><div><span>Result availability</span><b>${c.withResults ? "Present" : "Limited"}</b></div><div><span>Human assessment</span><b>${reviewed ? "Reviewed" : "Required"}</b></div></div><button id="review-button" class="primary">${reviewed ? "✓ Evidence set accepted" : "Accept evidence set →"}</button><div class="boundary"><b>Decision support, not a decision</b><br>Evidence maturity does not establish efficacy, safety or benefit–risk.</div></aside></div>`;
}

function renderTab(tab = "overview") {
  document.querySelectorAll(".tabs button").forEach(item => item.classList.toggle("active", item.dataset.tab === tab));
  const view = $("#tab-view");
  if (tab === "overview") view.innerHTML = overviewHtml();
  if (tab === "trials") view.innerHTML = `<div class="card list-view"><div class="panel-title"><h3>Retrieved ClinicalTrials.gov records</h3><p>Showing the first ${evidence.trials.length} of ${evidence.counts.totalTrials.toLocaleString()} matches.</p></div>${evidence.trials.map(item => recordHtml(item,"trial")).join("") || '<div class="brief"><p>No records returned.</p></div>'}</div>`;
  if (tab === "literature") view.innerHTML = `<div class="card list-view"><div class="panel-title"><h3>Ranked PubMed literature</h3><p>Showing ${evidence.publications.length} of ${evidence.counts.totalPublications.toLocaleString()} matches.</p></div>${evidence.publications.map(item => recordHtml(item,"publication")).join("") || '<div class="brief"><p>No publications returned.</p></div>'}</div>`;
  if (tab === "brief") view.innerHTML = `<article class="card list-view brief"><p class="eyebrow">EXPORTABLE REVIEW</p><h3>Evidence landscape brief</h3><p><b>Asset:</b> ${escapeHtml(evidence.query.drug)}<br><b>Indication:</b> ${escapeHtml(evidence.query.condition)}<br><b>Readiness:</b> ${escapeHtml(evidence.readiness.level)}<br><b>Human review:</b> ${reviewed ? "Accepted" : "Pending"}</p><p>${evidence.counts.totalTrials.toLocaleString()} registered trials and ${evidence.counts.totalPublications.toLocaleString()} PubMed publications matched this search. The retrieved trial set contains ${evidence.counts.lateStage} late-stage record(s) and ${evidence.counts.withResults} record(s) with posted results.</p><button id="download-button" class="primary">Download brief ↓</button><div class="boundary">Review individual endpoints, outcome data, safety results, population relevance and study quality before reaching a progression conclusion.</div></article>`;
  $("#review-button")?.addEventListener("click", () => { reviewed = !reviewed; renderTab("overview"); });
  $("#download-button")?.addEventListener("click", downloadBrief);
}

function renderResults() {
  results.innerHTML = `<div class="result-head"><div><p class="eyebrow">LIVE EVIDENCE REVIEW</p><h2>${escapeHtml(evidence.query.drug)}</h2><p>${escapeHtml(evidence.query.condition)}</p></div><p>Retrieved ${new Date(evidence.retrievedAt).toLocaleString()}</p></div><div class="tabs"><button data-tab="overview" class="active">Overview</button><button data-tab="trials">Trials (${evidence.counts.totalTrials.toLocaleString()})</button><button data-tab="literature">Literature (${evidence.counts.totalPublications.toLocaleString()})</button><button data-tab="brief">Brief</button></div><div id="tab-view"></div>`;
  results.querySelectorAll(".tabs button").forEach(item => item.addEventListener("click", () => renderTab(item.dataset.tab)));
  renderTab();
}

function downloadBrief() {
  const c = evidence.counts;
  const body = `TRIALLENS AI — LIVE EVIDENCE LANDSCAPE\n\nAsset: ${evidence.query.drug}\nIndication: ${evidence.query.condition}\nEvidence readiness: ${evidence.readiness.level}\nHuman review: ${reviewed ? "Evidence set accepted" : "Pending"}\n\nClinicalTrials.gov records: ${c.totalTrials}\nPubMed publications: ${c.totalPublications}\nLate-stage records in retrieved set: ${c.lateStage}\nRecords with posted results: ${c.withResults}\n\nRegistry status and publication volume describe evidence maturity—not efficacy, safety, study quality or benefit–risk. Human review is required.`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([body], {type:"text/plain"}));
  link.download = `triallens-${evidence.query.drug.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function search(event) {
  event?.preventDefault();
  const drug = drugInput.value.trim();
  const condition = conditionInput.value.trim();
  errorBox.hidden = true;
  if (drug.length < 2) { errorBox.textContent = "Enter a drug or asset to search."; errorBox.hidden = false; return; }
  button.disabled = true; button.textContent = "Retrieving evidence…"; results.hidden = true; loading.hidden = false; reviewed = false;
  try { evidence = await retrieveEvidence(drug, condition); renderResults(); results.hidden = false; results.scrollIntoView({behavior:"smooth"}); }
  catch (error) { errorBox.textContent = `${error.message}. Please try again.`; errorBox.hidden = false; }
  finally { loading.hidden = true; button.disabled = false; button.textContent = "Analyse evidence →"; }
}

form.addEventListener("submit", search);
document.querySelectorAll(".examples button").forEach(item => item.addEventListener("click", () => { drugInput.value = item.dataset.drug; conditionInput.value = item.dataset.condition || ""; search(); }));
