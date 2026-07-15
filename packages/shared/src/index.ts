import { migrateAppData, type AppData } from "@mechory/core";

export interface DataProvider {
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  reset(): Promise<void>;
}

export interface MediaBlobProvider {
  load(key: string): Promise<Blob | null>;
  save(key: string, value: Blob): Promise<void>;
  delete(key: string): Promise<void>;
  reset(): Promise<void>;
}

export class IndexedDbMediaProvider implements MediaBlobProvider {
  constructor(
    private readonly databaseName = "mechory.prototype.media",
    private readonly storeName = "blobs",
  ) {}

  async load(key: string): Promise<Blob | null> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const request = database.transaction(this.storeName, "readonly").objectStore(this.storeName).get(key);
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
      request.onerror = () => reject(request.error ?? new Error("media_load_failed"));
    });
  }

  async save(key: string, value: Blob): Promise<void> {
    const database = await this.open();
    await this.request(database.transaction(this.storeName, "readwrite").objectStore(this.storeName).put(value, key));
  }

  async delete(key: string): Promise<void> {
    const database = await this.open();
    await this.request(database.transaction(this.storeName, "readwrite").objectStore(this.storeName).delete(key));
  }

  async reset(): Promise<void> {
    const database = await this.open();
    await this.request(database.transaction(this.storeName, "readwrite").objectStore(this.storeName).clear());
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.databaseName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(this.storeName)) {
          request.result.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("media_database_open_failed"));
    });
  }

  private request(request: IDBRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("media_write_failed"));
    });
  }
}

export class LocalStorageDataProvider implements DataProvider {
  constructor(private readonly storageKey = "mechory.prototype.v1") {}

  async load(): Promise<AppData | null> {
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return null;
    try {
      const migrated = migrateAppData(JSON.parse(raw));
      if (!migrated) throw new Error("invalid_local_data");
      if (JSON.stringify(migrated) !== raw) {
        window.localStorage.setItem(this.storageKey, JSON.stringify(migrated));
      }
      return migrated;
    } catch {
      window.localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  async save(data: AppData): Promise<void> {
    window.localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  async reset(): Promise<void> {
    window.localStorage.removeItem(this.storageKey);
  }
}
