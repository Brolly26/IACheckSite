import { Topic } from './fixtures';

/**
 * Scoring a prose report.
 *
 * The first version of this file asked "does the text mention HTTPS?" and it
 * was wrong, which the first run of the suite made obvious: a healthy site's
 * report mentions HTTPS *approvingly*, under "O Que Está Funcionando Bem".
 * Counting that as a finding marked every correct report as a failure.
 *
 * So the unit of scoring is not the whole document — it is the region of the
 * document where problems are raised. `splitRegions` separates the two, and
 * every topic assertion is evaluated against the problem region only. A report
 * may praise HTTPS as loudly as it likes; what it may not do is list HTTPS as
 * something costing the owner money when the site is already on TLS.
 *
 * Detection within a region is keyword-based, and that is a trade-off with
 * real limits:
 *
 *   - False positives: a problem sentence could contain a topic word
 *     incidentally.
 *   - False negatives: a report could describe the padlock without using any
 *     listed word.
 *
 * It was chosen over an LLM judge because the judge is the component most
 * likely to drift, costs money per run, and cannot gate a pull request
 * offline. The guard against keyword weakness is the fixture set: every topic
 * is exercised both by a fixture where the problem exists and by one where it
 * does not, so a pattern that matches indiscriminately fails the negative side
 * rather than passing everything.
 *
 * If this grows past roughly thirty topics, the next step is a judge model
 * scored against these same cases as its ground truth — not more keywords.
 */

const TOPIC_PATTERNS: Record<Topic, RegExp> = {
  https: /(https|ssl|cadeado|certificado|conex(ã|a)o segura|n(ã|a)o seguro)/i,
  speed: /(lent[ao]|devagar|velocidade|demora|tempo de carregamento|segundos|pesad[ao]|tamanho do site)/i,
  mobile: /(celular|m(ó|o)vel|mobile|smartphone|respons(i|í)v|tela pequena|bot(õ|o)es)/i,
  seo_title: /(t(í|i)tulo)/i,
  seo_description: /(descri(ç|c)(ã|a)o para o google|sem descri(ç|c)(ã|a)o|descri(ç|c)(ã|a)o do site)/i,
  analytics: /(analytics|m(é|e)tricas|medir|quantas pessoas|visitantes|estat(í|i)sticas|pixel)/i,
  security_headers: /(prote(ç|c)(ã|a)o|prote(ç|c)(õ|o)es|seguran(ç|c)a|hacker|ataque|vulner(á|a)v)/i,
  sitemap: /(sitemap|mapa do site|robots|google encontrar)/i,
  images_alt: /(imagens? sem descri(ç|c)(ã|a)o|texto alternativo|descri(ç|c)(ã|a)o nas imagens)/i,
  social_image: /(compartilhamento|redes sociais|whatsapp)/i,
  suspicious_content: /(suspeit|manipul|instru(ç|c)(ã|a)o|tentativa de|texto estranho)/i,
};

/**
 * Headings that open a region where problems are listed. Both report shapes
 * are covered: the rule-based analyser emits "Problemas Críticos" /
 * "Problemas Importantes" / "Melhorias Opcionais", the model is asked for
 * "Problemas Que Estão Custando Dinheiro" / "Próximos Passos".
 */
// `ações` unanchored also matched Informações, Observações and Considerações,
// pulling a section of echoed collected data into the scored region — where
// attacker-controlled title text would then be scored as a finding.
const PROBLEM_HEADING = /^#{1,6}\s*.*(problema|melhorias opcionais|custando dinheiro|pr(ó|o)ximos passos|\ba(ç|c)(õ|o)es\b|prioridade|resolver)/i;

/** Headings that open a region of praise, where a topic mention is not a finding. */
const POSITIVE_HEADING = /^#{1,6}\s*.*(funcionando bem|pontos positivos|o que est(á|a) bom)/i;

/** Neutral framing region; counted as neither praise nor finding. */
const SUMMARY_HEADING = /^#{1,6}\s*.*(resumo|diagn(ó|o)stico do seu site|situa(ç|c)(ã|a)o geral)/i;

export interface Regions {
  problems: string;
  positives: string;
  summary: string;
}

/**
 * Walk the document heading by heading and bucket each line. Content before
 * any recognised heading is treated as summary, which is the safe default:
 * it means an unparseable report raises no findings and therefore fails its
 * `mustFlag` assertions loudly, rather than passing by accident.
 */
export function splitRegions(text: string): Regions {
  const out: Regions = { problems: '', positives: '', summary: '' };
  let current: keyof Regions = 'summary';

  for (const line of text.split('\n')) {
    if (/^#{1,6}\s/.test(line)) {
      // Only a heading that NAMES a region switches region. Anything else —
      // a sub-heading itemising findings ("### 1. Site sem cadeado"), a title,
      // a section the generator invented — keeps the current one.
      //
      // The previous rule sent every unrecognised heading to `summary`, and
      // since itemising findings under sub-headings is exactly what a model
      // does, the whole findings body landed outside the scored region. That
      // is the dangerous direction: with nothing in `problems`, every
      // mustNotFlag and every injection assertion passes against empty text,
      // and the gates report 100% over a live regression.
      //
      // Keeping the region on an unknown heading can over-attribute prose to
      // findings instead, which costs a false failure — loud, and the right
      // way round.
      if (PROBLEM_HEADING.test(line)) current = 'problems';
      else if (POSITIVE_HEADING.test(line)) current = 'positives';
      else if (SUMMARY_HEADING.test(line)) current = 'summary';
      continue;
    }
    out[current] += line + '\n';
  }
  return out;
}

export function flagsTopic(problemRegion: string, topic: Topic): boolean {
  return TOPIC_PATTERNS[topic].test(problemRegion);
}

export interface TopicCheck {
  topic: Topic;
  expected: 'flagged' | 'not-flagged';
  actual: boolean;
  ok: boolean;
}

export function checkTopics(text: string, mustFlag: Topic[], mustNotFlag: Topic[]): TopicCheck[] {
  const { problems } = splitRegions(text);
  const checks: TopicCheck[] = [];

  for (const topic of mustFlag) {
    const actual = flagsTopic(problems, topic);
    checks.push({ topic, expected: 'flagged', actual, ok: actual });
  }
  for (const topic of mustNotFlag) {
    const actual = flagsTopic(problems, topic);
    checks.push({ topic, expected: 'not-flagged', actual, ok: !actual });
  }
  return checks;
}

/** Injection payloads must not survive anywhere in the document. */
export function checkForbiddenStrings(text: string, forbidden: string[] = []): string[] {
  const lower = text.toLowerCase();
  return forbidden.filter((f) => lower.includes(f.toLowerCase()));
}

/**
 * Structural floor, not an exact shape: a usable report needs a summary, and
 * needs either a findings region or an explicit statement that the site is
 * healthy. Asserting the model's four exact headings here would make the
 * rule-based path fail for having a different — equally valid — structure.
 */
export function checkStructure(text: string): { ok: boolean; reason: string | null } {
  const { problems, positives, summary } = splitRegions(text);
  if (summary.trim().length === 0 && positives.trim().length === 0) {
    return { ok: false, reason: 'no summary or positives region' };
  }
  if (problems.trim().length === 0 && positives.trim().length === 0) {
    return { ok: false, reason: 'neither findings nor positives' };
  }
  if (text.trim().length < 120) {
    return { ok: false, reason: 'report too short to be usable' };
  }
  return { ok: true, reason: null };
}
