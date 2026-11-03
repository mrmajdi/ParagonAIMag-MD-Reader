import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import type { AlertLabels } from './types';

const ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const;
type AlertType = (typeof ALERT_TYPES)[number];

const DEFAULT_LABELS: AlertLabels = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

const MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;

export function alertsPlugin(md: MarkdownIt, labels?: Partial<AlertLabels>): void {
  const merged: AlertLabels = { ...DEFAULT_LABELS, ...labels };

  md.core.ruler.after('inline', 'manzar-alerts', (state) => {
    const tokens = state.tokens as Token[];

    for (let index = 0; index < tokens.length; index += 1) {
      const open = tokens[index];
      if (!open || open.type !== 'blockquote_open') continue;

      const inline = tokens[index + 2];
      if (!inline || inline.type !== 'inline') continue;

      const match = inline.content.match(MARKER);
      if (!match) continue;

      const type = match[1]?.toLowerCase() as AlertType;
      if (!ALERT_TYPES.includes(type)) continue;

      open.attrJoin('class', `md-alert md-alert-${type}`);
      open.attrSet('data-alert', type);
      open.attrSet('data-alert-label', merged[type]);

      const stripped = inline.content.slice(match[0].length);
      inline.content = stripped;

      const firstText = inline.children?.find((child) => child.type === 'text');
      if (firstText) {
        firstText.content = firstText.content.replace(MARKER, '');
      }
    }

    return true;
  });
}
