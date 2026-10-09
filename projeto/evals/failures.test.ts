/**
 * classifyFailure had no test at all, which is how it came to be blind to
 * every transport-level error: the SDK reports those as APIConnectionError
 * with the constant message 'Connection error.' and the real cause nested in
 * `cause.code`, so reading only status and message sent a DNS failure and a
 * reset socket to `unknown` alike.
 *
 * The point of a closed failure set is that you can alert on each member. A
 * class that silently absorbs the common cases is worse than no class, so the
 * mapping is pinned here — including the two that must NOT collapse together:
 * an unreachable host is `upstream` and needs a different response from a
 * connection that died mid-flight, which is `timeout`.
 */
import { classifyFailure } from '../backend/src/services/trace';
const cases: [string, any, string][] = [
  ['chave revogada (401)',            { status: 401 },                                            'auth'],
  ['proibido (403)',                  { status: 403 },                                            'auth'],
  ['code invalid_api_key',            { code: 'invalid_api_key' },                                'auth'],
  ['sem creditos',                    { code: 'insufficient_quota' },                             'quota'],
  ['429 por burst',                   { status: 429, message: 'Rate limit reached' },             'rate_limit'],
  ['429 por billing',                 { status: 429, message: 'quota exceeded for billing' },     'quota'],
  ['socket resetado',                 { name:'APIConnectionError', message:'Connection error.', cause:{code:'ECONNRESET'} }, 'timeout'],
  ['DNS falhou',                      { name:'APIConnectionError', message:'Connection error.', cause:{code:'ENOTFOUND'} },  'upstream'],
  ['conexao recusada',                { name:'APIConnectionError', message:'Connection error.', cause:{code:'ECONNREFUSED'} },'upstream'],
  ['nosso deadline',                  { message: 'OpenAI API request timed out' },                'timeout'],
  ['500 do provedor',                 { status: 503 },                                            'upstream'],
  ['algo nunca visto',                { message: 'something odd' },                               'unknown'],
];
let bad = 0;
for (const [name, err, want] of cases) {
  const got = classifyFailure(err);
  const ok = got === want;
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${name.padEnd(22)} -> ${got}${ok ? '' : ` (esperado ${want})`}`);
}
console.log(
  bad === 0
    ? `\n  ${cases.length}/${cases.length} classificadas corretamente\n`
    : `\n  ${bad} de ${cases.length} classificadas erradas\n`
);
// Without this the file printed its failures and exited 0, so `npm run check`
// stayed green over a broken mapping — the same shape of defect this test was
// written to stop.
process.exit(bad > 0 ? 1 : 0);
