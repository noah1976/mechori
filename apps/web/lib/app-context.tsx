"use client";

import {
  cloneDemoData,
  applyRecordDraftToData,
  addJournalToData,
  toggleFollowInData,
  type AppData,
  type FollowTargetType,
  type GarageJournalPost,
  type JournalDraft,
  type JournalMediaAttachment,
  type Locale,
  type MaintenanceRecord,
  type RecordDraft,
} from "@mechori/core";
import { LocalStorageDataProvider } from "@mechori/shared";
import { journalMediaStore } from "@/lib/media-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AppContextValue {
  data: AppData;
  locale: Locale;
  hydrated: boolean;
  setLocale(locale: Locale): void;
  addRecord(draft: RecordDraft): MaintenanceRecord;
  updateRecord(id: string, draft: RecordDraft): MaintenanceRecord | null;
  addJournal(
    draft: JournalDraft,
    uploads?: JournalMediaUpload[],
  ): Promise<GarageJournalPost>;
  toggleFollow(targetType: FollowTargetType, targetId: string): void;
  resetDemo(): Promise<void>;
}

export interface JournalMediaUpload {
  attachment: JournalMediaAttachment;
  blob: Blob;
}

const AppContext = createContext<AppContextValue | null>(null);
const dataProvider = new LocalStorageDataProvider();
const localeKey = "mechori.prototype.locale";
const legacyLocaleKey = "mechory.prototype.locale";

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => cloneDemoData());
  const [locale, setLocaleState] = useState<Locale>("ja");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      dataProvider.load(),
      Promise.resolve(
        window.localStorage.getItem(localeKey) ??
          window.localStorage.getItem(legacyLocaleKey),
      ),
    ]).then(([storedData, storedLocale]) => {
      if (!active) return;
      if (storedData) setData(storedData);
      if (storedLocale === "ja" || storedLocale === "en") {
        setLocaleState(storedLocale);
        window.localStorage.setItem(localeKey, storedLocale);
        window.localStorage.removeItem(legacyLocaleKey);
      }
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((nextData: AppData) => {
    setData(nextData);
    void dataProvider.save(nextData);
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(localeKey, nextLocale);
  }, []);

  const addRecord = useCallback(
    (draft: RecordDraft) => {
      const vehicle = data.vehicles[0];
      if (!vehicle) throw new Error("A demo vehicle is required");
      const result = applyRecordDraftToData(data, draft, undefined, locale);
      persist(result.data);
      return result.record;
    },
    [data, locale, persist],
  );

  const updateRecord = useCallback(
    (id: string, draft: RecordDraft) => {
      const previous = data.records.find((record) => record.id === id);
      if (!previous) return null;
      const result = applyRecordDraftToData(data, draft, id, previous.sourceLanguage);
      persist(result.data);
      return result.record;
    },
    [data, persist],
  );

  const addJournal = useCallback(
    async (draft: JournalDraft, uploads: JournalMediaUpload[] = []) => {
      await Promise.all(
        uploads.map(({ attachment, blob }) => {
          if (!attachment.storageKey) throw new Error("media_storage_key_required");
          return journalMediaStore.save(attachment.storageKey, blob);
        }),
      );
      const result = addJournalToData(data, draft, locale);
      persist(result.data);
      return result.journal;
    },
    [data, locale, persist],
  );

  const toggleFollow = useCallback(
    (targetType: FollowTargetType, targetId: string) => {
      persist(toggleFollowInData(data, targetType, targetId));
    },
    [data, persist],
  );

  const resetDemo = useCallback(async () => {
    await Promise.all([dataProvider.reset(), journalMediaStore.reset()]);
    setData(cloneDemoData());
  }, []);

  const value = useMemo(
    () => ({
      data,
      locale,
      hydrated,
      setLocale,
      addRecord,
      updateRecord,
      addJournal,
      toggleFollow,
      resetDemo,
    }),
    [
      data,
      locale,
      hydrated,
      setLocale,
      addRecord,
      updateRecord,
      addJournal,
      toggleFollow,
      resetDemo,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}
