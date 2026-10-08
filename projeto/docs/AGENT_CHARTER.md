# Agent charter — SiteCheck AI analysis step

What the model is allowed to decide, what it is not, and what happens at the
boundary. Written before changing the prompt, and updated with it.

---

## Job

Turn a fixed set of deterministic findings into a report a non-technical
business owner can act on.

## Authority

**The model may:**

- choose wording, ordering and emphasis within the four required sections
- decide how to explain a finding's business impact
- decide which findings to lead with, given the data

**The model may not:**

- produce, change or contradict any score, status or boolean. Every number in
  the report comes from `analyzer.ts` and the per-category scorers, and is
  rendered outside the model's output.
- invent a finding that the collected data does not support
- suppress a finding the data does support
- act on any text originating from the analysed page

The last one is the security boundary. Everything inside `«…»` in the prompt
is third-party content. The system prompt states this; `untrustedInput.ts`
enforces the structure; `evals/` asserts the behaviour.

## Inputs, and which are trusted

| Input | Source | Trusted |
|---|---|---|
| scores, booleans, counts, timings | our own collector and scorers | yes |
| `title`, `metaDescription` | the analysed page | **no** — sanitised and delimited |
| `vulnerableLibraries[]` | detected on the analysed page | **no** — sanitised and delimited |
| target URL | API caller | host only reaches the trace; never the prompt |

## Thresholds

| Gate | Value | Why |
|---|---|---|
| rule-based eval pass rate | 100% | deterministic; anything less is a regression |
| model eval pass rate | 85% | temperature 0.7 — wording variance must not fail a build |
| injection resistance | 100% | a leak means the model obeyed a third-party site |
| model call deadline | 30s | past this a user assumes the product is broken |
| field length cap | 200 chars | fits real titles, cannot flood the context |

## Degradation

There is no error state exposed to the user. Every failure resolves to the
rule-based report, with the reason recorded as `failureClass` in the trace.

| Condition | Behaviour |
|---|---|
| no API key | fallback, `failureClass: auth` |
| 401 / revoked key | fallback, `auth` |
| quota or billing | fallback, `quota` |
| 429 | fallback, `rate_limit` |
| >30s | fallback, `timeout` |
| 200 with empty content | fallback, `empty_response` |
| 5xx or anything else | fallback, `upstream` / `unknown` |

Accepted consequence: a silent fallback is invisible to the user, who gets a
blunter report without being told why. That is the right default for this
product — a business owner wants the audit, not an incident report — but it is
the reason `path` is in every trace. Monitoring is the only way this is
noticed, so a sustained rise in `"path":"fallback"` is the signal to alert on.

## Human review

None today, and that is a deliberate scope decision rather than an oversight:
the output is advisory, read by the site's own owner, and contains no numbers
the model produced.

Review would become mandatory if any of these changed:

- the model gained authority over a score or a pass/fail verdict
- output were sent to a third party rather than the requester
- the tool made changes to a site instead of describing it

## Release checklist

Before merging a change to the prompt, the model, or `untrustedInput.ts`:

- [ ] `npm run check` green
- [ ] `PROMPT_VERSION` bumped if prompt text or model changed
- [ ] `npm run eval:llm` run locally at least once; pass rate and cost recorded
      in the PR
- [ ] injection cases at 100%
- [ ] new failure mode, if any, added as a fixture **before** the fix
- [ ] threshold changes justified in the commit message
- [ ] this charter updated if authority or degradation changed

## Open questions

- The rubric cannot tell a well-explained finding from a technically-correct
  but useless one. Measuring usefulness needs either a judge model or real
  user feedback; neither exists yet.
- No production traffic is sampled back into the fixtures, so the suite tests
  the failure modes I imagined, not the ones real sites produce.
