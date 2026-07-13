import type { AppData } from "@mechory/core";

export interface DataProvider {
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  reset(): Promise<void>;
}

export class LocalStorageDataProvider implements DataProvider {
  constructor(private readonly storageKey = "mechory.prototype.v1") {}

  async load(): Promise<AppData | null> {
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AppData;
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
