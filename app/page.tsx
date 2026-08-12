"use client";

import { useMemo, useState } from "react";

type Tab = "overview" | "trials" | "publications" | "gaps";

const trialRows = [
  { id: "NCT03668613", study: "GALACTIC-HF", phase: "Phase III", n: "8,256", outcome: "Met", tone: "positive", detail: "8% relative reduction in CV death or HF events", source: "ClinicalTrials.gov" },
  { id: "NCT02929329", study: "COSMIC-HF", phase: "Phase II", n: "448", outcome: "Met", tone: "positive", detail: "Improved systolic ejection time and stroke volume", source: "ClinicalTrials.gov" },
  { id: "NCT01786512", study: "ATOMIC-AHF", phase: "Phase II", n: "606", outcome: "Not met", tone: "neutral", detail: "No significant improvement in dyspnoea endpoint", source: "ClinicalTrials.gov" },
];

const criteria = [
  { label: "Efficacy", value: "Moderate", score: 68, color: "blue" },
  { label: "Safety", value: "Acceptable", score: 78, color: "green" },
  { label: "Trial quality", value: "High", score: 86, color: "green" },
  { label: "Consistency", value: "Mixed", score: 48, color: "amber" },
  { label: "Population coverage", value: "Limited", score: 42, color: "amber" },
  { label: "Competitive position", value: "Moderate", score: 61, color: "blue" },
];

