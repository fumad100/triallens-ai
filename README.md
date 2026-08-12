# TrialLens AI

TrialLens AI is an evidence-grounded drug-development decision workspace. It
retrieves live clinical-trial records from ClinicalTrials.gov and scientific
literature from PubMed, then presents a traceable evidence landscape for human
review.

## Live application

[Open TrialLens AI](https://triallens-ai-evidence.fmahamud16.chatgpt.site)

The hosted application may require sign-in. This repository is public, but the
application's hosting access policy is managed separately.

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

## Deployment note

TrialLens AI contains server-side API routes under `app/api/`. GitHub Pages is
static hosting and cannot run those routes directly. The source code is hosted
on GitHub, while the functional application is deployed on a compatible
server-side runtime.

## Responsible use

TrialLens AI is decision support, not medical advice or an autonomous clinical-
development decision maker. Registry status and publication volume do not by
themselves establish efficacy, safety, study quality, or benefit-risk.
