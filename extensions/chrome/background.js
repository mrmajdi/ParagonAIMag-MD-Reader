const READER = 'reader/index.html';

function openReader(query = '') {
  const url = chrome.runtime.getURL(READER) + query;
  chrome.tabs.create({ url });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'paragon-open-link',
      title: 'Open in Paragon Reader',
      contexts: ['link'],
      targetUrlPatterns: ['*://*/*.md', '*://*/*.md*', '*://*/*.markdown', '*://*/*.mdx'],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'paragon-open-link' && info.linkUrl) {
    openReader(`?url=${encodeURIComponent(info.linkUrl)}`);
  }
});

chrome.action.onClicked.addListener(() => openReader());
