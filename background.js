
// Background script for the Bookmark Organizer Pro extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('Bookmark Organizer Pro installed');
});

// Handle bookmark changes and sync with local storage if needed
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log('Bookmark created:', bookmark);
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  console.log('Bookmark removed:', id);
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  console.log('Bookmark changed:', id, changeInfo);
});

chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  console.log('Bookmark moved:', id, moveInfo);
});

// Optional: Add context menu items for quick bookmark management
chrome.contextMenus.create({
  id: 'organizeBookmarks',
  title: 'Organize Bookmarks',
  contexts: ['page']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'organizeBookmarks') {
    chrome.action.openPopup();
  }
});
