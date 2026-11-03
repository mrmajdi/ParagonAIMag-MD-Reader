/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.css?inline' {
  const content: string;
  export default content;
}

interface Window {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    types?: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<Array<{ kind: 'file'; name: string; getFile(): Promise<File> }>>;
  showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<import('./lib/types').FsDirectoryHandle>;
}
