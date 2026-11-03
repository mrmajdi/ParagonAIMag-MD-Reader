import { describe, expect, it } from 'vitest';
import { detectDirection, extractFrontmatter, flattenToc, renderMarkdown } from './index';

describe('detectDirection', () => {
  it('detects Persian as RTL', () => {
    expect(detectDirection('سلام دنیا، این یک متن فارسی است.')).toBe('rtl');
  });

  it('detects English as LTR', () => {
    expect(detectDirection('Hello world, this is a Markdown document.')).toBe('ltr');
  });

  it('uses the first strong character in mixed documents', () => {
    expect(detectDirection('سلام، this is mixed.')).toBe('rtl');
    expect(detectDirection('Hello, این متن فارسی است.')).toBe('ltr');
  });
});

describe('extractFrontmatter', () => {
  it('parses a YAML mapping and removes it from the body', () => {
    const result = extractFrontmatter('---\ntitle: Hello\ntags:\n  - one\n---\n# Body');
    expect(result.data).toEqual({ title: 'Hello', tags: ['one'] });
    expect(result.body).toBe('# Body');
  });

  it('does not swallow a leading horizontal rule', () => {
    const result = extractFrontmatter('---\n\n# Not frontmatter\n\n---\n');
    expect(result.data).toBeNull();
    expect(result.body).toContain('# Not frontmatter');
  });
});

describe('renderMarkdown', () => {
  it('renders GFM tables and task lists', () => {
    const { html } = renderMarkdown('| Name | Value |\n| --- | --- |\n| a | 1 |\n\n- [x] done\n- [ ] todo');
    expect(html).toContain('<table>');
    expect(html).toContain('checkbox');
    expect(html).toContain('done');
  });

  it('extracts frontmatter, title, language and direction', () => {
    const result = renderMarkdown('---\ntitle: راهنما\nlang: fa\n---\n# سلام\n\nمتن فارسی');
    expect(result.title).toBe('راهنما');
    expect(result.direction).toBe('rtl');
    expect(result.language).toBe('fa');
    expect(result.frontmatter?.title).toBe('راهنما');
  });

  it('builds a nested table of contents and heading anchors', () => {
    const result = renderMarkdown('# A\n\n## B\n\n### C\n\n## D');
    expect(result.html).toContain('id="a"');
    expect(result.toc).toHaveLength(1);
    expect(result.toc[0]?.children).toHaveLength(2);
    expect(flattenToc(result.toc)).toHaveLength(4);
  });

  it('renders KaTeX math', () => {
    const result = renderMarkdown('Inline $E = mc^2$ and a block:\n\n$$\n\\int_0^1 x dx\n$$');
    expect(result.html).toContain('katex');
    expect(result.stats.math).toBeGreaterThan(0);
  });

  it('emits a safe Mermaid placeholder with readable source', () => {
    const result = renderMarkdown('```mermaid\ngraph TD\n  A --> B\n```');
    expect(result.html).toContain('data-mermaid');
    expect(result.html).toContain('graph TD');
    expect(result.stats.diagrams).toBe(1);
  });

  it('sanitises scripts and event handlers', () => {
    const result = renderMarkdown('<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">');
    expect(result.html).not.toContain('<script');
    expect(result.html).not.toContain('onerror');
  });

  it('neutralises hostile links, iframes, objects and data URLs', () => {
    const result = renderMarkdown(
      [
        '[click](javascript:alert(1))',
        '<iframe src="https://evil.example"></iframe>',
        '<object data="https://evil.example"></object>',
        '<embed src="https://evil.example">',
        '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">data</a>',
        '<img src="data:image/svg+xml,<svg onload=alert(1)>">',
        '<div style="background:url(javascript:alert(1))">x</div>',
        '<form action="https://evil.example"><input name="x"></form>',
      ].join('\n\n'),
    );
    expect(result.html).not.toMatch(/href="javascript:/i);
    expect(result.html).not.toMatch(/<script/i);
    expect(result.html).not.toMatch(/<iframe/i);
    expect(result.html).not.toMatch(/<object/i);
    expect(result.html).not.toMatch(/<embed/i);
    expect(result.html).not.toMatch(/<form/i);
    expect(result.html).not.toMatch(/style=/i);
    expect(result.html).not.toMatch(/onload/i);
    expect(result.html).not.toMatch(/onerror/i);
    expect(result.html).not.toContain('data:text/html');
    expect(result.html).not.toContain('data:image/svg');
  });

  it('renders non-Mermaid fences as highlighted pre/code blocks (regression)', () => {
    const result = renderMarkdown('```ts\nconst x: number = 1;\n```\n\nAfter the block.');
    expect(result.html).toContain('<pre class="hljs"');
    expect(result.html).toContain('language-ts');
    expect(result.html).toContain('const');
    expect(result.html).not.toContain('<code dir="ltr">');
    expect(result.html).toContain('After the block.');
  });

  it('supports RTL alerts with localised labels', () => {
    const result = renderMarkdown('> [!WARNING]\n> مراقب باشید', {
      alertLabels: { warning: 'هشدار' },
    });
    expect(result.html).toContain('md-alert-warning');
    expect(result.html).toContain('data-alert-label="هشدار"');
  });

  it('counts words and reading time for Persian text', () => {
    const result = renderMarkdown('سلام دنیا\n\nاین یک متن کوتاه است.');
    expect(result.stats.words).toBeGreaterThanOrEqual(5);
    expect(result.stats.readingMinutes).toBe(1);
  });
});
