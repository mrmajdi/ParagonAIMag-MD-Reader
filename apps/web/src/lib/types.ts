import type { RenderResult } from '@paragon-ai-mag/core';

export type Theme = 'light' | 'dark' | 'sepia';
export type ExportFormat = 'html' | 'docx' | 'pptx' | 'xlsx' | 'csv' | 'txt' | 'md' | 'print';
export type FontFamily = 'sans' | 'serif';
export type DirectionSetting = 'auto' | 'rtl' | 'ltr';
export type DocSource = 'file' | 'folder' | 'cli' | 'demo' | 'paste' | 'url' | 'share';

export interface FileNode {
  name: string;
  path: string;
  kind: 'file' | 'directory';
  children?: FileNode[];
  handle?: FsFileHandle;
  file?: File;
}

export interface FsFileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
}

export interface FsDirectoryHandle {
  kind: 'directory';
  name: string;
  values(): AsyncIterableIterator<FsFileHandle | FsDirectoryHandle>;
}

export interface DocumentState {
  name: string;
  path?: string;
  content: string;
  source: DocSource;
  rootName?: string;
  assetBase?: string;
  live?: boolean;
}

export interface RenderState {
  result: RenderResult;
  filename: string;
}

export type LightboxContent =
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'svg'; svg: string; title: string };

export type SidebarTab = 'outline' | 'files' | 'info';

export interface SearchDoc {
  id: string;
  title: string;
  text: string;
  level: number;
}

export interface FeedItem {
  id: string;
  type: 'article' | 'video' | 'podcast';
  title: string;
  url: string;
  publishedAt: string;
  summary?: string;
  source: string;
  image?: string;
  videoId?: string;
  audio?: string;
  duration?: string;
}

export interface FeedPayload {
  updatedAt: string;
  items: FeedItem[];
}
