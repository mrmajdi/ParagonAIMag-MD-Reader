import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { renderMarkdown } from '@paragon-ai-mag/core';
import { PROJECT } from './lib/brand';
import {
  buildDroppedFiles,
  findFileNode,
  flattenFileNodes,
  isTextFile,
  normalizePath,
  readFileText,
  readHandleText,
  resolveImageHandle,
  scanDirectory,
} from './lib/files';
import {
  fetchCliDoc,
  fetchCliTree,
  fetchRemoteMarkdown,
  getCliParams,
  isCliMode as detectCliMode,
  subscribeCli,
} from './lib/cli';
import { translate, isRtlLocale, type TranslationKey } from './lib/i18n';
import {
  isEditableTarget,
  isStandalone,
  supportsDirectoryPicker,
  type BeforeInstallPromptEvent,
} from './lib/platform';
import { buildSearchIndex, type SearchIndex } from './lib/search';
import { loadSettings, saveSettings, type Settings } from './lib/storage';
import { exportDocument, printDocument } from './lib/export';
import {
  exportCsv,
  exportDocx,
  exportMarkdown,
  exportPptx,
  exportTxt,
  exportXlsx,
} from './lib/convert';
import { copyShareLink, decodeShareHash, shareDocument } from './lib/share';
import type {
  DocumentState,
  ExportFormat,
  FileNode,
  FsFileHandle,
  LightboxContent,
  SidebarTab,
} from './lib/types';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Welcome } from './components/Welcome';
import { DocView } from './components/DocView';
import { SearchPalette } from './components/SearchPalette';
import { SettingsPanel } from './components/SettingsPanel';
import { Presentation } from './components/Presentation';
import { Lightbox } from './components/Lightbox';
import { Toast } from './components/Toast';
import { Editor } from './components/Editor';
import { Icon } from './components/Icons';

const STORED_ALERT_LABELS = {
  note: 'alertNote',
  tip: 'alertTip',
  important: 'alertImportant',
  warning: 'alertWarning',
  caution: 'alertCaution',
} as const;

