# TrialLens AI

TrialLens AI is an evidence-grounded drug-development decision workspace. It
retrieves live clinical-trial records from ClinicalTrials.gov and scientific
literature from PubMed, then presents a traceable evidence landscape for human
review.

## Live application

[Open TrialLens AI on GitHub Pages](https://fumad100.github.io/triallens-ai/)

## Features

- Search by drug or development asset, with an optional indication
- Live ClinicalTrials.gov and PubMed retrieval
- Evidence-maturity and decision-readiness summaries
- Trial and publication source links
- Human-review acknowledgement and downloadable evidence brief
- Dedicated How it works, Responsible AI, and New review pages

## Run locally

Node.js 22.13 or newer is required.

```bash
npm install
npm run dev
```

Then open the local URL printed in the terminal.

## Validation

```bash
npm test
npm run lint
```

## GitHub Pages deployment

The independent static deployment is in `docs/`. It queries the public
ClinicalTrials.gov and PubMed APIs directly from the visitor's browser, so it
does not require a ChatGPT-hosted runtime or application server.

## Responsible use

TrialLens AI is decision support, not medical advice or an autonomous clinical-
development decision maker. Registry status and publication volume do not by
themselves establish efficacy, safety, study quality, or benefit-risk.
