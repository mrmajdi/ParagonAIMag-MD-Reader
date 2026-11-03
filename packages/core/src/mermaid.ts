import type MarkdownIt from 'markdown-it';
import { escapeHtml } from './utils';

/**
 * Mermaid is rendered by the host application (browser or webview), because
 * the library is large and theme-aware. The core only emits a safe container
 * with the diagram source; when JavaScript is unavailable the source is still
 * readable inside a native <details> element.
 */
export function installMermaidRenderer(md: MarkdownIt): void {
  const defaultFence = md.renderer.rules.fence;

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (!token) return '';

    const info = (token.info || '').trim();
    const language = info.split(/\s+/)[0]?.toLowerCase() ?? '';

    if (language !== 'mermaid') {
      return defaultFence
        ? defaultFence(tokens, idx, options, env, self)
        : self.renderToken(tokens, idx, options);
    }

    const source = token.content.replace(/\n$/, '');
    return [
      '<div class="md-mermaid" data-mermaid dir="ltr">',
      '<div class="md-mermaid-preview" data-mermaid-preview>',
      '<div class="md-mermaid-loading">Rendering diagram…</div>',
      '</div>',
      '<details class="md-mermaid-fallback">',
      '<summary>Diagram source</summary>',
      `<pre><code>${escapeHtml(source)}</code></pre>`,
      '</details>',
      '</div>',
    ].join('');
  };
}
