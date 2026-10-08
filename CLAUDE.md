# Working on SiteCheck AI

Instructions for an agent making changes here. Short on purpose: a bloated
CLAUDE.md gets skimmed and then ignored, which is worse than not having one.
Everything below is a rule that has already cost something to learn.

Design rationale lives in `README.md`. What the model may and may not decide
lives in `projeto/docs/AGENT_CHARTER.md`. Neither is repeated here.

---

## Invariants

Three rules. Breaking any of them is a defect regardless of whether tests pass.

**1. The model never produces a number.**

Every score, status, count and boolean comes from `analyzer.ts` and the
scorers in `projeto/backend/src/services/reports/`. The model only rewrites
those findings in plain language. If a change would let the model decide a
score, a severity or a pass/fail verdict, it is out of scope here — it
changes the product's trust model, and `AGENT_CHARTER.md` has to change first.

**2. Nothing from the analysed page reaches a prompt unescaped.**

The caller picks the URL, so `title`, `metaDescription` and
`vulnerableLibraries[]` are attacker-controlled. They pass through
`asUntrustedData` / `asUntrustedList` in
`projeto/backend/src/services/untrustedInput.ts`, which clamps length, strips
the characters that fake prompt structure, and wraps the value in `«…»` that
the system prompt declares to be data.

Adding a field to the prompt means deciding where it came from. Ours — a
number we computed — interpolates directly. Theirs — anything read off the
page — goes through the sanitiser. There is no third category.

**3. No injection fix without a fixture that fails first.**

Write the hostile case into `projeto/evals/fixtures.ts`, run the suite, watch
it go red, then fix. A fix committed without a red-first fixture is a fix
nobody can prove works, and the next refactor silently removes it.

---

## Workflow

**Red fixture first.** For any bug — injection, a missed finding, a
hallucinated one — reproduce it as a fixture before touching the code. The
fixture and the fix go in the same commit, so the diff shows both.

**`npm run check` before every commit.** Typecheck, sanitiser assertions,
offline evals. Takes seconds, needs no API key.

```bash
cd projeto
npm run check            # typecheck + test:sanitizer + eval
npm run eval             # evals only, rule-based path, offline
npm run eval:llm         # also calls the model; needs OPENAI_API_KEY, exits 2 without it
npm run test:sanitizer   # 21 structural assertions on untrusted input
npm run typecheck
```

**Bump `PROMPT_VERSION`** in `projeto/backend/src/services/openai.ts` whenever
the prompt text or the model changes. Traces carry it, so a shift in output
quality can be traced to the version that caused it. Changing the prompt
without bumping it makes that impossible after the fact.

**Run `eval:llm` before merging a prompt change**, and put the pass rate and
the cost in the commit message. The offline suite cannot tell you whether the
model still follows the new prompt.

---

## Do not

**Do not lower a threshold to make CI pass.** `projeto/evals/thresholds.json`
carries the reasoning for each number beside it. The rule-based path is at
100% because it is deterministic; injection resistance is at 100% because a
leak means the model took orders from a third-party website. If a change makes
a gate fail, the change is wrong until proven otherwise. If a threshold
genuinely should move, say why in the commit message.

**Do not add a keyword to the rubric to make one case pass.**
`projeto/evals/rubric.ts` matches topics by keyword, which is a known
approximation with documented limits. Widening a pattern to rescue a failing
case usually makes the rubric match indiscriminately, which breaks the
`mustNotFlag` side of other fixtures instead — and if it does not, it has
quietly stopped measuring anything. Fix the generator or the fixture's ground
truth.

**Do not crawl a live site inside an eval.** Fixtures are frozen `SiteData`
so a red run means the code regressed, not that someone redesigned their
homepage. Capture a new fixture by hand and pin it.

**Do not treat a silent fallback as success.** Every failure path resolves to
`generateFallbackAnalysis`, by design — but `trace.ts` records why in
`failureClass`. When output quality drops, read the traces before reading the
prompt.

---

## Checking your own work

A green suite means nothing until you have seen it go red. Both halves here
have been mutation-tested, and the results are in `README.md`: breaking HTTPS
detection drops the evals to 62%, neutralising `STRUCTURE_CHARS` takes the
sanitiser to 16/21. If you add a check, break the thing it guards and confirm
it fails before you claim it works.
