import { expect, test } from '@playwright/test';

const settings = {
  theme: 'light',
  locale: 'en',
  fontSize: 17,
  fontFamily: 'sans',
  direction: 'auto',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((value) => {
    localStorage.setItem('paragon-reader.settings.v1', JSON.stringify(value));
  }, settings);
  await page.route('**/feed.json', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        updatedAt: '2026-11-03T00:00:00.000Z',
        items: [
          {
            id: 'podcast-test',
            type: 'podcast',
            title: 'Test podcast episode',
            url: 'https://example.com/episode',
            publishedAt: '2026-11-03T00:00:00.000Z',
            source: 'RedCircle',
            audio: 'https://example.com/audio.mp3',
            image: 'https://example.com/cover.jpg',
            summary: 'Test summary',
          },
          {
            id: 'video-test',
            type: 'video',
            title: 'Test video episode',
            url: 'https://www.youtube.com/watch?v=test',
            publishedAt: '2026-11-02T00:00:00.000Z',
            source: 'YouTube',
            videoId: 'dQw4w9WgXcQ',
            image: 'https://example.com/thumb.jpg',
            summary: 'Test summary',
          },
        ],
      }),
    });
  });
});

test('demo renders headings, code, math and RTL', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.locator('.md-body h1')).toContainText('Reading Markdown');

  const code = page.locator('pre.hljs').filter({ hasText: 'type Document' });
  await expect(code).toHaveCount(1);
  await expect(code).toHaveClass(/hljs/);
  await expect(code.locator('code')).toHaveClass(/language-ts/);

  await expect(page.locator('.md-body .katex').first()).toBeVisible();
  await expect(page.locator('.md-table-wrap table')).toBeVisible();

  const mermaid = page.locator('.md-mermaid');
  await mermaid.scrollIntoViewIfNeeded();
  await expect(mermaid.locator('svg.flowchart')).toBeVisible({ timeout: 20_000 });
});

test('search palette finds document text', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await page.getByRole('button', { name: 'Search' }).click();
  const input = page.getByRole('textbox');
  await expect(input).toBeFocused();
  await input.fill('Mermaid');
  await expect(page.locator('.search-result').first()).toBeVisible();
});

test('presentation mode opens and closes with Escape', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await page.getByRole('button', { name: 'Present' }).click();
  await expect(page.locator('.presentation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.presentation')).toHaveCount(0);
});

test('feed mounts inline audio and video only after a click', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Test podcast episode')).toBeVisible();
  await expect(page.locator('.feed-player')).toHaveCount(0);

  await page.locator('.feed-item', { hasText: 'Test podcast episode' }).getByRole('button', { name: 'Listen here' }).click();
  await expect(page.locator('.feed-player-audio audio')).toHaveAttribute('src', 'https://example.com/audio.mp3');

  await page.locator('.feed-item', { hasText: 'Test video episode' }).getByRole('button', { name: 'Watch here' }).first().click();
  await expect(page.locator('.feed-player-video iframe')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  await expect(page.locator('.feed-player-audio audio')).toHaveCount(0);
});

test('Persian document is fully RTL', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Interface language').selectOption('fa');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'نمونه را ببین' }).click();
  const body = page.locator('.md-body');
  await expect(body).toHaveAttribute('dir', 'rtl');
  await expect(body.locator('h1')).toContainText('خواندن مارک');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(body.locator('pre.hljs').first()).toHaveAttribute('dir', 'ltr');
});
