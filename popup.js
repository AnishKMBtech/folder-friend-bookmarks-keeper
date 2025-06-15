
class BookmarkManager {
  constructor() {
    this.currentFolderId = '1'; // Chrome's bookmark bar ID
    this.bookmarks = [];
    this.folders = [];
    this.filteredItems = [];
    this.searchQuery = '';
    
    this.initializeElements();
    this.bindEvents();
    this.loadBookmarks();
    this.updateBreadcrumb();
  }

  initializeElements() {
    this.elements = {
      bookmarkList: document.getElementById('bookmarkList'),
      searchInput: document.getElementById('searchInput'),
      clearSearch: document.getElementById('clearSearch'),
      breadcrumb: document.getElementById('breadcrumb'),
      newFolderBtn: document.getElementById('newFolderBtn'),
      importBtn: document.getElementById('importBtn'),
      exportBtn: document.getElementById('exportBtn'),
      newFolderModal: document.getElementById('newFolderModal'),
      closeModal: document.getElementById('closeModal'),
      folderNameInput: document.getElementById('folderNameInput'),
      createFolder: document.getElementById('createFolder'),
      cancelFolder: document.getElementById('cancelFolder'),
      fileInput: document.getElementById('fileInput'),
      bookmarkCount: document.getElementById('bookmarkCount'),
      folderCount: document.getElementById('folderCount')
    };
  }

