const DB_NAME = 'voting_system';
const DB_VERSION = 1;
const STORE_NAME = 'votes';
const COOKIE_NAME = 'voted_polls';
const COOKIE_DAYS = 365;
const LOCAL_STORAGE_KEY = 'voted_polls';
const SESSION_STORAGE_KEY = 'voted_polls_session';

interface VoteRecord {
  pollId: string;
  timestamp: number;
  fingerprint: string;
  optionIds: string[];
}

export class VoteStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (!window.indexedDB) {
      console.warn('IndexedDB not available');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'pollId' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('fingerprint', 'fingerprint', { unique: false });
        }
      };
    });
  }

  private setCookie(name: string, value: string, days: number): void {
    try {
      const expires = new Date();
      expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
      document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
    } catch (e) {
      console.error('Cookie error:', e);
    }
  }

  private getCookie(name: string): string | null {
    try {
      const nameEQ = name + '=';
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
          return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
      }
      return null;
    } catch (e) {
      console.error('Cookie read error:', e);
      return null;
    }
  }

  async recordVote(pollId: string, fingerprint: string, optionIds: string[]): Promise<void> {
    const voteRecord: VoteRecord = {
      pollId,
      timestamp: Date.now(),
      fingerprint,
      optionIds,
    };

    await Promise.all([
      this.recordInIndexedDB(voteRecord),
      this.recordInLocalStorage(voteRecord),
      this.recordInSessionStorage(voteRecord),
      this.recordInCookie(voteRecord),
    ]);
  }

  private async recordInIndexedDB(record: VoteRecord): Promise<void> {
    if (!this.db) {
      try {
        await this.init();
      } catch (e) {
        console.warn('IndexedDB initialization failed:', e);
        return;
      }
    }

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.put(record);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error('IndexedDB write error:', request.error);
          resolve();
        };
      } catch (e) {
        console.error('IndexedDB transaction error:', e);
        resolve();
      }
    });
  }

  private recordInLocalStorage(record: VoteRecord): void {
    try {
      if (!window.localStorage) return;

      const existing = localStorage.getItem(LOCAL_STORAGE_KEY);
      const votes = existing ? JSON.parse(existing) : {};
      votes[record.pollId] = record;

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(votes));
    } catch (e) {
      console.error('localStorage error:', e);
    }
  }

  private recordInSessionStorage(record: VoteRecord): void {
    try {
      if (!window.sessionStorage) return;

      const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
      const votes = existing ? JSON.parse(existing) : {};
      votes[record.pollId] = record;

      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(votes));
    } catch (e) {
      console.error('sessionStorage error:', e);
    }
  }

  private recordInCookie(record: VoteRecord): void {
    try {
      const existing = this.getCookie(COOKIE_NAME);
      const votes = existing ? JSON.parse(existing) : {};
      votes[record.pollId] = {
        t: record.timestamp,
        f: record.fingerprint.substring(0, 16),
      };

      this.setCookie(COOKIE_NAME, JSON.stringify(votes), COOKIE_DAYS);
    } catch (e) {
      console.error('Cookie write error:', e);
    }
  }

  async hasVoted(pollId: string): Promise<boolean> {
    const results = await Promise.all([
      this.checkIndexedDB(pollId),
      this.checkLocalStorage(pollId),
      this.checkSessionStorage(pollId),
      this.checkCookie(pollId),
    ]);

    return results.some(result => result);
  }

  private async checkIndexedDB(pollId: string): Promise<boolean> {
    if (!this.db) {
      try {
        await this.init();
      } catch (e) {
        return false;
      }
    }

    if (!this.db) return false;

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.get(pollId);

        request.onsuccess = () => {
          resolve(!!request.result);
        };
        request.onerror = () => {
          resolve(false);
        };
      } catch (e) {
        resolve(false);
      }
    });
  }

  private checkLocalStorage(pollId: string): boolean {
    try {
      if (!window.localStorage) return false;

      const existing = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!existing) return false;

      const votes = JSON.parse(existing);
      return !!votes[pollId];
    } catch (e) {
      return false;
    }
  }

  private checkSessionStorage(pollId: string): boolean {
    try {
      if (!window.sessionStorage) return false;

      const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!existing) return false;

      const votes = JSON.parse(existing);
      return !!votes[pollId];
    } catch (e) {
      return false;
    }
  }

  private checkCookie(pollId: string): boolean {
    try {
      const existing = this.getCookie(COOKIE_NAME);
      if (!existing) return false;

      const votes = JSON.parse(existing);
      return !!votes[pollId];
    } catch (e) {
      return false;
    }
  }

  async clearVote(pollId: string): Promise<void> {
    await Promise.all([
      this.clearFromIndexedDB(pollId),
      this.clearFromLocalStorage(pollId),
      this.clearFromSessionStorage(pollId),
      this.clearFromCookie(pollId),
    ]);
  }

  private async clearFromIndexedDB(pollId: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.delete(pollId);

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  private clearFromLocalStorage(pollId: string): void {
    try {
      if (!window.localStorage) return;

      const existing = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!existing) return;

      const votes = JSON.parse(existing);
      delete votes[pollId];

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(votes));
    } catch (e) {
      console.error('localStorage clear error:', e);
    }
  }

  private clearFromSessionStorage(pollId: string): void {
    try {
      if (!window.sessionStorage) return;

      const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!existing) return;

      const votes = JSON.parse(existing);
      delete votes[pollId];

      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(votes));
    } catch (e) {
      console.error('sessionStorage clear error:', e);
    }
  }

  private clearFromCookie(pollId: string): void {
    try {
      const existing = this.getCookie(COOKIE_NAME);
      if (!existing) return;

      const votes = JSON.parse(existing);
      delete votes[pollId];

      this.setCookie(COOKIE_NAME, JSON.stringify(votes), COOKIE_DAYS);
    } catch (e) {
      console.error('Cookie clear error:', e);
    }
  }

  async getAllVotes(): Promise<VoteRecord[]> {
    if (!this.db) {
      try {
        await this.init();
      } catch (e) {
        return [];
      }
    }

    if (!this.db) return [];

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };
        request.onerror = () => {
          resolve([]);
        };
      } catch (e) {
        resolve([]);
      }
    });
  }

  async cleanupOldVotes(maxAge: number = 365 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) return;

    const cutoffTime = Date.now() - maxAge;

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const index = objectStore.index('timestamp');
        const range = IDBKeyRange.upperBound(cutoffTime);
        const request = index.openCursor(range);

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }
}

export const voteStorage = new VoteStorage();
