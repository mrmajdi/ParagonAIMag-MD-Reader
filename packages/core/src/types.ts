export type Direction = 'auto' | 'rtl' | 'ltr';
export type ResolvedDirection = 'rtl' | 'ltr';

export interface Frontmatter {
  [key: string]: unknown;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
  children: TocItem[];
}

export interface DocStats {
  words: number;
  characters: number;
  readingMinutes: number;
  headings: number;
  links: number;
  images: number;
  codeBlocks: number;
  tables: number;
  diagrams: number;
  math: number;
}

export interface AlertLabels {
  note: string;
  tip: string;
  important: string;
  warning: string;
  caution: string;
}

export interface RenderOptions {
  /** Used as a fallback title and for relative-link resolution hints. */
  filename?: string;
  /** Override automatic document direction. */
  direction?: Direction;
  /** Disable HTML sanitisation only when you control the input completely. */
  sanitize?: boolean;
  /** Turn syntax highlighting off for very large documents. */
  highlight?: boolean;
  /** Localised labels for GitHub-style alert callouts. */
  alertLabels?: Partial<AlertLabels>;
}

export interface RenderResult {
  html: string;
  frontmatter: Frontmatter | null;
  toc: TocItem[];
  title: string;
  stats: DocStats;
  direction: ResolvedDirection;
  language: string;
  /** The text with YAML frontmatter removed. Useful for search indexing. */
  body: string;
}
