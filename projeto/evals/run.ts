/**
 * Eval runner.
 *
 * Two modes, by design:
 *
 *   offline (default)  Scores the rule-based analyser only. No API key, no
 *                      network, no cost, deterministic. This is what gates a
 *                      pull request.
 *   --llm              Also calls the model for every fixture and scores both
 *                      paths side by side. Run locally or on a schedule, never
 *                      on every push: it costs money and the model is not
 *                      deterministic, so a red run here is a signal to look,
 *                      not necessarily a bug.
 *
 * Scoring both paths against the same fixtures answers a question the project
 * could not answer before: how much does the model actually add over the
 * rules? If the gap is small for a category, the rules are the better choice
 * there — cheaper, instant, and incapable of being talked out of the answer.
 *
 * Exit code is 1 when a gate fails, so CI can depend on it.
 */

import { fixtures, Fixture } from './fixtures';
import { checkTopics, checkForbiddenStrings, checkStructure, TopicCheck } from './rubric';
import { generateFallbackAnalysis, analyzeWithTrace } from '../backend/src/services/openai';
import thresholds from './thresholds.json';

type PathName = 'fallback' | 'llm';

interface CaseResult {
  fixture: Fixture;
  path: PathName;
  text: string;
  topicChecks: TopicCheck[];
  forbiddenHits: string[];
  structureOk: boolean;
  structureReason: string | null;
  passed: boolean;
  latencyMs: number | null;
  costUsd: number | null;
}

function scoreCase(fixture: Fixture, path: PathName, text: string, latencyMs: number | null, costUsd: number | null): CaseResult {
  const topicChecks = checkTopics(text, fixture.expect.mustFlag, fixture.expect.mustNotFlag);
  const forbiddenHits = checkForbiddenStrings(text, fixture.expect.mustNotContain);
  const structure = checkStructure(text);
  const structureOk = structure.ok;

  // A forbidden string is always fatal: it means the injection worked.
  // structureOk was computed, printed and then dropped from `passed`, so the
  // documented structural floor enforced nothing: a generator that emitted
  // only findings, with no summary and no positives, still scored 100%.
  const passed = topicChecks.every((c) => c.ok) && forbiddenHits.length === 0 && structureOk;

  return { fixture, path, text, topicChecks, forbiddenHits, structureOk, structureReason: structure.reason, passed, latencyMs, costUsd };
}

async function runFallback(): Promise<CaseResult[]> {
  return fixtures.map((f) => {
    const started = Date.now();
    const text = generateFallbackAnalysis(f.data);
    return scoreCase(f, 'fallback', text, Date.now() - started, 0);
  });
}

let fellBack = 0;

async function runLlm(): Promise<CaseResult[]> {
  const out: CaseResult[] = [];
  for (const f of fixtures) {
    const { text, trace } = await analyzeWithTrace(f.data, { targetUrl: `https://${f.id}.eval.local` });
    if (trace.path !== 'llm') {
      // Scoring a fallback report as the llm path makes the gates meaningless:
      // with a revoked key every case falls back, the rule-based text never
      // echoes a payload, and the run reports 100% injection resistance having
      // made zero successful model calls.
      console.error(`  ! ${f.id}: fell back to rules (${trace.failureClass}: ${trace.failureMessage})`);
      fellBack++;
    }
    out.push(scoreCase(f, 'llm', text, trace.latencyMs, trace.estimatedCostUsd));
  }
  return out;
}

function pct(n: number, d: number): number {
  // An empty set used to score 100, so a renamed fixture set would report full
  // resistance against zero cases while the 100% gate stayed green.
  return d === 0 ? 0 : Math.round((n / d) * 100);
}

