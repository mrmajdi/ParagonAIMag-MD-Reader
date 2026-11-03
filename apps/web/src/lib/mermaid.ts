import type { Theme } from './types';

interface MermaidApi {
  initialize(config: Record<string, unknown>): void;
  render(id: string, text: string): Promise<{ svg: string }>;
}

let mermaidPromise: Promise<MermaidApi> | null = null;
let diagramCounter = 0;

async function getMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const api = (mod as unknown as { default?: MermaidApi }).default;
      if (!api) throw new Error('Mermaid failed to load');
      return api;
    });
  }
  return mermaidPromise;
}

export interface MermaidLabels {
  loading: string;
  error: string;
  expand: string;
}

const EXPAND_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';

function mermaidTheme(theme: Theme): string {
  if (theme === 'dark') return 'dark';
  if (theme === 'sepia') return 'neutral';
  return 'default';
}

async function renderNode(
  node: HTMLElement,
  theme: Theme,
  labels: MermaidLabels,
  onExpand: (svg: string) => void,
): Promise<void> {
  if (node.dataset.renderedTheme === theme) return;

  const source = node.querySelector<HTMLElement>('.md-mermaid-fallback code')?.textContent ?? '';
  const preview = node.querySelector<HTMLElement>('[data-mermaid-preview]');
  if (!preview) return;

  if (!source.trim()) {
    preview.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'md-mermaid-error';
    empty.textContent = labels.error;
    preview.append(empty);
    return;
  }

  node.dataset.renderedTheme = theme;
  preview.innerHTML = '';
  const loading = document.createElement('div');
  loading.className = 'md-mermaid-loading';
  loading.textContent = labels.loading;
  preview.append(loading);

  try {
    const mermaid = await getMermaid();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: mermaidTheme(theme),
      fontFamily: 'Vazirmatn, Inter, ui-sans-serif, system-ui, sans-serif',
      flowchart: { htmlLabels: true, curve: 'basis' },
      sequence: { useMaxWidth: true },
      gantt: { useMaxWidth: true },
    });
    const id = `paragon-mermaid-${Date.now()}-${(diagramCounter += 1)}`;
    const { svg } = await mermaid.render(id, source);
    preview.innerHTML = svg;
    preview.classList.add('is-rendered');

    let button = node.querySelector<HTMLButtonElement>('.md-mermaid-expand');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'md-mermaid-expand';
      node.append(button);
    }
    button.innerHTML = EXPAND_ICON;
    button.title = labels.expand;
    button.setAttribute('aria-label', labels.expand);
    button.onclick = () => onExpand(svg);
  } catch (error) {
    node.dataset.renderedTheme = '';
    preview.innerHTML = '';
    const message = document.createElement('div');
    message.className = 'md-mermaid-error';
    message.textContent = labels.error;
    const detail = document.createElement('small');
    detail.textContent = error instanceof Error ? error.message : String(error);
    message.append(detail);
    preview.append(message);
  }
}

export function setupMermaid(
  root: HTMLElement,
  theme: Theme,
  labels: MermaidLabels,
  onExpand: (svg: string) => void,
): () => void {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-mermaid]'));
  if (nodes.length === 0) return () => undefined;

  if (typeof IntersectionObserver === 'undefined') {
    for (const node of nodes) void renderNode(node, theme, labels, onExpand);
    return () => undefined;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        void renderNode(entry.target as HTMLElement, theme, labels, onExpand);
      }
    },
    { rootMargin: '320px 0px' },
  );

  for (const node of nodes) {
    if (node.dataset.renderedTheme !== theme) observer.observe(node);
  }

  return () => observer.disconnect();
}

export async function renderMermaidImmediately(
  root: HTMLElement,
  theme: Theme,
  labels: MermaidLabels,
  onExpand: (svg: string) => void,
): Promise<void> {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-mermaid]'));
  await Promise.all(nodes.map((node) => renderNode(node, theme, labels, onExpand)));
}
