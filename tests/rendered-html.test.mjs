import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the TrialLens evidence workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /TrialLens AI/);
  assert.match(html, /Ask a hard development question/);
  assert.match(html, /Analyse evidence/);
  assert.match(html, /ClinicalTrials\.gov/);
  assert.match(html, /Human review required/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/i);
});

test("server-renders the standalone information and review pages", async () => {
  const [how, responsible, review] = await Promise.all([
    render("/how-it-works"), render("/responsible-ai"), render("/new-review"),
  ]);
  assert.equal(how.status, 200);
  assert.equal(responsible.status, 200);
  assert.equal(review.status, 200);
  assert.match(await how.text(), /Six stages, with a human decision at the end/);
  assert.match(await responsible.text(), /Six commitments for evidence AI/);
  assert.match(await review.text(), /Analyse evidence/);
});