function getDocKey(doc: DocumentState | null): string {
  if (!doc) return '';
  return `${doc.source}:${doc.path || doc.name}`;
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [doc, setDoc] = useState<DocumentState | null>(null);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [mdHandles, setMdHandles] = useState<Map<string, FsFileHandle>>(new Map());
  const [imageHandles, setImageHandles] = useState<Map<string, FsFileHandle>>(new Map());
  const [droppedFiles, setDroppedFiles] = useState<Map<string, File>>(new Map());
  const [rootName, setRootName] = useState('');
  const [tab, setTab] = useState<SidebarTab>('outline');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxContent | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState('');
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dragging, setDragging] = useState(false);
  const [cliMode, setCliMode] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitial, setEditorInitial] = useState<{ content: string; name: string } | null>(null);
  const [installHelp, setInstallHelp] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const assetUrls = useRef(new Map<string, string>());
  const toastTimer = useRef<number | null>(null);
  const dragDepth = useRef(0);
  const currentDocRef = useRef<DocumentState | null>(null);
  const cliDocPath = useRef<string | null>(null);

  currentDocRef.current = doc;

  const t = useMemo(
    () => (key: TranslationKey, vars?: Record<string, string | number>) => translate(settings.locale, key, vars),
    [settings.locale],
  );

  const alertLabels = useMemo(
    () => ({
      note: translate(settings.locale, 'alertNote'),
      tip: translate(settings.locale, 'alertTip'),
      important: translate(settings.locale, 'alertImportant'),
      warning: translate(settings.locale, 'alertWarning'),
      caution: translate(settings.locale, 'alertCaution'),
    }),
    [settings.locale],
  );

  const result = useMemo(() => {
    if (!doc) return null;
    return renderMarkdown(doc.content, {
      filename: doc.name,
      direction: settings.direction,
      alertLabels,
    });
  }, [doc, settings.direction, alertLabels]);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const clearAssets = useCallback(() => {
    for (const url of assetUrls.current.values()) URL.revokeObjectURL(url);
    assetUrls.current.clear();
  }, []);

  const applyDoc = useCallback(
    (next: DocumentState, options: { scroll?: boolean } = {}) => {
      clearAssets();
      setDoc(next);
      setActiveId('');
      setSearchIndex(null);
      setTab(next.source === 'cli' ? 'outline' : 'outline');
      setSidebarOpen(false);
      if (options.scroll !== false) window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [clearAssets],
  );

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.font = settings.fontFamily;
    root.style.setProperty('--reader-size', `${settings.fontSize}px`);
    root.lang = settings.locale;
    root.dir = isRtlLocale(settings.locale) ? 'rtl' : 'ltr';
    saveSettings(settings);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', settings.theme === 'dark' ? '#0e1213' : '#0f766e');
  }, [settings]);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openFileObject = useCallback(
    async (file: File, path?: string) => {
      if (!isTextFile(file.name)) {
        notify(t('errorOpen'));
        return;
      }
      try {
        const content = await readFileText(file);
        applyDoc({ name: file.name, path: path || file.name, content, source: 'file' });
      } catch {
        notify(t('errorRead'));
      }
    },
    [applyDoc, notify, t],
  );

  const openDropped = useCallback(
    async (files: FileList | File[]) => {
      const all = Array.from(files);
      const { tree: droppedTree, handles } = buildDroppedFiles(all);
      if (droppedTree.length === 0) {
        notify(t('errorOpen'));
        return;
      }
      const imageMap = new Map<string, File>();
      for (const file of all) {
        if (!isTextFile(file.name)) imageMap.set(file.name, file);
      }
      setTree(droppedTree);
      setMdHandles(new Map());
      setImageHandles(new Map());
      setDroppedFiles(imageMap);
      setRootName('');
      setTab('files');
      const first = droppedTree[0];
      if (first?.file) {
        await openFileObject(first.file, first.path);
        setTree(droppedTree);
        setDroppedFiles(imageMap);
      }
    },
    [notify, openFileObject, t],
  );

  const openFolder = useCallback(async () => {
    if (!supportsDirectoryPicker()) {
      notify(t('unsupportedFolder'));
      return;
    }
    try {
      const handle = await window.showDirectoryPicker?.({ mode: 'read' });
      if (!handle) return;
      const scanned = await scanDirectory(handle);
      setTree(scanned.tree);
      setMdHandles(scanned.markdownHandles);
      setImageHandles(scanned.imageHandles);
      setDroppedFiles(new Map());
      setRootName(handle.name);
      setTab('files');
      setSidebarOpen(true);
      const files = flattenFileNodes(scanned.tree);
      const readme = files.find((file) => file.name.toLowerCase() === 'readme.md');
      if (readme) {
        await openFolderNode(readme, scanned.markdownHandles, scanned.tree, handle.name);
      } else {
        setDoc(null);
        notify(t('chooseFile'));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      notify(t('errorFolder'));
    }
  }, [notify, t]);

  const openFolderNode = useCallback(
    async (
      node: FileNode,
      handles: Map<string, FsFileHandle> = mdHandles,
      nextTree: FileNode[] = tree,
      nextRoot = rootName,
    ) => {
      try {
        let content: string | null = null;
        if (node.handle) content = await readHandleText(node.handle);
        else if (node.file) content = await node.file.text();
        if (content === null) return;
        applyDoc({
          name: node.name,
          path: node.path,
          content,
          source: cliMode ? 'cli' : 'folder',
          rootName: nextRoot,
          live: cliMode ? doc?.live : false,
          assetBase: cliMode ? doc?.assetBase : undefined,
        });
        if (nextTree.length > 0) setTree(nextTree);
        if (handles.size > 0) setMdHandles(handles);
        setTab('outline');
      } catch {
        notify(t('errorRead'));
      }
    },
    [applyDoc, cliMode, doc?.assetBase, doc?.live, mdHandles, notify, rootName, t, tree],
  );

  const openNode = useCallback(
    async (node: FileNode) => {
      if (node.kind !== 'file') return;
      if (cliMode && !node.handle && !node.file) {
        try {
          const response = await fetchCliDoc(node.path);
          applyDoc({
            name: response.name,
            path: response.path,
            content: response.content,
            source: 'cli',
            rootName: response.root,
            assetBase: response.assetBase,
            live: true,
          });
          cliDocPath.current = response.path;
        } catch {
          notify(t('errorRead'));
        }
        return;
      }
      await openFolderNode(node);
    },
    [applyDoc, cliMode, notify, openFolderNode, t],
  );

  const openPath = useCallback(
    async (href: string) => {
      if (!doc) return;
      const base = doc.path || doc.name;
      const clean = href.split('#')[0]?.split('?')[0] ?? '';
      if (!clean) return;
      const directory = base.includes('/') ? base.slice(0, base.lastIndexOf('/')) : '';
      const resolved = normalizePath(directory ? `${directory}/${clean}` : clean);
      if (cliMode) {
        try {
          const response = await fetchCliDoc(resolved);
          applyDoc({
            name: response.name,
            path: response.path,
            content: response.content,
            source: 'cli',
            rootName: response.root,
            assetBase: response.assetBase,
            live: true,
          });
          cliDocPath.current = response.path;
          return;
        } catch {
          notify(t('errorRead'));
          return;
        }
      }
      const node = findFileNode(tree, resolved) ?? flattenFileNodes(tree).find((file) => file.name === clean);
      if (node) await openFolderNode(node);
    },
    [applyDoc, cliMode, doc, notify, openFolderNode, t, tree],
  );

  const resolveAsset = useCallback(
    async (src: string): Promise<string | null> => {
      if (!doc || src.startsWith('data:') || src.startsWith('http') || src.startsWith('blob:')) return null;

      if (doc.assetBase) {
        return new URL(src, new URL(doc.assetBase, window.location.href)).href;
      }

      const cached = assetUrls.current.get(src);
      if (cached) return cached;

      if (imageHandles.size > 0 && doc.path) {
        const blob = await resolveImageHandle(imageHandles, doc.path, src);
        if (blob) {
          const url = URL.createObjectURL(blob);
          assetUrls.current.set(src, url);
          return url;
        }
      }

      if (droppedFiles.size > 0) {
        const name = src.split('/').pop() ?? src;
        const file = droppedFiles.get(name);
        if (file) {
          const url = URL.createObjectURL(file);
          assetUrls.current.set(src, url);
          return url;
        }
      }

      return null;
    },
    [doc, droppedFiles, imageHandles],
  );

  const handleViewReady = useCallback((container: HTMLElement) => {
    setSearchIndex(buildSearchIndex(container));
  }, []);

  const navigateToId = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
      history.replaceState(null, '', `#${id}`);
    }
  }, []);

  const handleTextFileInput = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (files.length > 1) {
        await openDropped(files);
      } else {
        const file = files[0];
        if (file) await openFileObject(file);
      }
    },
    [openDropped, openFileObject],
  );

  const openRemote = useCallback(
    async (url: string) => {
      if (!url.trim()) return;
      try {
        const { content, name } = await fetchRemoteMarkdown(url.trim());
        applyDoc({ name, content, source: 'url' });
      } catch (error) {
        notify(error instanceof Error && error.message.includes('HTML') ? t('errorUrl') : t('errorUrl'));
      }
    },
    [applyDoc, notify, t],
  );

  const openDemo = useCallback(() => {
    void import('./lib/sample').then(({ getSample, sampleName }) => {
      applyDoc({
        name: sampleName(settings.locale),
        content: getSample(settings.locale),
        source: 'demo',
      });
    });
  }, [applyDoc, settings.locale]);

  const openUrlDialog = useCallback(() => {
    const url = window.prompt(t('openUrl'), 'https://');
    if (url) void openRemote(url);
  }, [openRemote, t]);

  const openEditorForCurrent = useCallback(() => {
    if (!doc) return;
    setEditorInitial({ content: doc.content, name: doc.name });
    setEditorOpen(true);
  }, [doc]);

  const openNewDocument = useCallback(() => {
    const template = `---\ntitle: ''\ndescription: ''\ntags: []\nlang: ${settings.locale}\n---\n\n# \n\n`;
    setEditorInitial({ content: template, name: 'untitled.md' });
    setEditorOpen(true);
  }, [settings.locale]);

  const applyEditor = useCallback(
    (content: string, name: string) => {
      applyDoc({ name: name.trim() || 'untitled.md', content, source: 'paste' });
      setEditorOpen(false);
      notify(t('updated'));
    },
    [applyDoc, notify, t],
  );

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!doc || !result) return;
      const article = document.querySelector<HTMLElement>('.md-body');
      try {
        if (format === 'print') {
          printDocument();
          return;
        }
        if (format === 'html') {
          await exportDocument({
            html: result.html,
            title: result.title,
            direction: result.direction,
            language: result.language,
            theme: settings.theme,
          });
          notify(t('downloadStarted'));
          return;
        }
        if (format === 'md') {
          exportMarkdown(doc.content, doc.name);
          notify(t('downloadStarted'));
          return;
        }
        if (!article) return;
        if (format === 'txt') {
          exportTxt(article.innerText, result.title);
        } else if (format === 'csv') {
          exportCsv(article, result.title);
        } else if (format === 'docx') {
          await exportDocx(article, result.title, result.direction);
        } else if (format === 'pptx') {
          await exportPptx(article, result.title);
        } else if (format === 'xlsx') {
          await exportXlsx(article, result.title);
        }
        notify(t('downloadStarted'));
      } catch (error) {
        notify(error instanceof Error && error.message ? error.message : t('exportFailed'));
      }
    },
    [doc, notify, result, settings.theme, t],
  );

  const handleShare = useCallback(async () => {
    if (!doc) return;
    try {
      const resultShare = await shareDocument({
        title: result?.title || doc.name,
        markdown: doc.content,
      });
      if (resultShare === 'copied') notify(t('linkCopied'));
      else if (resultShare === 'shared') notify(t('copied'));
    } catch {
      try {
        await copyShareLink(doc.content);
        notify(t('linkCopied'));
      } catch {
        notify(t('exportFailed'));
      }
    }
  }, [doc, notify, result?.title, t]);

  const handleInstall = useCallback(async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        notify(t('downloadStarted'));
        setInstallPrompt(null);
      }
      return;
    }
    setInstallHelp(true);
  }, [installPrompt, notify, t]);

  const cycleTheme = useCallback(() => {
    setSettings((current) => ({
      ...current,
      theme: current.theme === 'light' ? 'dark' : current.theme === 'dark' ? 'sepia' : 'light',
    }));
  }, []);

  // CLI / URL / shared-link bootstrap.
  useEffect(() => {
    const params = getCliParams();
    if (detectCliMode()) {
      setCliMode(true);
      void fetchCliTree()
        .then((response) => {
          setTree(response.files);
          setRootName(response.root);
          setTab('files');
        })
        .catch(() => undefined);

      const initialPath = params.file;
      if (initialPath) {
        void fetchCliDoc(initialPath)
          .then((response) => {
            applyDoc({
              name: response.name,
              path: response.path,
              content: response.content,
              source: 'cli',
              rootName: response.root,
              assetBase: response.assetBase,
              live: true,
            });
            cliDocPath.current = response.path;
          })
          .catch(() => notify(t('errorRead')));
      }

      const unsubscribe = subscribeCli(() => {
        const current = currentDocRef.current;
        const path = cliDocPath.current;
        if (!current || !path) return;
        void fetchCliDoc(path).then((response) => {
          setDoc((existing) =>
            existing
              ? { ...existing, content: response.content, name: response.name, path: response.path, assetBase: response.assetBase }
              : existing,
          );
          notify(t('updated'));
        });
      });
      return unsubscribe;
    }

    if (params.url) {
      void openRemote(params.url);
      return;
    }

    const shareHash = window.location.hash;
    if (shareHash.startsWith('#share=')) {
      void decodeShareHash(shareHash.slice('#share='.length)).then((markdown) => {
        if (markdown) applyDoc({ name: 'shared.md', content: markdown, source: 'share' });
      });
    }
  }, [applyDoc, notify, openRemote, t]);

  // Install prompt.
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      notify(t('installApp'));
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [notify, t]);

  // Global drag and drop.
  useEffect(() => {
    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes('Files');

    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (event.dataTransfer?.files?.length) void openDropped(event.dataTransfer.files);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [openDropped]);

  // Paste Markdown anywhere outside an input.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const text = event.clipboardData?.getData('text/plain') ?? '';
      if (!text.trim()) return;
      if (text.length < 12 && !text.includes('\n')) return;
      event.preventDefault();
      applyDoc({ name: 'pasted.md', content: text, source: 'paste' });
      notify(t('textCopied'));
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [applyDoc, notify, t]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        fileInputRef.current?.click();
      } else if (mod && event.key.toLowerCase() === 'k') {
        if (!doc) return;
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === 'Escape') {
        setSearchOpen(false);
        setSettingsOpen(false);
        setPresentationOpen(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doc]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const isStandaloneMode = isStandalone();
  const hasSidebar = Boolean(doc || tree.length > 0);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t('reader')}
      </a>
      <TopBar
        t={t}
        doc={doc}
        theme={settings.theme}
        progress={progress}
        canInstall={Boolean(installPrompt) && !isStandaloneMode}
        canUseFolder={supportsDirectoryPicker()}
        onHome={() => {
          setDoc(null);
          setSearchIndex(null);
          setSidebarOpen(false);
          setSearchOpen(false);
          setSettingsOpen(false);
          window.scrollTo({ top: 0 });
        }}
        onOpenFile={() => fileInputRef.current?.click()}
        onOpenFolder={() => void openFolder()}
        onOpenUrl={openUrlDialog}
        onNewDocument={openNewDocument}
        onSearch={() => setSearchOpen(true)}
        onTheme={cycleTheme}
        onSettings={() => setSettingsOpen(true)}
        onPresentation={() => setPresentationOpen(true)}
        onPrint={() => void handleExport('print')}
        onExport={(format) => void handleExport(format)}
        onCopyText={() => {
          if (!doc) return;
          void navigator.clipboard?.writeText(doc.content);
          notify(t('textCopied'));
        }}
        onShare={() => void handleShare()}
        onEdit={openEditorForCurrent}
        onInstall={() => void handleInstall()}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
      />

      <div className="app-body">
        {hasSidebar ? (
          <Sidebar
            t={t}
            locale={settings.locale}
            open={sidebarOpen}
            tab={tab}
            doc={doc}
            toc={result?.toc ?? []}
            activeId={activeId}
            stats={result?.stats ?? null}
            frontmatter={result?.frontmatter ?? null}
            title={result?.title ?? doc?.name ?? ''}
            language={result?.language ?? 'und'}
            tree={tree}
            currentPath={doc?.path}
            onTab={setTab}
            onNavigate={navigateToId}
            onOpenFile={(node) => void openNode(node)}
            onClose={closeSidebar}
          />
        ) : null}
        {sidebarOpen && hasSidebar ? <div className="mobile-scrim" onClick={closeSidebar} /> : null}

        <main className="main" id="main">
          {doc && result ? (
            <DocView
              t={t}
              locale={settings.locale}
              doc={doc}
              render={result}
              theme={settings.theme}
              onViewReady={handleViewReady}
              onActiveHeading={setActiveId}
              onZoom={setLightbox}
              onOpenPath={(href) => void openPath(href)}
              resolveAsset={resolveAsset}
              notify={notify}
            />
          ) : (
            <Welcome
              t={t}
              locale={settings.locale}
              canUseFolder={supportsDirectoryPicker()}
              files={flattenFileNodes(tree)}
              onOpenFile={() => fileInputRef.current?.click()}
              onOpenFolder={() => void openFolder()}
              onDemo={openDemo}
              onNewDocument={openNewDocument}
              onOpenUrl={(url) => void openRemote(url)}
              onInstall={() => void handleInstall()}
              onOpenFileNode={(node) => void openNode(node)}
            />
          )}
        </main>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.mdx,.mdown,.mkd,.txt,text/markdown,text/plain"
        multiple
        hidden
        onChange={(event) => {
          void handleTextFileInput(event.target.files);
          event.target.value = '';
        }}
      />

      <SearchPalette
        open={searchOpen}
        t={t}
        index={searchIndex}
        onClose={() => setSearchOpen(false)}
        onNavigate={navigateToId}
      />

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        t={t}
        locale={settings.locale}
        canInstall={Boolean(installPrompt)}
        isStandalone={isStandaloneMode}
        onClose={() => setSettingsOpen(false)}
        onChange={updateSettings}
        onInstall={() => void handleInstall()}
        notify={notify}
      />

      {result ? (
        <Presentation
          open={presentationOpen}
          html={result.html}
          title={result.title}
          direction={result.direction}
          language={result.language}
          theme={settings.theme}
          locale={settings.locale}
          t={t}
          onClose={() => setPresentationOpen(false)}
          onExpand={(svg, title) => setLightbox({ kind: 'svg', svg, title })}
        />
      ) : null}

      <Lightbox content={lightbox} t={t} onClose={() => setLightbox(null)} />
      <Toast message={toast} />

      <Editor
        open={editorOpen}
        initial={editorInitial}
        t={t}
        locale={settings.locale}
        theme={settings.theme}
        onClose={() => setEditorOpen(false)}
        onApply={applyEditor}
        notify={notify}
      />

      {dragging ? (
        <div className="drop-overlay" aria-hidden="true">
          <div className="drop-overlay-inner">
            <Icon name="upload" size={34} />
            {t('dropOverlay')}
          </div>
        </div>
      ) : null}

      {installHelp ? (
        <div className="overlay" role="dialog" aria-modal="true" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setInstallHelp(false);
        }}>
          <div className="search-panel" style={{ padding: 22 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>{t('installApp')}</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: 13, lineHeight: 1.8 }}>
              {t('installSteps')}
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 12 }}>{t('installIosSteps')}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBlockStart: 10 }}>
              <a className="btn btn-sm" href={PROJECT.repo} target="_blank" rel="noopener noreferrer">
                {t('viewOnGitHub')}
              </a>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setInstallHelp(false)}>
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
