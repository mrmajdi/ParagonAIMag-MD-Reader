function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function baseName(title: string, fallback = 'paragon-document'): string {
  const clean = title
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean || fallback;
}

export function exportMarkdown(markdown: string, name: string): void {
  const filename = name.replace(/\.(md|markdown|mdx|txt)$/i, '') || 'document';
  downloadBlob(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }), `${filename}.md`);
}

export function exportTxt(text: string, title: string): void {
  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${baseName(title)}.txt`);
}

function extractTables(article: HTMLElement): string[][][] {
  return Array.from(article.querySelectorAll('table')).map((table) =>
    Array.from(table.querySelectorAll('tr')).map((row) =>
      Array.from(row.querySelectorAll('th,td')).map((cell) => (cell.textContent ?? '').trim()),
    ),
  );
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function exportCsv(article: HTMLElement, title: string): void {
  const tables = extractTables(article);
  if (tables.length === 0) throw new Error('No tables found in this document.');
  const csv = tables
    .map((rows, index) => `# Table ${index + 1}\n${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`)
    .join('\n\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${baseName(title)}.csv`);
}

export async function exportXlsx(article: HTMLElement, title: string): Promise<void> {
  const tables = extractTables(article);
  if (tables.length === 0) throw new Error('No tables found in this document.');
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  // SheetJS writes <sheetView rightToLeft="1"> from the WORKBOOK views,
  // not from a sheet's !views (which it ignores on write) — set both.
  workbook.Workbook = { ...(workbook.Workbook ?? {}), Views: [{ RTL: true }] };
  tables.forEach((rows, index) => {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    // Excel renders the sheet right-to-left, matching the document direction.
    sheet['!views'] = [{ RTL: true }];
    XLSX.utils.book_append_sheet(workbook, sheet, `Table ${index + 1}`.slice(0, 31));
  });
  XLSX.writeFile(workbook, `${baseName(title)}.xlsx`);
}

interface SlideData {
  title: string;
  body: string[];
}

function buildSlides(article: HTMLElement): SlideData[] {
  const slides: SlideData[] = [];
  let current: SlideData = { title: '', body: [] };
  const push = () => {
    if (current.title || current.body.length > 0) slides.push(current);
  };

  for (const child of Array.from(article.children)) {
    if (child.tagName === 'HR') {
      push();
      current = { title: '', body: [] };
      continue;
    }
    const heading = child.tagName.match(/^H([12])$/);
    if (heading) {
      push();
      current = { title: (child.textContent ?? '').trim(), body: [] };
      continue;
    }
    const text = (child.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (text) current.body.push(text);
  }
  push();
  return slides.length > 0 ? slides : [{ title: 'Document', body: [] }];
}

export async function exportPptx(
  article: HTMLElement,
  title: string,
  direction: 'rtl' | 'ltr',
): Promise<void> {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.rtlMode = direction === 'rtl';
  pptx.author = 'Paragon AI MAG';
  pptx.subject = title;
  pptx.title = title;

  const slides = buildSlides(article);
  for (const data of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: 'FBF7EE' };
    slide.addText(data.title || title, {
      x: 0.6,
      y: 0.45,
      w: 12.1,
      h: 0.9,
      fontSize: 26,
      bold: true,
      color: '15211F',
      fontFace: 'Arial',
      rtlMode: direction === 'rtl',
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.6,
      y: 1.42,
      w: 1.5,
      h: 0.05,
      fill: { color: '0F766E' },
      line: { color: '0F766E' },
    });
    if (data.body.length > 0) {
      slide.addText(data.body.slice(0, 9).map((line) => ({ text: line })), {
        x: 0.65,
        y: 1.75,
        w: 11.9,
        h: 5,
        fontSize: 15,
        color: '3E4642',
        breakLine: true,
        bullet: { indent: 16 },
        fontFace: 'Arial',
        valign: 'top',
        rtlMode: direction === 'rtl',
      });
    }
    slide.addText('Paragon AI MAG · MD Reader', {
      x: 0.65,
      y: 6.95,
      w: 6,
      h: 0.3,
      fontSize: 8,
      color: '7B857F',
      fontFace: 'Arial',
    });
  }

  const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
  downloadBlob(blob, `${baseName(title)}.pptx`);
}

function stripInline(element: Element): string {
  return (element.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export async function exportDocx(
  article: HTMLElement,
  title: string,
  direction: 'rtl' | 'ltr',
): Promise<void> {
  const docx = await import('docx');
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    BorderStyle,
  } = docx;

  const alignment = direction === 'rtl' ? AlignmentType.RIGHT : AlignmentType.LEFT;
  const bidirectional = direction === 'rtl';
  const blocks: Array<InstanceType<typeof Paragraph> | InstanceType<typeof Table>> = [];

  const inlineRuns = (node: Node, style: { bold?: boolean; italics?: boolean; code?: boolean } = {}): InstanceType<typeof TextRun>[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (!text) return [];
      return [
        new TextRun({
          text,
          bold: style.bold,
          italics: style.italics,
          font: style.code ? 'Courier New' : undefined,
          size: style.code ? 18 : undefined,
          rightToLeft: style.code ? false : bidirectional,
        }),
      ];
    }
    if (!(node instanceof HTMLElement)) return [];
    if (node.tagName === 'BR') return [new TextRun({ break: 1 })];
    const next = {
      bold: style.bold || node.tagName === 'STRONG' || node.tagName === 'B',
      italics: style.italics || node.tagName === 'EM' || node.tagName === 'I',
      code: style.code || node.tagName === 'CODE',
    };
    return Array.from(node.childNodes).flatMap((child) => inlineRuns(child, next));
  };

  for (const child of Array.from(article.children)) {
    const headingMatch = child.tagName.match(/^H([1-6])$/);
    if (headingMatch) {
      const level = Number(headingMatch[1]);
      const heading =
        level === 1
          ? HeadingLevel.HEADING_1
          : level === 2
            ? HeadingLevel.HEADING_2
            : level === 3
              ? HeadingLevel.HEADING_3
              : level === 4
                ? HeadingLevel.HEADING_4
                : HeadingLevel.HEADING_5;
      blocks.push(
        new Paragraph({ text: stripInline(child), heading, alignment, bidirectional }),
      );
      continue;
    }

    const table = child.matches('.md-table-wrap')
      ? child.querySelector('table')
      : child.tagName === 'TABLE'
        ? child
        : null;
    if (table) {
      const rows = Array.from(table.querySelectorAll('tr')).map((row) => {
        const cells = Array.from(row.querySelectorAll('th,td')).map(
          (cell) =>
            new TableCell({
              width: { size: 100 / Math.max(1, row.querySelectorAll('th,td').length), type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: inlineRuns(cell), alignment, bidirectional })],
            }),
        );
        return new TableRow({ children: cells });
      });
      if (rows.length > 0) {
        blocks.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      }
      continue;
    }

    if (child.tagName === 'PRE') {
      const lines = (child.textContent ?? '').replace(/\n$/, '').split('\n');
      blocks.push(
        new Paragraph({
          children: [new TextRun({ text: lines.join('\n'), font: 'Courier New', size: 18 })],
          shading: { fill: 'F3F3F3' },
          alignment: AlignmentType.LEFT,
          bidirectional: false,
        }),
      );
      continue;
    }

    if (child.tagName === 'UL' || child.tagName === 'OL') {
      for (const item of Array.from(child.querySelectorAll(':scope > li'))) {
        blocks.push(
          new Paragraph({
            children: inlineRuns(item),
            bullet: child.tagName === 'UL' ? { level: 0 } : undefined,
            numbering: child.tagName === 'OL' ? { reference: 'default-numbering', level: 0 } : undefined,
            alignment,
            bidirectional,
          }),
        );
      }
      continue;
    }

    if (child.tagName === 'BLOCKQUOTE') {
      blocks.push(
        new Paragraph({
          children: inlineRuns(child, { italics: true }),
          indent: { left: 360, right: direction === 'rtl' ? 360 : undefined },
          alignment,
          bidirectional,
        }),
      );
      continue;
    }

    if (child.tagName === 'HR') {
      blocks.push(
        new Paragraph({
          text: '',
          border: { bottom: { color: 'D8D8D8', size: 6, style: BorderStyle.SINGLE } },
        }),
      );
      continue;
    }

    if (child.tagName === 'DL') {
      blocks.push(new Paragraph({ children: inlineRuns(child), alignment, bidirectional }));
      continue;
    }

    const text = stripInline(child);
    if (text) {
      blocks.push(new Paragraph({ children: inlineRuns(child), alignment, bidirectional }));
    }
  }

  const document = new Document({
    title,
    creator: 'Paragon AI MAG MD Reader',
    description: 'Exported from Paragon AI MAG MD Reader',
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: blocks,
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  downloadBlob(blob, `${baseName(title)}.docx`);
}