function reportPath(results: CaseResult[], path: PathName): { passRate: number; injectionPassRate: number } {
  const positives = results.filter((r) => r.fixture.kind === 'positive');
  const negatives = results.filter((r) => r.fixture.kind === 'negative');
  const injections = negatives.filter((r) => (r.fixture.expect.mustNotContain?.length ?? 0) > 0);

  console.log(`\n── ${path.toUpperCase()} ${'─'.repeat(52 - path.length)}`);
  for (const r of results) {
    const mark = r.passed ? 'PASS' : 'FAIL';
    const extras: string[] = [];
    if (!r.structureOk) extras.push('estrutura: ' + (r.structureReason ?? '?'));
    if (r.forbiddenHits.length) extras.push(`LEAKED: ${r.forbiddenHits.join(', ')}`);
    const cost = r.costUsd ? ` $${r.costUsd.toFixed(5)}` : '';
    console.log(`  ${mark}  ${r.fixture.id.padEnd(26)} ${String(r.latencyMs ?? '-').padStart(6)}ms${cost}${extras.length ? '  ← ' + extras.join('; ') : ''}`);
    if (!r.passed) {
      for (const c of r.topicChecks.filter((c) => !c.ok)) {
        console.log(`          expected ${c.topic} to be ${c.expected}, was ${c.actual ? 'present' : 'absent'}`);
      }
      console.log(`          intent: ${r.fixture.intent}`);
    }
  }

  const passRate = pct(results.filter((r) => r.passed).length, results.length);
  const injectionPassRate = pct(injections.filter((r) => r.passed).length, injections.length);
  console.log(
    `  overall ${passRate}%  (positives ${pct(positives.filter((r) => r.passed).length, positives.length)}%, ` +
    `negatives ${pct(negatives.filter((r) => r.passed).length, negatives.length)}%, ` +
    `injection ${injectionPassRate}%)`
  );
  return { passRate, injectionPassRate };
}

async function main() {
  const withLlm = process.argv.includes('--llm');

  console.log('SiteCheck AI — eval suite');
  console.log(`${fixtures.length} fixtures · mode: ${withLlm ? 'fallback + llm' : 'fallback only (offline)'}`);

  const fallbackResults = await runFallback();
  const fb = reportPath(fallbackResults, 'fallback');

  let failed = false;
  if (fb.passRate < thresholds.fallback.minPassRate) {
    console.error(`\nGATE FAILED: fallback pass rate ${fb.passRate}% < ${thresholds.fallback.minPassRate}%`);
    failed = true;
  }

  if (withLlm) {
    if (!process.env.OPENAI_API_KEY) {
      console.error('\n--llm requested but OPENAI_API_KEY is not set.');
      process.exit(2);
    }
    const llmResults = await runLlm();
    const llm = reportPath(llmResults, 'llm');

    const totalCost = llmResults.reduce((a, r) => a + (r.costUsd ?? 0), 0);
    console.log(`\n  run cost: $${totalCost.toFixed(4)}`);

    if (fellBack > 0) {
      console.error(`
GATE FAILED: ${fellBack} of ${fixtures.length} cases never reached the model. ` +
        'These gates measure the model path; a run where it never answered proves nothing.');
      failed = true;
    }
    if (llm.passRate < thresholds.llm.minPassRate) {
      console.error(`\nGATE FAILED: llm pass rate ${llm.passRate}% < ${thresholds.llm.minPassRate}%`);
      failed = true;
    }
    if (llm.injectionPassRate < thresholds.llm.minInjectionPassRate) {
      console.error(
        `\nGATE FAILED: injection resistance ${llm.injectionPassRate}% < ${thresholds.llm.minInjectionPassRate}%`
      );
      failed = true;
    }

    console.log('\n── LLM vs rules ' + '─'.repeat(44));
    console.log(`  fallback ${fb.passRate}%   llm ${llm.passRate}%   delta ${llm.passRate - fb.passRate > 0 ? '+' : ''}${llm.passRate - fb.passRate} points`);
  }

  console.log('');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('eval runner crashed:', err);
  process.exit(3);
});
