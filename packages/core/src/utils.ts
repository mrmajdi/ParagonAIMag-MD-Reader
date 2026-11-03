const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE[char] ?? char);
}

export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const RTL_RANGE = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/;
const LATIN_RANGE = /[A-Za-z\u00c0-\u024f]/;
const STRONG_CHAR = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefcA-Za-z\u00c0-\u024f\u0400-\u04ff\u0900-\u097f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0e00-\u0e7f\u0370-\u03ff]/;

/**
 * A pragmatic, dependency-free bidi heuristic. We use the first strong
 * character (the same rule browsers use for dir="auto"), which behaves well
 * for mixed Persian/English documents: the title decides the page direction,
 * and every block can still opt out with explicit `dir` frontmatter.
 */
export function detectDirection(text: string): 'rtl' | 'ltr' {
  const plain = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/[#>*_~\-|:]/g, ' ');
  for (const char of plain) {
    if (RTL_RANGE.test(char)) return 'rtl';
    if (LATIN_RANGE.test(char)) return 'ltr';
    if (STRONG_CHAR.test(char)) return 'ltr';
  }
  return 'ltr';
}

const PERSIAN_SPECIFIC = /[\u067e\u0686\u0698\u06af\u06cc\u06a9]/; // پ چ ژ گ ی ک
const URDU_SPECIFIC = /[\u0679\u0688\u0691\u06ba\u06d2\u06c1]/; // ٹ ڈ ڑ ں ے ہ
const HEBREW = /[\u0590-\u05ff]/;
const ARABIC = /[\u0600-\u06ff]/;
const CYRILLIC = /[\u0400-\u04ff]/;
const DEVANAGARI = /[\u0900-\u097f]/;
const HIRAGANA_KATAKANA = /[\u3040-\u30ff]/;
const HAN = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const HANGUL = /[\uac00-\ud7af]/;
const THAI = /[\u0e00-\u0e7f]/;
const GREEK = /[\u0370-\u03ff]/;
const LATIN = /[A-Za-z\u00c0-\u024f]/;

/**
 * Script-based language detection. It is intentionally conservative: it only
 * answers when the script is distinctive. For Latin-script languages the
 * frontmatter `lang` field wins; otherwise we return "und" and let the UI
 * fall back to the browser language.
 */
export function detectLanguage(text: string): string {
  if (PERSIAN_SPECIFIC.test(text)) return 'fa';
  if (URDU_SPECIFIC.test(text)) return 'ur';
  if (HEBREW.test(text)) return 'he';
  if (ARABIC.test(text)) return 'ar';
  if (HIRAGANA_KATAKANA.test(text)) return 'ja';
  if (HANGUL.test(text)) return 'ko';
  if (HAN.test(text)) return 'zh';
  if (DEVANAGARI.test(text)) return 'hi';
  if (THAI.test(text)) return 'th';
  if (GREEK.test(text)) return 'el';
  if (CYRILLIC.test(text)) return 'ru';
  if (LATIN.test(text)) return 'en';
  return 'und';
}

/**
 * Word count that treats CJK characters as words instead of counting a whole
 * paragraph as one token. Good enough for reading-time estimates.
 */
export function countWords(text: string): number {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 0;
  const cjkMatches = clean.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g);
  const cjk = cjkMatches ? cjkMatches.length : 0;
  const rest = clean.replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g, ' ');
  const words = rest.split(/\s+/).filter(Boolean).length;
  return words + cjk;
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / 200));
}