  bindEvents() {
    // Search functionality
    this.elements.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.filterAndRenderItems();
    });

    this.elements.clearSearch.addEventListener('click', () => {
      this.elements.searchInput.value = '';
      this.searchQuery = '';
      this.filterAndRenderItems();
    });

    // Folder creation
    this.elements.newFolderBtn.addEventListener('click', () => {
      this.showNewFolderModal();
    });

    this.elements.closeModal.addEventListener('click', () => {
      this.hideNewFolderModal();
    });

    this.elements.cancelFolder.addEventListener('click', () => {
      this.hideNewFolderModal();
    });

    this.elements.createFolder.addEventListener('click', () => {
      this.createNewFolder();
    });

    this.elements.folderNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.createNewFolder();
      }
    });

    // Import/Export
    this.elements.importBtn.addEventListener('click', () => {
      this.elements.fileInput.click();
    });

    this.elements.fileInput.addEventListener('change', (e) => {
      this.importBookmarks(e.target.files[0]);
    });

    this.elements.exportBtn.addEventListener('click', () => {
      this.exportBookmarks();
    });

    // Modal backdrop click
    this.elements.newFolderModal.addEventListener('click', (e) => {
      if (e.target === this.elements.newFolderModal) {
        this.hideNewFolderModal();
      }
    });
  }

  async loadBookmarks() {
    try {
      const bookmarkTree = await chrome.bookmarks.getTree();
      this.processBookmarkTree(bookmarkTree);
      this.filterAndRenderItems();
      this.updateStats();
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      this.showError('Failed to load bookmarks');
    }
  }

  processBookmarkTree(tree) {
    this.bookmarks = [];
    this.folders = [];
    
    const processNode = (node, parentId = null) => {
      if (node.children) {
        // This is a folder
        const folderData = {
          id: node.id,
          title: node.title || 'Untitled Folder',
          parentId: parentId,
          dateAdded: node.dateAdded,
          children: node.children.map(child => child.id)
        };
        this.folders.push(folderData);
        
        // Process children
        node.children.forEach(child => processNode(child, node.id));
      } else {
        // This is a bookmark
        const bookmarkData = {
          id: node.id,
          title: node.title || 'Untitled',
          url: node.url,
          parentId: parentId,
          dateAdded: node.dateAdded
        };
        this.bookmarks.push(bookmarkData);
      }
    };

    tree.forEach(rootNode => processNode(rootNode));
  }

  filterAndRenderItems() {
    const currentFolderItems = this.getCurrentFolderItems();
    
    if (this.searchQuery) {
      this.filteredItems = currentFolderItems.filter(item => 
        item.title.toLowerCase().includes(this.searchQuery) ||
        (item.url && item.url.toLowerCase().includes(this.searchQuery))
      );
    } else {
      this.filteredItems = currentFolderItems;
    }

    this.renderItems();
  }

  getCurrentFolderItems() {
    const folderItems = this.folders.filter(folder => 
      folder.parentId === this.currentFolderId
    );
    
    const bookmarkItems = this.bookmarks.filter(bookmark => 
      bookmark.parentId === this.currentFolderId
    );

    return [...folderItems, ...bookmarkItems].sort((a, b) => {
      // Folders first, then bookmarks
      if (this.folders.find(f => f.id === a.id) && !this.folders.find(f => f.id === b.id)) return -1;
      if (!this.folders.find(f => f.id === a.id) && this.folders.find(f => f.id === b.id)) return 1;
      return a.title.localeCompare(b.title);
    });
  }

  renderItems() {
    if (this.filteredItems.length === 0) {
      this.elements.bookmarkList.innerHTML = this.searchQuery ? 
        this.getNoResultsHTML() : this.getEmptyStateHTML();
      return;
    }

    const itemsHTML = this.filteredItems.map(item => {
      const isFolder = this.folders.find(f => f.id === item.id);
      return isFolder ? this.renderFolder(item) : this.renderBookmark(item);
    }).join('');

    this.elements.bookmarkList.innerHTML = itemsHTML;
    this.bindItemEvents();
  }

  renderFolder(folder) {
    const childCount = folder.children ? folder.children.length : 0;
    return `
      <div class="folder-item" data-folder-id="${folder.id}">
        <div class="item-icon">📁</div>
        <div class="item-content">
          <div class="item-title">${this.escapeHtml(folder.title)}</div>
          <div class="item-url">${childCount} item${childCount !== 1 ? 's' : ''}</div>
        </div>
        <div class="item-actions">
          <button class="action-btn delete" data-action="delete" data-id="${folder.id}" title="Delete folder">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  renderBookmark(bookmark) {
    const favicon = this.getFaviconUrl(bookmark.url);
    return `
      <div class="bookmark-item" data-bookmark-id="${bookmark.id}">
        <div class="item-icon">
          <img src="${favicon}" alt="" width="16" height="16" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
          <span style="display: none;">🔗</span>
        </div>
        <div class="item-content">
          <div class="item-title">${this.escapeHtml(bookmark.title)}</div>
          <div class="item-url">${this.escapeHtml(bookmark.url)}</div>
        </div>
        <div class="item-actions">
          <button class="action-btn" data-action="open" data-url="${bookmark.url}" title="Open bookmark">
            🔗
          </button>
          <button class="action-btn delete" data-action="delete" data-id="${bookmark.id}" title="Delete bookmark">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  bindItemEvents() {
    // Folder navigation
    document.querySelectorAll('.folder-item').forEach(folder => {
      folder.addEventListener('click', (e) => {
        if (!e.target.closest('.item-actions')) {
          const folderId = folder.dataset.folderId;
          this.navigateToFolder(folderId);
        }
      });
    });

    // Action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        
        if (action === 'open') {
          chrome.tabs.create({ url: btn.dataset.url });
        } else if (action === 'delete') {
          this.deleteItem(btn.dataset.id);
        }
      });
    });
  }

  async navigateToFolder(folderId) {
    this.currentFolderId = folderId;
    this.searchQuery = '';
    this.elements.searchInput.value = '';
    await this.loadBookmarks();
    this.updateBreadcrumb();
  }

  updateBreadcrumb() {
    const breadcrumbPath = this.getBreadcrumbPath();
    const breadcrumbHTML = breadcrumbPath.map((item, index) => `
      <button class="breadcrumb-item ${index === breadcrumbPath.length - 1 ? 'active' : ''}" 
              data-folder-id="${item.id}">
        <span class="icon">${item.icon}</span>
        ${item.title}
      </button>
      ${index < breadcrumbPath.length - 1 ? '<span>›</span>' : ''}
    `).join('');

    this.elements.breadcrumb.innerHTML = breadcrumbHTML;

    // Bind breadcrumb navigation
    document.querySelectorAll('.breadcrumb-item').forEach(item => {
      item.addEventListener('click', () => {
        const folderId = item.dataset.folderId;
        this.navigateToFolder(folderId);
      });
    });
  }

  getBreadcrumbPath() {
    const path = [{ id: '1', title: 'Home', icon: '🏠' }];
    
    if (this.currentFolderId !== '1') {
      let currentFolder = this.folders.find(f => f.id === this.currentFolderId);
      const tempPath = [];
      
      while (currentFolder && currentFolder.id !== '1') {
        tempPath.unshift({ 
          id: currentFolder.id, 
          title: currentFolder.title, 
          icon: '📁' 
        });
        currentFolder = this.folders.find(f => f.id === currentFolder.parentId);
      }
      
      path.push(...tempPath);
    }
    
    return path;
  }

  showNewFolderModal() {
    this.elements.newFolderModal.classList.add('show');
    this.elements.folderNameInput.focus();
  }

  hideNewFolderModal() {
    this.elements.newFolderModal.classList.remove('show');
    this.elements.folderNameInput.value = '';
  }

  async createNewFolder() {
    const folderName = this.elements.folderNameInput.value.trim();
    
    if (!folderName) {
      this.elements.folderNameInput.focus();
      return;
    }

    try {
      await chrome.bookmarks.create({
        parentId: this.currentFolderId,
        title: folderName
      });
      
      this.hideNewFolderModal();
      await this.loadBookmarks();
      this.showSuccess('Folder created successfully!');
    } catch (error) {
      console.error('Error creating folder:', error);
      this.showError('Failed to create folder');
    }
  }

  async deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      await chrome.bookmarks.removeTree(itemId);
      await this.loadBookmarks();
      this.showSuccess('Item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      this.showError('Failed to delete item');
    }
  }

  async exportBookmarks() {
    try {
      const bookmarkTree = await chrome.bookmarks.getTree();
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        bookmarks: bookmarkTree
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookmarks-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showSuccess('Bookmarks exported successfully!');
    } catch (error) {
      console.error('Error exporting bookmarks:', error);
      this.showError('Failed to export bookmarks');
    }
  }

  async importBookmarks(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (!importData.bookmarks) {
        throw new Error('Invalid bookmark file format');
      }

      // Create import folder
      const importFolder = await chrome.bookmarks.create({
        parentId: this.currentFolderId,
        title: `Imported Bookmarks - ${new Date().toLocaleDateString()}`
      });

      // Import bookmarks recursively
      await this.importBookmarkNode(importData.bookmarks[0], importFolder.id);
      
      await this.loadBookmarks();
      this.showSuccess('Bookmarks imported successfully!');
    } catch (error) {
      console.error('Error importing bookmarks:', error);
      this.showError('Failed to import bookmarks. Please check the file format.');
    }
  }

  async importBookmarkNode(node, parentId) {
    if (node.children) {
      // Create folder
      const folder = await chrome.bookmarks.create({
        parentId: parentId,
        title: node.title || 'Imported Folder'
      });
      
      // Import children
      for (const child of node.children) {
        await this.importBookmarkNode(child, folder.id);
      }
    } else if (node.url) {
      // Create bookmark
      await chrome.bookmarks.create({
        parentId: parentId,
        title: node.title || 'Imported Bookmark',
        url: node.url
      });
    }
  }

  updateStats() {
    const bookmarkCount = this.bookmarks.length;
    const folderCount = this.folders.length - 1; // Exclude root folder
    
    this.elements.bookmarkCount.textContent = `${bookmarkCount} bookmark${bookmarkCount !== 1 ? 's' : ''}`;
    this.elements.folderCount.textContent = `${folderCount} folder${folderCount !== 1 ? 's' : ''}`;
  }

  getFaviconUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?sz=16&domain=${domain}`;
    } catch {
      return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
    }
  }

  getEmptyStateHTML() {
    return `
      <div class="empty-state">
        <div class="icon">📚</div>
        <h3>No bookmarks yet</h3>
        <p>Create a folder or add some bookmarks to get started!</p>
      </div>
    `;
  }

  getNoResultsHTML() {
    return `
      <div class="no-results">
        <div class="icon">🔍</div>
        <h3>No results found</h3>
        <p>Try adjusting your search terms</p>
      </div>
    `;
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type) {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the bookmark manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new BookmarkManager();
});
