"use client";

import { useState } from "react";

type Trial = { nctId:string; title:string; acronym:string; phase:string; status:string; enrollment:number|null; sponsor:string; primaryOutcomes:string[]; hasResults:boolean; url:string };
type Publication = { pmid:string; title:string; journal:string; date:string; authors:string[]; url:string };
type Evidence = {
  query:{ drug:string; condition:string };
  retrievedAt:string;
  counts:{ totalTrials:number; totalPublications:number; completed:number; ongoing:number; lateStage:number; withResults:number };
  readiness:{ level:string; tone:"high"|"medium"|"low"; rationale:string };
  trials:Trial[];
  publications:Publication[];
  sources:{ name:string; url:string }[];
};

const examples = [
  { drug:"Omecamtiv mecarbil", condition:"Heart failure with reduced ejection fraction" },
  { drug:"Donanemab", condition:"Early symptomatic Alzheimer disease" },
  { drug:"Osimertinib", condition:"EGFR-mutated non-small cell lung cancer" },
];

function Mark() { return <span className="logo-mark" aria-hidden="true"><i></i><i></i><b></b></span>; }
function Arrow() { return <span aria-hidden="true">→</span>; }

export default function Home() {
  const [drug,setDrug] = useState("");
  const [condition,setCondition] = useState("");
  const [evidence,setEvidence] = useState<Evidence|null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [tab,setTab] = useState<"overview"|"trials"|"literature"|"brief">("overview");
  const [review,setReview] = useState<"pending"|"accepted">("pending");

  async function analyse(event?:React.FormEvent) {
    event?.preventDefault();
    setError("");
    if (!drug.trim()) { setError("Enter a drug or asset to search."); return; }
    setLoading(true); setEvidence(null); setTab("overview"); setReview("pending");
    try {
      const response = await fetch(`/api/evidence?drug=${encodeURIComponent(drug)}&condition=${encodeURIComponent(condition)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Evidence retrieval failed.");
      setEvidence(data);
      window.setTimeout(() => document.getElementById("results")?.scrollIntoView({behavior:"smooth",block:"start"}), 50);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Evidence retrieval failed."); }
    finally { setLoading(false); }
  }

  function useExample(example:typeof examples[number]) { setDrug(example.drug); setCondition(example.condition); setError(""); }

  return <main>
    <div className="notice">Live evidence from official sources · Updated on every search</div>
    <header className="site-header">
      <a className="logo" href="/" aria-label="TrialLens AI home"><Mark/><span>TrialLens</span><sup>AI</sup></a>
      <nav><a href="/how-it-works">How it works</a><a href="/#sources">Sources</a><a href="/responsible-ai">Responsible AI</a></nav>
      <a className="header-action" href="/new-review">New review <Arrow/></a>
    </header>

    <section className="hero" id="top">
      <div className="hero-kicker"><span>✦</span> EVIDENCE-GROUNDED DEVELOPMENT DECISIONS</div>
      <h1>Ask a hard development question.<br/><em>Start with the evidence.</em></h1>
      <p className="hero-copy">Search authoritative clinical records and scientific literature in one traceable workspace—before forming a progression view.</p>
      <form className="question-box" onSubmit={analyse}>
        <div className="question-label"><span className="question-orbit"></span>Should this asset progress to the next development stage?</div>
        <div className="field-grid">
          <label><span>Drug or asset</span><input id="question" value={drug} onChange={e=>setDrug(e.target.value)} placeholder="e.g. Omecamtiv mecarbil" autoComplete="off"/></label>
          <label><span>Indication <em>optional</em></span><input value={condition} onChange={e=>setCondition(e.target.value)} placeholder="All indications" autoComplete="off"/></label>
          <button type="submit" disabled={loading}>{loading?<><i className="spinner"></i>Retrieving evidence</>:<>Analyse evidence <Arrow/></>}</button>
        </div>
        {error&&<div className="form-error" role="alert"><b>!</b>{error}</div>}
        <div className="source-line" id="sources"><span>Searching</span><b><i>+</i>ClinicalTrials.gov</b><b><i>P</i>PubMed</b><small>No account or API key required</small></div>
      </form>
      <div className="examples"><span>Try an example</span>{examples.map(example=><button key={example.drug} onClick={()=>useExample(example)}>{example.drug}<Arrow/></button>)}</div>
      <div className="trust-row"><span>✓ Traceable records</span><span>✓ Live source retrieval</span><span>✓ Human review required</span></div>
    </section>

    <section className="how" id="how">
      <div className="section-intro"><span>THE WORKFLOW</span><h2>From question to a reviewable evidence landscape</h2><p>Designed for clinical-development teams who need the source trail, not just an answer.</p></div>
      <div className="steps"><article><b>01</b><i>⌕</i><h3>Frame the question</h3><p>Enter an asset and optionally narrow the search to a specific indication.</p></article><article><b>02</b><i>◎</i><h3>Retrieve live evidence</h3><p>Clinical trial records and PubMed publications are retrieved directly from official APIs.</p></article><article><b>03</b><i>≋</i><h3>Review maturity</h3><p>Inspect phases, statuses, posted results, endpoints, sponsors and linked literature.</p></article><article><b>04</b><i>✓</i><h3>Apply expert judgement</h3><p>Accept the evidence landscape, document gaps and export a traceable review brief.</p></article></div>
    </section>

    {loading&&<section className="loading-state" aria-live="polite"><div className="scan-ring"><Mark/></div><span>Retrieving live evidence</span><h2>Building the evidence landscape</h2><div className="loading-sources"><b>ClinicalTrials.gov</b><i></i><b>PubMed</b></div><p>This usually takes a few seconds.</p></section>}

    {evidence&&<section className="results" id="results">
      <div className="result-head">
        <div><span className="mini-label">LIVE EVIDENCE REVIEW</span><h2>{evidence.query.drug}</h2><p>{evidence.query.condition}</p></div>
        <div className="retrieved"><span>Retrieved {new Date(evidence.retrievedAt).toLocaleString()}</span><button onClick={()=>analyse()}>↻ Refresh evidence</button></div>
      </div>
      <div className="result-tabs" role="tablist">{(["overview","trials","literature","brief"] as const).map(item=><button key={item} role="tab" aria-selected={tab===item} onClick={()=>setTab(item)}>{item}<span>{item==="trials"?evidence.counts.totalTrials:item==="literature"?evidence.counts.totalPublications:""}</span></button>)}</div>

      {tab==="overview"&&<div className="result-grid">
        <div className="result-main">
          <div className="metrics"><article><span>Registered trials</span><strong>{evidence.counts.totalTrials.toLocaleString()}</strong><small>ClinicalTrials.gov</small></article><article><span>Publications</span><strong>{evidence.counts.totalPublications.toLocaleString()}</strong><small>PubMed matches</small></article><article><span>Late-stage</span><strong>{evidence.counts.lateStage}</strong><small>in retrieved records</small></article><article><span>Posted results</span><strong>{evidence.counts.withResults}</strong><small>in retrieved records</small></article></div>
          <article className="panel maturity"><div className="panel-title"><div><span className="mini-label">EVIDENCE MATURITY</span><h3>What can be established from the records</h3></div><a href={evidence.sources[0].url} target="_blank" rel="noreferrer">Open source search ↗</a></div><div className="maturity-grid"><div><b>{evidence.counts.completed}</b><span>Completed studies</span></div><div><b>{evidence.counts.ongoing}</b><span>Ongoing studies</span></div><div><b>{evidence.counts.lateStage}</b><span>Phase III / IV</span></div><div><b>{evidence.counts.withResults}</b><span>Results posted</span></div></div><div className="grounding-note"><b>Important boundary</b><p>Registry status and publication volume describe evidence maturity—not efficacy, safety or benefit–risk. TrialLens does not infer outcomes that the retrieved metadata cannot support.</p></div></article>
          <article className="panel"><div className="panel-title"><div><span className="mini-label">PRIORITY RECORDS</span><h3>Most relevant registered studies</h3></div><button onClick={()=>setTab("trials")}>View records <Arrow/></button></div><div className="record-list">{evidence.trials.slice(0,5).map(trial=><a key={trial.nctId} href={trial.url} target="_blank" rel="noreferrer"><i className={trial.hasResults?"has-results":""}></i><div><small>{trial.nctId} · {trial.sponsor}</small><strong>{trial.title}</strong><span>{trial.phase} · {trial.status.replaceAll("_"," ")} · {trial.enrollment?`${trial.enrollment.toLocaleString()} participants`:"Enrollment not reported"}</span></div><em>{trial.hasResults?"RESULTS":"RECORD"}</em><b>↗</b></a>)}</div></article>
        </div>
        <aside className="decision-panel">
          <span className="mini-label">DECISION READINESS</span><div className={`readiness-icon ${evidence.readiness.tone}`}>{evidence.readiness.tone==="high"?"✓":evidence.readiness.tone==="medium"?"~":"!"}</div><small>AUTOMATED LANDSCAPE ASSESSMENT</small><h3>{evidence.readiness.level}</h3><p>{evidence.readiness.rationale}</p>
          <div className="signal-list"><div><span>Evidence volume</span><b>{evidence.counts.totalTrials>=5?"Established":"Limited"}</b></div><div><span>Late-stage coverage</span><b>{evidence.counts.lateStage?"Present":"Not found"}</b></div><div><span>Result availability</span><b>{evidence.counts.withResults?"Present":"Limited"}</b></div><div><span>Human assessment</span><b>{review==="accepted"?"Reviewed":"Required"}</b></div></div>
          <div className="review-box"><strong>Scientist review</strong><p>Confirm that these records are relevant before interpreting outcomes or making a progression decision.</p>{review==="pending"?<button onClick={()=>setReview("accepted")}>Accept evidence set <Arrow/></button>:<div className="accepted">✓ Evidence set accepted <button onClick={()=>setReview("pending")}>Undo</button></div>}</div>
          <div className="responsible-note"><b>Decision support, not a decision</b><span>TrialLens does not provide medical advice or autonomously make clinical-development decisions.</span></div>
        </aside>
      </div>}

      {tab==="trials"&&<div className="wide-panel panel"><div className="panel-title"><div><span className="mini-label">CLINICALTRIALS.GOV</span><h3>Retrieved clinical trial records</h3><p>Showing the first {evidence.trials.length} of {evidence.counts.totalTrials.toLocaleString()} matching records.</p></div><a href={evidence.sources[0].url} target="_blank" rel="noreferrer">View full source results ↗</a></div><div className="trial-table"><div className="table-head"><span>Study</span><span>Phase</span><span>Status</span><span>Enrollment</span><span>Results</span></div>{evidence.trials.map(trial=><a href={trial.url} target="_blank" rel="noreferrer" key={trial.nctId}><div><small>{trial.nctId} · {trial.sponsor}</small><strong>{trial.title}</strong>{trial.primaryOutcomes[0]&&<p>Primary outcome: {trial.primaryOutcomes[0]}</p>}</div><span>{trial.phase}</span><span>{trial.status}</span><span>{trial.enrollment?.toLocaleString()||"—"}</span><em className={trial.hasResults?"yes":""}>{trial.hasResults?"Posted":"Not posted"}</em></a>)}</div></div>}

      {tab==="literature"&&<div className="wide-panel panel"><div className="panel-title"><div><span className="mini-label">PUBMED</span><h3>Ranked scientific literature</h3><p>Showing the top {evidence.publications.length} of {evidence.counts.totalPublications.toLocaleString()} matching publications.</p></div><a href={evidence.sources[1].url} target="_blank" rel="noreferrer">View all on PubMed ↗</a></div><div className="publication-list">{evidence.publications.map((publication,index)=><a key={publication.pmid} href={publication.url} target="_blank" rel="noreferrer"><b>{String(index+1).padStart(2,"0")}</b><div><small>PMID {publication.pmid} · {publication.date}</small><strong>{publication.title}</strong><span>{publication.authors.join(", ")}{publication.authors.length?" · ":""}{publication.journal}</span></div><em>PubMed ↗</em></a>)}</div></div>}

      {tab==="brief"&&<div className="brief-layout"><article className="panel brief-card"><span className="mini-label">EXPORTABLE REVIEW</span><h2>Evidence landscape brief</h2><div className="brief-meta"><div><span>Asset</span><b>{evidence.query.drug}</b></div><div><span>Indication</span><b>{evidence.query.condition}</b></div><div><span>Readiness</span><b>{evidence.readiness.level}</b></div><div><span>Review status</span><b>{review==="accepted"?"Accepted by reviewer":"Pending"}</b></div></div><h3>Automated rationale</h3><p>{evidence.readiness.rationale}</p><h3>Evidence snapshot</h3><p>{evidence.counts.totalTrials.toLocaleString()} registered trials and {evidence.counts.totalPublications.toLocaleString()} PubMed publications matched this asset–indication pair. The retrieved trial set contains {evidence.counts.lateStage} late-stage record(s) and {evidence.counts.withResults} record(s) with posted results.</p><div className="brief-warning"><b>Interpretation required</b>Review individual endpoints, outcome data, safety results, population relevance and study quality before reaching a progression conclusion.</div></article><aside><a className="download" href={`/api/brief?drug=${encodeURIComponent(evidence.query.drug)}&condition=${encodeURIComponent(evidence.query.condition)}&readiness=${encodeURIComponent(evidence.readiness.level)}&trials=${evidence.counts.totalTrials}&publications=${evidence.counts.totalPublications}&lateStage=${evidence.counts.lateStage}&results=${evidence.counts.withResults}&reviewed=${review==="accepted"}`} download>↓ Download brief <Arrow/></a><p>Exports the live source counts and review status as a text brief.</p></aside></div>}
    </section>}
    <footer><a className="logo" href="/"><Mark/><span>TrialLens</span><sup>AI</sup></a><p>Evidence → context → human decision</p><span>Official source data remains subject to its source record.</span></footer>
  </main>;
}
