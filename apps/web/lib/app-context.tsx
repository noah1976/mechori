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
  type Locale,
  type MaintenanceRecord,
  type RecordDraft,
} from "@mechory/core";
import { LocalStorageDataProvider } from "@mechory/shared";
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
  addJournal(draft: JournalDraft): GarageJournalPost;
  toggleFollow(targetType: FollowTargetType, targetId: string): void;
  resetDemo(): Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);
const dataProvider = new LocalStorageDataProvider();
const localeKey = "mechory.prototype.locale";

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => cloneDemoData());
  const [locale, setLocaleState] = useState<Locale>("ja");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      dataProvider.load(),
      Promise.resolve(window.localStorage.getItem(localeKey)),
    ]).then(([storedData, storedLocale]) => {
      if (!active) return;
      if (storedData) setData(storedData);
      if (storedLocale === "ja" || storedLocale === "en") {
        setLocaleState(storedLocale);
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
    (draft: JournalDraft) => {
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
    await dataProvider.reset();
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
