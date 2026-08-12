import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How TrialLens works — TrialLens AI", description: "How TrialLens turns a drug-development question into a traceable evidence landscape." };

function Mark(){return <span className="logo-mark" aria-hidden="true"><i></i><i></i><b></b></span>}

const stages=[
  ["01","Frame the review question","Start with a drug or development asset. Add an indication when the decision is indication-specific. A broad drug-only search maps the landscape; an indication narrows relevance."],
  ["02","Retrieve authoritative records","TrialLens queries the modern ClinicalTrials.gov API for registered studies and NCBI E-utilities for PubMed literature. It does not rely on a hidden, hand-curated demo dataset."],
  ["03","Normalize the evidence landscape","Records are structured into study identifiers, phases, recruitment status, enrollment, sponsors, primary endpoints, result availability and linked publications."],
  ["04","Assess evidence maturity","The workspace summarizes volume, late-stage coverage, completed studies and posted results. These signals describe maturity—not whether a drug works or is safe."],
  ["05","Review source records","Scientists inspect trial and publication links, remove irrelevant matches, examine endpoints and populations, and identify evidence that is missing, conflicting or immature."],
  ["06","Document human judgement","The reviewer accepts the evidence set and exports a source-traceable brief. Progression conclusions remain the responsibility of qualified development teams and governance bodies."],
];

export default function HowItWorks(){return <main className="info-page">
  <div className="notice">Live evidence from official sources · Updated on every search</div>
  <header className="site-header"><Link className="logo" href="/"><Mark/><span>TrialLens</span><sup>AI</sup></Link><nav><Link className="active" href="/how-it-works">How it works</Link><Link href="/#sources">Sources</Link><Link href="/responsible-ai">Responsible AI</Link></nav><Link className="header-action" href="/new-review">New review <span>→</span></Link></header>
  <section className="info-hero"><span className="mini-label">HOW IT WORKS</span><h1>From a development question<br/>to a <em>source-traceable review.</em></h1><p>TrialLens is an evidence-retrieval and review workspace. It helps teams establish what evidence exists, where it came from and what still needs expert interpretation.</p><Link className="info-cta" href="/new-review">Start a new review <span>→</span></Link></section>
  <section className="process-page"><div className="process-intro"><span className="mini-label">THE REVIEW PIPELINE</span><h2>Six stages, with a human decision at the end</h2></div><div className="process-list">{stages.map(([n,title,copy])=><article key={n}><b>{n}</b><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>
  <section className="boundary-band"><div><span className="mini-label">WHAT THE CURRENT VERSION DOES</span><h2>Live landscape discovery</h2><ul><li>Searches registered trials and PubMed literature</li><li>Structures source metadata consistently</li><li>Links every displayed record to its source</li><li>Flags evidence maturity and result availability</li></ul></div><div><span className="mini-label">WHAT STILL REQUIRES EXPERT REVIEW</span><h2>Scientific interpretation</h2><ul><li>Endpoint results and clinical meaningfulness</li><li>Risk–benefit and safety interpretation</li><li>Bias, quality and population relevance</li><li>Progress, hold or stop recommendations</li></ul></div></section>
  <section className="source-method"><div><span className="mini-label">SOURCE METHOD</span><h2>Why the provenance matters</h2><p>ClinicalTrials.gov records can be updated and may not contain complete outcome data. PubMed identifies indexed literature but does not by itself establish study quality. TrialLens keeps the original record one click away so reviewers can verify context and interpretation.</p></div><div className="source-cards"><a href="https://clinicaltrials.gov/data-api/about-api" target="_blank" rel="noreferrer"><b>ClinicalTrials.gov</b><span>Modern REST API and study-record structure</span><em>Official documentation ↗</em></a><a href="https://www.ncbi.nlm.nih.gov/home/develop/api/" target="_blank" rel="noreferrer"><b>NCBI E-utilities</b><span>Public API access to PubMed and other Entrez databases</span><em>Official documentation ↗</em></a></div></section>
  <footer><Link className="logo" href="/"><Mark/><span>TrialLens</span><sup>AI</sup></Link><p>Evidence → context → human decision</p><span>Decision-support only</span></footer>
  </main>}