function Icon({ name }: { name: string }) {
  const icons: Record<string, string> = { search: "⌕", grid: "▦", trial: "⌁", library: "▤", brief: "◫", clock: "◷", settings: "⚙", arrow: "→", check: "✓", alert: "!", cite: "↗", plus: "+", shield: "◆", download: "↓" };
  return <span className={`icon icon-${name}`} aria-hidden="true">{icons[name]}</span>;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("Omecamtiv mecarbil");
  const [condition, setCondition] = useState("Heart failure with reduced ejection fraction");
  const [selectedTrial, setSelectedTrial] = useState(0);
  const [reviewState, setReviewState] = useState<"pending" | "accepted" | "modified">("pending");
  const [toast, setToast] = useState("");

  const decisionLabel = useMemo(() => reviewState === "accepted" ? "Assessment accepted" : reviewState === "modified" ? "Assessment modified" : "Awaiting scientist review", [reviewState]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    notify(`Evidence workspace refreshed for ${query}`);
  }

  function exportBrief() {
    const brief = `TRIALLENS AI — DECISION BRIEF\n\nAsset: ${query}\nIndication: ${condition}\nRecommendation: CONDITIONAL PROGRESS\nConfidence: Moderate\n\nRationale\nEvidence suggests a modest reduction in heart-failure events with an acceptable safety profile. Progression should be conditional on resolving population coverage and long-term outcome gaps.\n\nEvidence gaps\n1. Limited evidence in adults aged 75 and over.\n2. Long-term mortality benefit remains uncertain.\n3. No head-to-head trial against current standard of care.\n\nHuman review: ${decisionLabel}\n\nTrialLens supports evidence review and does not make autonomous clinical or development decisions.`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([brief], { type: "text/plain" }));
    link.download = "triallens-decision-brief.txt";
    link.click();
    URL.revokeObjectURL(link.href);
    notify("Decision brief exported");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><span></span><span></span><span></span></div><div><strong>TrialLens</strong><small>AI</small></div></div>
        <nav aria-label="Primary navigation">
          <button className="nav-item active"><Icon name="grid" />Workspace</button>
          <button className="nav-item"><Icon name="trial" />Evidence</button>
          <button className="nav-item"><Icon name="library" />Library</button>
          <button className="nav-item"><Icon name="brief" />Decision briefs</button>
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item"><Icon name="clock" />Review history</button>
          <button className="nav-item"><Icon name="settings" />Settings</button>
          <div className="profile"><div className="avatar">AK</div><div><strong>Dr A. Khan</strong><span>Clinical development</span></div><button aria-label="Profile options">•••</button></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">DECISION WORKSPACE</span><h1>Evidence review</h1></div>
          <div className="top-actions"><span className="status-dot"><i></i>18 sources synced</span><button className="icon-button" aria-label="Notifications">♢<b></b></button></div>
        </header>

        <form className="search-panel" onSubmit={runSearch}>
          <div className="search-copy"><div className="search-kicker"><span className="spark">✦</span>New evidence question</div><p>Assess a drug and indication against the available clinical evidence.</p></div>
          <div className="search-row">
            <label><span>Drug or asset</span><div className="input-wrap"><Icon name="search" /><input value={query} onChange={e => setQuery(e.target.value)} aria-label="Drug or asset" /></div></label>
            <label className="condition-field"><span>Indication</span><div className="input-wrap"><input value={condition} onChange={e => setCondition(e.target.value)} aria-label="Indication" /><span className="chevron">⌄</span></div></label>
            <button className="primary" type="submit">Analyse evidence <Icon name="arrow" /></button>
          </div>
          <div className="source-tags"><span>Sources</span><button type="button"><i className="ctgov">+</i> ClinicalTrials.gov <Icon name="check" /></button><button type="button"><i className="pubmed">P</i> PubMed <Icon name="check" /></button><button type="button" className="add-source" onClick={() => notify("Additional evidence connectors are on the roadmap")}><Icon name="plus" /> Add source</button></div>
        </form>

        <div className="case-heading">
          <div><div className="case-title-row"><h2>{query || "Untitled asset"}</h2><span className="phase-pill">Phase III</span></div><p>{condition}</p></div>
          <div className="retrieved"><Icon name="check" /><div><span>Evidence retrieved</span><strong>12 Aug 2026, 14:32</strong></div></div>
        </div>

        <div className="tabbar" role="tablist">
          {(["overview", "trials", "publications", "gaps"] as Tab[]).map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "overview" ? "Overview" : item === "trials" ? "Clinical trials" : item === "publications" ? "Publications" : "Evidence gaps"}<span>{item === "overview" ? "" : item === "trials" ? "8" : item === "publications" ? "17" : "3"}</span></button>)}
        </div>

        {tab === "overview" && <div className="dashboard-grid">
          <section className="main-column">
            <div className="metric-grid">
              <article className="metric-card"><div className="metric-icon teal"><Icon name="trial" /></div><div><span>Clinical trials</span><strong>8</strong><small>3 completed · 2 ongoing</small></div></article>
              <article className="metric-card"><div className="metric-icon blue"><Icon name="library" /></div><div><span>Publications</span><strong>17</strong><small>12 primary · 5 reviews</small></div></article>
              <article className="metric-card"><div className="metric-icon violet">Ⅲ</div><div><span>Late-stage studies</span><strong>3</strong><small>Phase II/III</small></div></article>
              <article className="metric-card"><div className="metric-icon amber"><Icon name="alert" /></div><div><span>Evidence gaps</span><strong>3</strong><small>2 high priority</small></div></article>
            </div>

            <article className="card synthesis-card">
              <div className="card-header"><div><span className="section-label">EVIDENCE SYNTHESIS</span><h3>What the evidence shows</h3></div><span className="confidence"><i></i>Moderate confidence</span></div>
              <div className="synthesis-grid">
                <div className="synthesis-section"><div className="section-icon efficacy">↗</div><div><div className="title-line"><h4>Efficacy</h4><span>MODERATE</span></div><p>Two of three relevant trials met their primary endpoint. The pivotal study showed a modest reduction in heart-failure events, with greater effect in patients with lower baseline ejection fraction.<sup>[1–3]</sup></p><div className="key-result"><strong>8%</strong><span>relative reduction in CV death or<br/>heart-failure events</span></div></div></div>
                <div className="synthesis-section"><div className="section-icon safety">✓</div><div><div className="title-line"><h4>Safety</h4><span>ACCEPTABLE</span></div><p>Overall tolerability was comparable with placebo. No excess in ventricular arrhythmia or myocardial ischaemia was observed at therapeutic exposure.<sup>[1,4]</sup></p><div className="ae-tags"><span>Dizziness <b>7.7%</b></span><span>Hypotension <b>6.3%</b></span><span>Renal impairment <b>3.8%</b></span></div></div></div>
              </div>
            </article>

            <article className="card conflict-card">
              <div className="conflict-title"><div className="warning-mark">!</div><div><span className="section-label">EVIDENCE CONFLICT</span><h3>Acute symptom benefit remains uncertain</h3></div><span className="priority">HIGH PRIORITY</span></div>
              <p>The pivotal chronic heart-failure study showed improved clinical outcomes, while the acute heart-failure study did not meet its primary dyspnoea endpoint.</p>
              <div className="comparison"><div><span className="study-dot positive"></span><div><strong>GALACTIC-HF · NCT03668613</strong><p>Primary composite endpoint met</p></div><b>POSITIVE</b></div><div><span className="study-dot neutral"></span><div><strong>ATOMIC-AHF · NCT01786512</strong><p>Primary dyspnoea endpoint not met</p></div><b>NEUTRAL</b></div></div>
              <div className="explanation"><strong>Possible explanation</strong><span>Different disease setting</span><span>Different endpoint</span><span>Longer treatment exposure</span></div>
            </article>

            <article className="card trials-card">
              <div className="card-header"><div><span className="section-label">KEY EVIDENCE</span><h3>Pivotal and supporting trials</h3></div><button onClick={() => setTab("trials")}>View all 8 <Icon name="arrow" /></button></div>
              <div className="trial-table">
                {trialRows.map((trial, index) => <button className={selectedTrial === index ? "selected" : ""} key={trial.id} onClick={() => setSelectedTrial(index)}><span className={`study-dot ${trial.tone}`}></span><div className="trial-name"><strong>{trial.study}</strong><span>{trial.id}</span></div><span className="trial-phase">{trial.phase}</span><span className="trial-n">n = {trial.n}</span><span className={`outcome ${trial.tone}`}>{trial.outcome}</span><Icon name="cite" /></button>)}
              </div>
              <div className="trial-detail"><span>Selected finding</span><strong>{trialRows[selectedTrial].detail}</strong><a href={`https://clinicaltrials.gov/study/${trialRows[selectedTrial].id}`} target="_blank" rel="noreferrer">Open source <Icon name="cite" /></a></div>
            </article>
          </section>

          <aside className="decision-column">
            <article className="decision-card">
              <div className="decision-top"><span className="section-label">DECISION SUPPORT</span><div className="decision-badge"><span className="decision-icon">↗</span><div><small>RECOMMENDATION</small><strong>Conditional progress</strong></div></div><p>Promising evidence supports progression, provided key uncertainties are addressed in the next development stage.</p></div>
              <div className="criteria"><div className="criteria-heading"><h4>Decision criteria</h4><span>6 domains assessed</span></div>{criteria.map(item => <div className="criterion" key={item.label}><div><span>{item.label}</span><strong className={item.color}>{item.value}</strong></div><div className="bar"><i className={item.color} style={{ width: `${item.score}%` }}></i></div></div>)}</div>
              <div className="gaps"><div className="criteria-heading"><h4>Resolve before progression</h4><span>3 gaps</span></div><div className="gap"><b>1</b><div><strong>Long-term mortality benefit</strong><span>Outcome data remain immature beyond 24 months.</span></div><em>HIGH</em></div><div className="gap"><b>2</b><div><strong>Older adult population</strong><span>Limited evidence in patients aged 75 and over.</span></div><em>HIGH</em></div><div className="gap"><b>3</b><div><strong>Comparative effectiveness</strong><span>No head-to-head evidence versus current standard.</span></div><em className="medium">MED</em></div></div>
              <div className="human-review"><div><Icon name="shield" /><div><strong>Human review required</strong><span>{decisionLabel}</span></div></div>{reviewState === "pending" ? <div className="review-actions"><button onClick={() => setReviewState("modified")}>Modify</button><button className="accept" onClick={() => setReviewState("accepted")}><Icon name="check" /> Accept</button></div> : <button className="reset-review" onClick={() => setReviewState("pending")}>Reopen review</button>}</div>
            </article>
            <button className="export-button" onClick={exportBrief}><Icon name="download" /> Export decision brief <Icon name="arrow" /></button>
            <div className="disclaimer"><Icon name="shield" /><p><strong>Decision-support only</strong>TrialLens supports evidence review and does not autonomously make clinical or drug-development decisions.</p></div>
          </aside>
        </div>}

        {tab === "trials" && <section className="tab-content card"><span className="section-label">CLINICAL EVIDENCE</span><h3>All retrieved clinical trials</h3><p>Eight studies matched the asset and indication. The three studies most relevant to this decision are shown below.</p><div className="trial-table expanded">{trialRows.map((trial, index) => <button className={selectedTrial === index ? "selected" : ""} key={trial.id} onClick={() => setSelectedTrial(index)}><span className={`study-dot ${trial.tone}`}></span><div className="trial-name"><strong>{trial.study}</strong><span>{trial.id}</span></div><span className="trial-phase">{trial.phase}</span><span className="trial-n">n = {trial.n}</span><span className={`outcome ${trial.tone}`}>{trial.outcome}</span><Icon name="cite" /></button>)}</div></section>}
        {tab === "publications" && <section className="tab-content card"><span className="section-label">PUBLICATIONS</span><h3>17 linked scientific publications</h3><p>12 primary reports and 5 reviews were retrieved and ranked for relevance.</p><div className="publication-list"><article><span>01</span><div><strong>Cardiac Myosin Activation with Omecamtiv Mecarbil in Systolic Heart Failure</strong><p>Primary outcomes publication · New England Journal of Medicine · 2021</p></div><a href="https://pubmed.ncbi.nlm.nih.gov/?term=omecamtiv+mecarbil+GALACTIC-HF" target="_blank" rel="noreferrer">PubMed ↗</a></article><article><span>02</span><div><strong>Effects of Omecamtiv Mecarbil on Symptoms and Clinical Outcomes</strong><p>Secondary analysis · JAMA Cardiology · 2022</p></div><a href="https://pubmed.ncbi.nlm.nih.gov/?term=omecamtiv+mecarbil+heart+failure" target="_blank" rel="noreferrer">PubMed ↗</a></article></div></section>}
        {tab === "gaps" && <section className="tab-content card"><span className="section-label">EVIDENCE GAPS</span><h3>Questions to resolve next</h3><p>These gaps materially affect confidence in progression.</p><div className="gap-list"><article><em>HIGH</em><div><strong>Is the clinical benefit durable beyond 24 months?</strong><p>Extend outcome follow-up and pre-specify a mortality analysis.</p></div></article><article><em>HIGH</em><div><strong>Does benefit–risk remain favourable in adults aged 75+?</strong><p>Recruit a representative older cohort and report age-stratified safety.</p></div></article><article><em className="medium">MED</em><div><strong>How does the asset compare with current standard of care?</strong><p>Plan an active-comparator study or a robust indirect comparison.</p></div></article></div></section>}

        <footer><span><i></i>Grounded in retrieved evidence</span><span>TrialLens AI · Research workspace</span></footer>
      </section>
      {toast && <div className="toast" role="status"><Icon name="check" />{toast}</div>}
    </main>
  );
}
