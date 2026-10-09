/**
 * One structured record per analysis run.
 *
 * The question this exists to answer is "why did that run behave that way?",
 * asked hours later, from logs alone. Before this, a run that silently fell
 * back to the rule-based analyser looked identical in the logs to a run where
 * the model answered: both just printed a line and returned prose.
 *
 * Deliberately not a tracing vendor. The useful unit here is one record per
 * request with the fields below; shipping that as a JSON line to stdout means
 * any log aggregator can read it, and swapping in OpenTelemetry later is a
 * change in this file only. The cost of a vendor SDK is not justified until
 * there is more than one service to correlate across.
 */

export type AnalysisPath = 'llm' | 'fallback';

export type FailureClass =
  | 'auth'           // bad or missing key: 401
  | 'quota'          // insufficient_quota / billing
  | 'rate_limit'     // 429
  | 'timeout'        // our own deadline fired
  | 'empty_response' // API returned 200 with no usable content
  | 'upstream'       // any other API-side error
  | 'unknown';

export interface AnalysisTrace {
  event: 'analysis';
  runId: string;
  timestamp: string;
  /** Host only — never the full URL, which can carry tokens in query strings. */
  targetHost: string;
  promptVersion: string;
  model: string | null;
  path: AnalysisPath;
  /** Why we ended up on the fallback path, when we did. */
  failureClass: FailureClass | null;
  failureMessage: string | null;
  latencyMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  /** USD, derived from token counts and the model's published rate. */
  estimatedCostUsd: number | null;
  outputChars: number;
}

/** Published per-million-token rates. Update alongside any model change. */
const PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
};

export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number | null {
  const rate = PRICING_USD_PER_MTOK[model];
  if (!rate) return null;
  const usd = (promptTokens / 1_000_000) * rate.input + (completionTokens / 1_000_000) * rate.output;
  return Number(usd.toFixed(6));
}

/**
 * Map a thrown error onto a stable class. Incident response starts with
 * "which of these is it?", and a free-text message does not answer that
 * reliably enough to alert on.
 */
export function classifyFailure(error: any): FailureClass {
  const status = error?.status ?? error?.response?.status;
  const message = String(error?.message ?? '');
  // The SDK reports a connection failure as APIConnectionError whose message
  // is the useless constant 'Connection error.', with the real cause nested in
  // `cause.code`; and it carries its own `code` ('insufficient_quota',
  // 'rate_limit_exceeded', 'invalid_api_key') that the message does not
  // repeat. Reading only status and message sent every DNS blip and reset
  // socket to `unknown`, which defeats the point of having a closed set.
  const code = String(error?.code ?? '');
  const causeCode = String(error?.cause?.code ?? '');

  if (code === 'invalid_api_key' || status === 401 || status === 403) return 'auth';
  if (/incorrect api key|invalid_api_key/i.test(message)) return 'auth';

  if (code === 'insufficient_quota' || /insufficient_quota/i.test(message)) return 'quota';
  if (status === 429 && /quota|billing/i.test(message)) return 'quota';

  if (code === 'rate_limit_exceeded' || status === 429) return 'rate_limit';

  if (/^(ETIMEDOUT|ECONNRESET|ECONNABORTED|EPIPE)$/.test(causeCode)) return 'timeout';
  if (/timed out|timeout|ETIMEDOUT|ECONNRESET|aborted/i.test(message)) return 'timeout';

  // A name that cannot be resolved or refused the connection is upstream being
  // unreachable, not a timeout: different alert, different response.
  if (/^(ENOTFOUND|EAI_AGAIN|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH)$/.test(causeCode)) return 'upstream';
  if (typeof status === 'number') return 'upstream';
  if (error?.name === 'APIConnectionError') return 'upstream';

  return 'unknown';
}

/** Host only, and never throws on a malformed URL. */
export function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'invalid-url';
  }
}

export function newRunId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Emit as a single JSON line. Collectors parse it; humans can still grep it.
 * Writing to stdout rather than a file keeps the container stateless.
 */
export function emitTrace(trace: AnalysisTrace): void {
  process.stdout.write(JSON.stringify(trace) + '\n');
}
