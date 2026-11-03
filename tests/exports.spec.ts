import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const outDir = join(process.cwd(), 'test-results', 'exports');
mkdirSync(outDir, { recursive: true });

const settings = {
  theme: 'light',
  locale: 'fa',
  fontSize: 17,
  fontFamily: 'sans',
  direction: 'auto',
};

async function openPersianDemo(page: Page) {
  await page.addInitScript((value) => {
    localStorage.setItem('paragon-reader.settings.v1', JSON.stringify(value));
  }, settings);
  await page.goto('/');
  await page.getByRole('button', { name: 'نمونه را ببین' }).click();
  await expect(page.locator('.md-body')).toHaveAttribute('dir', 'rtl');
}

async function download(page: Page, label: string, filename: string): Promise<string> {
  await page.getByRole('button', { name: /more|بیشتر/i }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: label }).click();
  const file = await pending;
  const target = join(outDir, filename);
  await file.saveAs(target);
  expect(existsSync(target)).toBe(true);
  expect(statSync(target).size).toBeGreaterThan(1000);
  return target;
}

test('complex Persian document exports HTML with RTL, math, table and code', async ({ page }) => {
  await openPersianDemo(page);
  const file = await download(page, 'HTML', 'paragon-export.html');
  const html = readFileSync(file, 'utf8');
  expect(html).toContain('dir="rtl"');
  expect(html).toContain('lang="fa"');
  expect(html).toContain('خواندن مارک');
  expect(html).toContain('katex');
  expect(html).toContain('<table');
  expect(html).toContain('hljs');
  expect(html).toContain('data:font/woff2');
});

test('DOCX contains the mixed RTL document text', async ({ page }) => {
  await openPersianDemo(page);
  const file = await download(page, 'Word (.docx)', 'paragon-export.docx');
  const xml = execFileSync('unzip', ['-p', file, 'word/document.xml'], { encoding: 'utf8' });
  expect(xml).toContain('خواندن مارک');
  expect(xml).toContain('local-first');
  expect(xml).toContain('جدول');
});

test('PPTX contains the RTL slides', async ({ page }) => {
  await openPersianDemo(page);
  const file = await download(page, 'PowerPoint (.pptx)', 'paragon-export.pptx');
  const xml = execFileSync('unzip', ['-p', file, 'ppt/slides/slide1.xml'], { encoding: 'utf8' });
  expect(xml).toContain('خواندن مارک');
});

test('XLSX contains the document table', async ({ page }) => {
  await openPersianDemo(page);
  const file = await download(page, 'Excel (.xlsx)', 'paragon-export.xlsx');
  const xml = execFileSync('unzip', ['-p', file, 'xl/worksheets/sheet1.xml'], { encoding: 'utf8' });
  expect(xml).toContain('ویژگی');
  expect(xml).toContain('جدول‌های GFM');
});

test('exported HTML produces a non-empty PDF with print styles', async ({ page }) => {
  await openPersianDemo(page);
  const htmlFile = await download(page, 'HTML', 'paragon-print.html');
  await page.goto(`file://${htmlFile}`);
  await expect(page.locator('.md-body h1')).toContainText('خواندن مارک');
  const pdfPath = join(outDir, 'paragon-print.pdf');
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
  const pdf = readFileSync(pdfPath);
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(10_000);
});
