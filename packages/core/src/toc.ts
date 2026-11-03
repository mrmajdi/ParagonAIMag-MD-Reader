import type { TocItem } from './types';

export interface HeadingInput {
  id: string;
  text: string;
  level: number;
}

export function buildToc(headings: HeadingInput[]): TocItem[] {
  const roots: TocItem[] = [];
  const stack: TocItem[] = [];

  for (const heading of headings) {
    const item: TocItem = {
      id: heading.id,
      text: heading.text,
      level: heading.level,
      children: [],
    };

    while (stack.length > 0 && (stack[stack.length - 1]?.level ?? 0) >= item.level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(item);
    else roots.push(item);

    stack.push(item);
  }

  return roots;
}

export function flattenToc(items: TocItem[]): TocItem[] {
  return items.flatMap((item) => [item, ...flattenToc(item.children)]);
}
