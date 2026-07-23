"use client";

import {
  cloneDemoData,
  createAuthSession,
  createEmptyAppData,
  addVehicleToData,
  applyRecordDraftToData,
  addJournalToData,
  applyModerationAction,
  submitContentReport,
  toggleBlockProfileInData,
  toggleFollowInData,
  toggleMuteProfileInData,
  updateVehicleOwnershipInData,
  updateVehicleSpecificationInData,
  updateCurrentProfilePrivacy,
  updateJournalInData,
  upsertJournalTranslationInData,
  isSignedIn,
  getPreferredVehicle,
  isSupportedUiLocale,
  parseStoredAuthSession,
  signedOutSession,
  type AppData,
  type AuthProvider,
  type AuthSession,
  type ContentReport,
  type ContentReportDraft,
  type EngagementEventName,
  type FollowTargetType,
  type GarageJournalPost,
  type JournalDraft,
  type JournalMediaAttachment,
  type JournalTranslationDraft,
  type Locale,
  type MaintenanceRecord,
  type ModerationAction,
  type ProfileDisplayField,
  type ProfileVisibility,
  type RecordDraft,
  type Vehicle,
  type VehicleDraft,
  type VehicleOwnershipUpdate,
  type VehicleSpecificationUpdate,
} from "@mechori/core";
import { LocalStorageDataProvider } from "@mechori/shared";
import { loadAlphaAuthSession, signOutFromAlpha } from "@/lib/alpha-auth";
import { recordAlphaEngagement } from "@/lib/alpha-engagement";
import { loadAlphaWorkspace, saveAlphaWorkspace } from "@/lib/alpha-workspace";
import { journalMediaStore } from "@/lib/media-store";
import { getMechoriRuntime } from "@/lib/runtime-config";
import { clearAllLocalDrafts } from "@/lib/local-draft-store";
import {
  recordLocalEngagement,
  resetLocalEngagement,
} from "@/lib/local-engagement-store";
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
  isRemoteAlpha: boolean;
  authSession: AuthSession;
  signedIn: boolean;
  persistenceError: boolean;
  setLocale(locale: Locale): void;
  signIn(provider: AuthProvider): void;
  signOut(): Promise<void>;
  clearPersistenceError(): void;
  addVehicle(draft: VehicleDraft): Promise<Vehicle>;
  updateVehicleOwnership(vehicleId: string, update: VehicleOwnershipUpdate): Promise<Vehicle>;
  updateVehicleSpecification(vehicleId: string, update: VehicleSpecificationUpdate): Promise<Vehicle>;
  addRecord(draft: RecordDraft, vehicleId?: string): Promise<MaintenanceRecord>;
  updateRecord(id: string, draft: RecordDraft): Promise<MaintenanceRecord | null>;
  addJournal(
    draft: JournalDraft,
    uploads?: JournalMediaUpload[],
  ): Promise<GarageJournalPost>;
  updateJournal(
    id: string,
    draft: JournalDraft,
    uploads?: JournalMediaUpload[],
  ): Promise<GarageJournalPost>;
  updateJournalTranslation(id: string, draft: JournalTranslationDraft): Promise<void>;
  toggleFollow(targetType: FollowTargetType, targetId: string): void;
  toggleMuteProfile(profileId: string): void;
  toggleBlockProfile(profileId: string): void;
  submitReport(draft: ContentReportDraft): Promise<ContentReport>;
  moderateReport(
    reportId: string,
    action: Exclude<ModerationAction, "submitted">,
  ): Promise<void>;
  updateProfilePrivacy(
    visibility: ProfileVisibility,
    displayFields: ProfileDisplayField[],
  ): Promise<void>;
  recordEngagement(name: EngagementEventName): void;
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
const authKey = "mechori.prototype.auth-session";
const runtime = getMechoriRuntime();
const isRemoteAlpha = runtime === "alpha";

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => cloneDemoData());
  const [locale, setLocaleState] = useState<Locale>("ja");
  const [authSession, setAuthSession] = useState<AuthSession>(signedOutSession);
  const [hydrated, setHydrated] = useState(false);
  const [persistenceError, setPersistenceError] = useState(false);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      const storedLocale = readStorageValue(localeKey) ?? readStorageValue(legacyLocaleKey);
      try {
        const storedAuthSession = isRemoteAlpha
          ? await loadAlphaAuthSession()
          : readStoredAuthSession();
        const storedData = isRemoteAlpha
          ? isSignedIn(storedAuthSession)
            ? await loadAlphaWorkspace(storedAuthSession.profileId)
            : null
          : await dataProvider.load();

        if (!active) return;
        if (storedData) setData(storedData);
        setAuthSession(storedAuthSession);
        if (isSupportedUiLocale(storedLocale)) {
          setLocaleState(storedLocale);
          try {
            window.localStorage.setItem(localeKey, storedLocale);
            window.localStorage.removeItem(legacyLocaleKey);
          } catch {
            setPersistenceError(true);
          }
        }
      } catch {
        if (!active) return;
        setAuthSession(signedOutSession);
        setData(cloneDemoData());
        setPersistenceError(true);
      } finally {
        if (active) setHydrated(true);
      }
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (hydrated && isSignedIn(authSession)) {
      recordLocalEngagement("session_started");
      void recordAlphaEngagement("session_started").catch(() => undefined);
    }
  }, [authSession, hydrated]);

  useEffect(() => {
    if (isRemoteAlpha) return;
    function syncAuthSession(event: StorageEvent) {
      if (event.key !== authKey) return;
      setAuthSession(parseStoredAuthSession(event.newValue));
    }

    window.addEventListener("storage", syncAuthSession);
    return () => window.removeEventListener("storage", syncAuthSession);
  }, []);

  const persist = useCallback(async (nextData: AppData) => {
    try {
      if (isRemoteAlpha) await saveAlphaWorkspace(nextData);
      else await dataProvider.save(nextData);
      setData(nextData);
      setPersistenceError(false);
    } catch {
      setPersistenceError(true);
      throw new Error("persistence_failed");
    }
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try {
      window.localStorage.setItem(localeKey, nextLocale);
    } catch {
      setPersistenceError(true);
    }
  }, []);

  const signIn = useCallback((provider: AuthProvider) => {
    if (isRemoteAlpha) throw new Error("alpha_oauth_required");
    const nextSession = createAuthSession(provider, data.currentProfileId);
    setAuthSession(nextSession);
    try {
      window.localStorage.setItem(authKey, JSON.stringify(nextSession));
    } catch {
      setPersistenceError(true);
    }
  }, [data.currentProfileId]);

  const signOut = useCallback(async () => {
    try {
      if (isRemoteAlpha) {
        await signOutFromAlpha();
        setData(cloneDemoData());
      } else {
        window.localStorage.setItem(authKey, JSON.stringify(signedOutSession));
      }
      setAuthSession(signedOutSession);
    } catch {
      setPersistenceError(true);
      throw new Error("sign_out_failed");
    }
  }, []);

  const clearPersistenceError = useCallback(() => setPersistenceError(false), []);

  const recordEngagement = useCallback((name: EngagementEventName) => {
    if (!isSignedIn(authSession)) return;
    recordLocalEngagement(name);
    void recordAlphaEngagement(name).catch(() => undefined);
  }, [authSession]);

  const addVehicle = useCallback(
    async (draft: VehicleDraft) => {
      if (!isSignedIn(authSession)) throw new Error("authentication_required");
      const result = addVehicleToData(data, draft);
      await persist(result.data);
      recordLocalEngagement("vehicle_created");
      void recordAlphaEngagement("vehicle_created").catch(() => undefined);
      return result.vehicle;
    },
    [authSession, data, persist],
  );

  const updateVehicleOwnership = useCallback(
    async (vehicleId: string, update: VehicleOwnershipUpdate) => {
      if (!isSignedIn(authSession)) throw new Error("authentication_required");
      const result = updateVehicleOwnershipInData(data, vehicleId, update);
      await persist(result.data);
      return result.vehicle;
    },
    [authSession, data, persist],
  );

  const updateVehicleSpecification = useCallback(
    async (vehicleId: string, update: VehicleSpecificationUpdate) => {
      if (!isSignedIn(authSession)) throw new Error("authentication_required");
      const result = updateVehicleSpecificationInData(data, vehicleId, update);
      await persist(result.data);
      return result.vehicle;
    },
    [authSession, data, persist],
  );

  const addRecord = useCallback(
    async (draft: RecordDraft, vehicleId?: string) => {
      if (!isSignedIn(authSession)) throw new Error("authentication_required");
      const vehicle = data.vehicles.find((item) => item.id === vehicleId) ?? getPreferredVehicle(data.vehicles);
      if (!vehicle) throw new Error("A demo vehicle is required");
      const result = applyRecordDraftToData(data, draft, undefined, locale, vehicle.id);
      await persist(result.data);
      recordLocalEngagement("maintenance_saved");
      void recordAlphaEngagement("maintenance_saved").catch(() => undefined);
      return result.record;
    },
    [authSession, data, locale, persist],
  );

  const updateRecord = useCallback(
    async (id: string, draft: RecordDraft) => {
      if (!isSignedIn(authSession)) throw new Error("authentication_required");
      const previous = data.records.find((record) => record.id === id);
      if (!previous) return null;
      const result = applyRecordDraftToData(data, draft, id, previous.sourceLanguage);
      await persist(result.data);
      recordLocalEngagement("maintenance_saved");
      void recordAlphaEngagement("maintenance_saved").catch(() => undefined);
      if (previous.resolutionStatus === "unresolved" && result.record.resolutionStatus === "resolved") {
        recordLocalEngagement("result_followed_up");
        void recordAlphaEngagement("result_followed_up").catch(() => undefined);
      }
      return result.record;
    },
    [authSession, data, persist],
  );

  const addJournal = useCallback(
    async (draft: JournalDraft, uploads: JournalMediaUpload[] = []) => {
      if (!isSignedIn(authSession)) throw new Error("authentication_required");
      await Promise.all(
        uploads.map(({ attachment, blob }) => {
          if (!attachment.storageKey) throw new Error("media_storage_key_required");
          return journalMediaStore.save(attachment.storageKey, blob);
        }),
      );
      const result = addJournalToData(data, draft, locale);
      await persist(result.data);
      recordLocalEngagement("journal_saved");
      void recordAlphaEngagement("journal_saved").catch(() => undefined);
      return result.journal;
    },
    [authSession, data, locale, persist],
  );

  const updateJournal = useCallback(
    async (id: string, draft: JournalDraft, uploads: JournalMediaUpload[] = []) => {
      if (!isSignedIn(authSession)) throw new Error("authentication_required");
      const previous = data.journals.find((journal) => journal.id === id);
      if (!previous) throw new Error("journal_not_found");
      await Promise.all(
        uploads.map(({ attachment, blob }) => {
          if (!attachment.storageKey) throw new Error("media_storage_key_required");
          return journalMediaStore.save(attachment.storageKey, blob);
        }),
      );
      const result = updateJournalInData(data, id, draft);
      await persist(result.data);
      const retainedStorageKeys = new Set(
        result.journal.media.map((attachment) => attachment.storageKey).filter(Boolean),
      );
      await Promise.all(
        previous.media
          .map((attachment) => attachment.storageKey)
          .filter((key): key is string => Boolean(key) && !retainedStorageKeys.has(key))
          .map((key) => journalMediaStore.delete(key)),
      );
      recordLocalEngagement("journal_saved");
      void recordAlphaEngagement("journal_saved").catch(() => undefined);
      return result.journal;
    },
    [authSession, data, persist],
  );

  const updateJournalTranslation = useCallback(
    async (id: string, draft: JournalTranslationDraft) => {
      if (!isSignedIn(authSession)) throw new Error("authentication_required");
      await persist(upsertJournalTranslationInData(data, id, draft));
    },
    [authSession, data, persist],
  );

  const toggleFollow = useCallback(
    (targetType: FollowTargetType, targetId: string) => {
      if (!isSignedIn(authSession)) return;
      void persist(toggleFollowInData(data, targetType, targetId)).catch(() => undefined);
    },
    [authSession, data, persist],
  );

  const toggleMuteProfile = useCallback(
    (profileId: string) => {
      if (!isSignedIn(authSession)) return;
      void persist(toggleMuteProfileInData(data, profileId)).catch(() => undefined);
    },
    [authSession, data, persist],
  );

  const toggleBlockProfile = useCallback(
    (profileId: string) => {
      if (!isSignedIn(authSession)) return;
      void persist(toggleBlockProfileInData(data, profileId)).catch(() => undefined);
    },
    [authSession, data, persist],
  );

  const submitReport = useCallback(
    async (draft: ContentReportDraft) => {
      if (!isSignedIn(authSession)) throw new Error("authentication_required");
      const result = submitContentReport(data, draft);
      await persist(result.data);
      return result.report;
    },
    [authSession, data, persist],
  );

  const moderateReport = useCallback(
    async (
      reportId: string,
      action: Exclude<ModerationAction, "submitted">,
    ) => {
      if (!isSignedIn(authSession)) throw new Error("authentication_required");
      await persist(applyModerationAction(data, reportId, action));
    },
    [authSession, data, persist],
  );

  const updateProfilePrivacy = useCallback(
    async (visibility: ProfileVisibility, displayFields: ProfileDisplayField[]) => {
      if (!isSignedIn(authSession)) throw new Error("authentication_required");
      await persist(updateCurrentProfilePrivacy(data, visibility, displayFields));
    },
    [authSession, data, persist],
  );

  const resetDemo = useCallback(async () => {
    try {
      if (isRemoteAlpha && isSignedIn(authSession)) {
        const emptyData = createEmptyAppData(authSession.profileId);
        await Promise.all([saveAlphaWorkspace(emptyData), journalMediaStore.reset()]);
        setData(emptyData);
      } else {
        await Promise.all([dataProvider.reset(), journalMediaStore.reset()]);
        setData(cloneDemoData());
      }
      if (!clearAllLocalDrafts()) throw new Error("local_draft_reset_failed");
      resetLocalEngagement();
      setPersistenceError(false);
    } catch {
      setPersistenceError(true);
      throw new Error("local_reset_failed");
    }
  }, [authSession]);

  const value = useMemo(
    () => ({
      data,
      locale,
      hydrated,
      isRemoteAlpha,
      authSession,
      signedIn: isSignedIn(authSession),
      persistenceError,
      setLocale,
      signIn,
      signOut,
      clearPersistenceError,
      addVehicle,
      updateVehicleOwnership,
      updateVehicleSpecification,
      addRecord,
      updateRecord,
      addJournal,
      updateJournal,
      updateJournalTranslation,
      toggleFollow,
      toggleMuteProfile,
      toggleBlockProfile,
      submitReport,
      moderateReport,
      updateProfilePrivacy,
      recordEngagement,
      resetDemo,
    }),
    [
      data,
      locale,
      hydrated,
      authSession,
      persistenceError,
      setLocale,
      signIn,
      signOut,
      clearPersistenceError,
      addVehicle,
      updateVehicleOwnership,
      updateVehicleSpecification,
      addRecord,
      updateRecord,
      addJournal,
      updateJournal,
      updateJournalTranslation,
      toggleFollow,
      toggleMuteProfile,
      toggleBlockProfile,
      submitReport,
      moderateReport,
      updateProfilePrivacy,
      recordEngagement,
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

function readStoredAuthSession(): AuthSession {
  return parseStoredAuthSession(readStorageValue(authKey));
}

function readStorageValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
