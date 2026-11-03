import type { Locale } from './i18n';

const faSample = `---
title: 'خواندن مارک‌داون، بدون دردسر'
description: 'یک سند نمونه که جدول‌ها، نمودارها، فرمول‌ها، کد و متن راست‌به‌چپ را نشان می‌دهد.'
author: 'Paragon AI MAG'
date: '2026-11-03'
tags: ['مارک‌داون', 'RTL', 'هوش مصنوعی']
lang: 'fa'
direction: 'rtl'
---

# خواندن مارک‌داون، بدون دردسر

> [!NOTE]
> این سند نمونه است. فایل‌های خودت را رها کن، باز کن یا از لینک بخوان؛ هیچ‌چیز از دستگاهت بیرون نمی‌رود.

مارک‌داون زبانِ مشترکِ عامل‌های هوش مصنوعی است. اما خواندنش در ترمینال یا پیش‌نمایش‌های ساده، جدول‌ها و نمودارها و فرمول‌ها را از بین می‌برد. این خواننده برای همین ساخته شده: **محلی، سریع، چندزبانه و راست‌به‌چپ‌محور**.

## چرا این خواننده؟

| ویژگی | پاراگون ریدر | پیش‌نمایش ساده | افزونه‌های قدیمی |
| --- | --- | --- | --- |
| جدول‌های GFM | ✅ | ✅ | ✅ |
| نمودار Mermaid | ✅ | ❌ | گاهی |
| فرمول KaTeX | ✅ | ❌ | گاهی |
| RTL واقعی | ✅ | ضعیف | ❌ |
| آفلاین و محلی | ✅ | ✅ | ✅ |
| خروجی PDF و HTML | ✅ | ❌ | گاهی |

- [x] نمایش جدول‌های بزرگ با اسکرول افقی
- [x] رندر نمودارهای Mermaid
- [ ] خواندن همهٔ فایل‌های پوشه
- [ ] ساختن ارائه از تیترها

## نمودار

\`\`\`mermaid
flowchart LR
  A[فایل .md] --> B{نوع محتوا}
  B -->|متن| C[تایپوگرافی]
  B -->|جدول| D[جدول واکنش‌گرا]
  B -->|نمودار| E[Mermaid]
  B -->|فرمول| F[KaTeX]
  C --> G[خواننده]
  D --> G
  E --> G
  F --> G
\`\`\`

نمودارها با تنظیمات پوسته هماهنگ می‌شوند و فقط وقتی به آن‌ها نزدیک می‌شوی رندر می‌شوند.

## فرمول

فرمول درون‌خطی: $E = mc^2$ و فرمول بلوکی:

$$
\\int_{0}^{1} x^2 \\, dx = \\frac{1}{3}
$$

## کد

\`\`\`ts
type Document = {
  title: string;
  locale: 'fa' | 'en';
  rtl: boolean;
};

export function readingTime(words: number): number {
  return Math.max(1, Math.ceil(words / 200));
}
\`\`\`

> [!TIP]
> کد همیشه چپ‌به‌راست می‌ماند، حتی وقتی کل سند راست‌به‌چپ است. این همان جزئیاتی است که بیشتر ابزارها فراموش می‌کنند.

## جزئیات RTL

متن فارسی با اصطلاحات انگلیسی مثل **local-first**، **bidi** و \`document.dir\` قاطی می‌شود و باید بدون به‌هم‌ریختگی خوانده شود. اعداد مثل ۱۲۳ و 2026 باید در جای درست بنشینند.

- مورد اول با \`inline code\` و توضیح فارسی
- مورد دوم با **تأکید** و ==هایلایت==
- مورد سوم با H~2~O و E=mc^2^
- مورد چهارم با یک [پیوند به مجله](https://paragonaimag.substack.com)

<details>
<summary>یک بخش جمع‌شونده</summary>

داخل این بخش هم مارک‌داون و هم HTML خام کار می‌کند؛ اما HTML خطرناک حذف می‌شود.

</details>

> این یک نقل‌قول ساده است.
>
> و ادامه‌اش در پاراگراف دوم.

اصطلاح
: تعریف اصطلاح در یک لیست تعریفی.

---

## یک نکتهٔ دیگر

پاراگراف آخر با یک پانویس.[^1]

[^1]: پانویس‌ها هم پشتیبانی می‌شوند و به مبدأ برمی‌گردند.
`;

const enSample = `---
title: 'Reading Markdown, without the friction'
description: 'A demo document covering tables, diagrams, math, code and every language.'
author: 'Paragon AI MAG'
date: '2026-11-03'
tags: ['markdown', 'RTL', 'AI']
lang: 'en'
direction: 'ltr'
---

# Reading Markdown, without the friction

> [!NOTE]
> This is a live demo. Drop a file, open a folder, paste Markdown or fetch a raw URL. Nothing leaves your device.

Markdown is the shared language of AI agents. Reading it in a terminal or a bare preview destroys tables, diagrams and formulas. This reader was built for that gap: **local-first, fast, multilingual and RTL-native**.

## Why this reader?

| Capability | Paragon Reader | Plain preview | Old extensions |
| --- | --- | --- | --- |
| GFM tables | ✅ | ✅ | ✅ |
| Mermaid diagrams | ✅ | ❌ | Sometimes |
| KaTeX math | ✅ | ❌ | Sometimes |
| Real RTL | ✅ | Weak | ❌ |
| Offline & local | ✅ | ✅ | ✅ |
| PDF & HTML export | ✅ | ❌ | Sometimes |

- [x] Large tables with horizontal scrolling
- [x] Mermaid diagrams
- [ ] Read every Markdown file in a folder
- [ ] Build a deck from headings

## A diagram

\`\`\`mermaid
flowchart LR
  A[.md file] --> B{Content type}
  B -->|Prose| C[Typography]
  B -->|Table| D[Responsive table]
  B -->|Diagram| E[Mermaid]
  B -->|Formula| F[KaTeX]
  C --> G[Reader]
  D --> G
  E --> G
  F --> G
\`\`\`

Diagrams follow the active theme and render lazily as you approach them.

## Math

Inline math: $E = mc^2$. A display equation:

$$
\\int_{0}^{1} x^2 \\, dx = \\frac{1}{3}
$$

## Code

\`\`\`ts
type Document = {
  title: string;
  locale: 'en' | 'fa';
  rtl: boolean;
};

export function readingTime(words: number): number {
  return Math.max(1, Math.ceil(words / 200));
}
\`\`\`

> [!TIP]
> Code stays LTR even when the document is RTL. That is the detail most tools miss.

## The details

Persian, Arabic, Hebrew, Urdu, Chinese, Hindi and every other script share one renderer. Inline English terms, numbers like 123 and 2026, and \`code\` all keep their own direction.

- One item with \`inline code\` and a sentence
- Another with **strong** and ==highlight==
- Another with H~2~O and E=mc^2^
- And a [link to the magazine](https://paragonaimag.substack.com)

<details>
<summary>A collapsible section</summary>

Markdown and sanitised raw HTML both work here. Dangerous HTML is removed.

</details>

> A regular blockquote.
>
> With a second paragraph.

Term
: A definition-list definition.

---

## One more thing

A final paragraph with a footnote.[^1]

[^1]: Footnotes work too, and they link back to their source.
`;

export function getSample(locale: Locale): string {
  return locale === 'fa' || locale === 'ar' ? faSample : enSample;
}

export function sampleName(locale: Locale): string {
  return locale === 'fa' || locale === 'ar' ? 'نمونه.md' : 'demo.md';
}
