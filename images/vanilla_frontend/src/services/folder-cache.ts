/**
 * FolderCache - A high-performance caching service for folder data
 * Uses IndexedDB for fast storage and retrieval of folder metadata
 */

export interface CachedFolderData {
  name: string;
  fullPath: string;
  imageCount: number;
  previewImageHash?: string;
  lastUpdated: number;
}

export interface FolderCacheEntry {
  id: string; // fullPath as key
  data: CachedFolderData;
  timestamp: number;
  version: number;
}

class FolderCacheService {
  private dbName = 'HachiFolderCache';
  private dbVersion = 1;
  private storeName = 'folders';
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  
  // Cache TTL - 24 hours by default
  private cacheTTL = 24 * 60 * 60 * 1000;
  
  constructor() {
    this.initPromise = this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('FolderCache IndexedDB initialized');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create folders store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('fullPath', 'data.fullPath', { unique: true });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initPromise;
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  /**
   * Store folder data in cache
   */
  async cacheFolderData(folders: CachedFolderData[]): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    const now = Date.now();
    
    // Store each folder
    const promises = folders.map(folder => {
      const entry: FolderCacheEntry = {
        id: folder.fullPath,
        data: { ...folder, lastUpdated: now },
        timestamp: now,
        version: 1
      };
      
      return new Promise<void>((resolve, reject) => {
        const request = store.put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    
    await Promise.all(promises);
    console.log(`Cached ${folders.length} folders to IndexedDB`);
  }

  /**
   * Retrieve folder data from cache
   */
  async getCachedFolderData(): Promise<CachedFolderData[] | null> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          const entries: FolderCacheEntry[] = request.result;
          const now = Date.now();
          
          // Filter out expired entries
          const validEntries = entries.filter(entry => 
            (now - entry.timestamp) < this.cacheTTL
          );
          
          if (validEntries.length === 0) {
            console.log('No valid cached folder data found');
            resolve(null);
            return;
          }
          
          const folderData = validEntries.map(entry => entry.data);
          console.log(`Retrieved ${folderData.length} folders from cache`);
          resolve(folderData);
        };
        
        request.onerror = () => {
          console.error('Failed to retrieve cached folder data');
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error getting cached folder data:', error);
      return null;
    }
  }

  /**
   * Update specific folder data in cache
   */
  async updateFolderData(folderPath: string, updates: Partial<CachedFolderData>): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(folderPath);
      
      getRequest.onsuccess = () => {
        const existingEntry: FolderCacheEntry | undefined = getRequest.result;
        
        if (!existingEntry) {
          console.warn(`Folder ${folderPath} not found in cache`);
          resolve();
          return;
        }
        
        // Update the entry
        const updatedEntry: FolderCacheEntry = {
          ...existingEntry,
          data: { ...existingEntry.data, ...updates, lastUpdated: Date.now() },
          timestamp: Date.now()
        };
        
        const putRequest = store.put(updatedEntry);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Get specific folder data from cache
   */
  async getCachedFolder(folderPath: string): Promise<CachedFolderData | null> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.get(folderPath);
        
        request.onsuccess = () => {
          const entry: FolderCacheEntry | undefined = request.result;
          
          if (!entry) {
            resolve(null);
            return;
          }
          
          // Check if entry is still valid
          const now = Date.now();
          if ((now - entry.timestamp) >= this.cacheTTL) {
            console.log(`Cache entry for ${folderPath} is expired`);
            resolve(null);
            return;
          }
          
          resolve(entry.data);
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Error getting cached folder ${folderPath}:`, error);
      return null;
    }
  }

  /**
   * Check if cache is valid and not expired
   */
  async isCacheValid(): Promise<boolean> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve) => {
        const request = store.count();
        
        request.onsuccess = () => {
          const count = request.result;
          if (count === 0) {
            resolve(false);
            return;
          }
          
          // Check if we have recent data
          const index = store.index('timestamp');
          const now = Date.now();
          const cutoff = now - this.cacheTTL;
          
          const rangeRequest = index.count(IDBKeyRange.lowerBound(cutoff));
          rangeRequest.onsuccess = () => {
            const validCount = rangeRequest.result;
            resolve(validCount > 0);
          };
          rangeRequest.onerror = () => resolve(false);
        };
        
        request.onerror = () => resolve(false);
      });
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        console.log('Folder cache cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ totalFolders: number; lastUpdated: number | null }> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const countRequest = store.count();
        
        countRequest.onsuccess = () => {
          const totalFolders = countRequest.result;
          
          if (totalFolders === 0) {
            resolve({ totalFolders: 0, lastUpdated: null });
            return;
          }
          
          // Get the most recent timestamp
          const index = store.index('timestamp');
          const cursorRequest = index.openCursor(null, 'prev');
          
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            const lastUpdated = cursor ? cursor.key as number : null;
            resolve({ totalFolders, lastUpdated });
          };
          
          cursorRequest.onerror = () => reject(cursorRequest.error);
        };
        
        countRequest.onerror = () => reject(countRequest.error);
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalFolders: 0, lastUpdated: null };
    }
  }

  /**
   * Set cache TTL (time to live)
   */
  setCacheTTL(ttlMs: number): void {
    this.cacheTTL = ttlMs;
  }

  isIndexingInProgress(): boolean {
    // Check if stored_indexing_endpoint is set in localStorage
    const indexingEndpoint = localStorage.getItem('stored_indexing_endpoint');
    console.log('Indexing endpoint:', indexingEndpoint);
    if (indexingEndpoint) {
      return true; // Indexing is in progress if endpoint is set
    }
    return false;
  }
}

// Export singleton instance
export const folderCache = new FolderCacheService();
