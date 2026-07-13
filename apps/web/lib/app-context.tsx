"use client";

import {
  cloneDemoData,
  createRecordFromDraft,
  type AppData,
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
      const record = createRecordFromDraft(draft, vehicle.id, undefined, locale);
      persist({ ...data, records: [record, ...data.records] });
      return record;
    },
    [data, locale, persist],
  );

  const updateRecord = useCallback(
    (id: string, draft: RecordDraft) => {
      const previous = data.records.find((record) => record.id === id);
      if (!previous) return null;
      const updated = {
        ...createRecordFromDraft(draft, previous.vehicleId, id, previous.sourceLanguage),
        createdAt: previous.createdAt,
        isDemo: previous.isDemo,
      };
      persist({
        ...data,
        records: data.records.map((record) => (record.id === id ? updated : record)),
      });
      return updated;
    },
    [data, persist],
  );

  const resetDemo = useCallback(async () => {
    await dataProvider.reset();
    setData(cloneDemoData());
  }, []);

  const value = useMemo(
    () => ({ data, locale, hydrated, setLocale, addRecord, updateRecord, resetDemo }),
    [data, locale, hydrated, setLocale, addRecord, updateRecord, resetDemo],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}
