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
  isFollowing,
  isProfileBlocked,
  updateCurrentProfileIdentity,
  updateCurrentProfileImage,
  updateCurrentProfilePrivacy,
  updateJournalInData,
  upsertJournalTranslationInData,
  isSignedIn,
  getPreferredVehicle,
  isSupportedUiLocale,
  parseStoredAuthSession,
  signedOutSession,
  type AlphaSharedJournal,
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
  type SocialProfile,
  type Vehicle,
  type VehicleCatalogResolutionOverride,
  type VehicleDraft,
  type VehicleOwnershipUpdate,
  type VehicleSpecificationUpdate,
} from "@mechori/core";
import { LocalStorageDataProvider } from "@mechori/shared";
import { loadAlphaAuthSession, signOutFromAlpha } from "@/lib/alpha-auth";
import { recordAlphaEngagement } from "@/lib/alpha-engagement";
import {
  loadMyAlphaUserFollows,
  setAlphaUserFollow,
} from "@/lib/alpha-user-follows";
import {
  loadMyAlphaProfileIdentity,
  removeMyAlphaProfileImage,
  replaceMyAlphaProfileImage,
  updateMyAlphaProfileIdentity,
  acceptAlphaContentPolicy,
} from "@/lib/alpha-profile";
import {
  loadAlphaJournalReactions,
  setAlphaJournalLike,
  type AlphaJournalReaction,
} from "@/lib/alpha-journal-likes";
import { loadAlphaPublicProfileImages } from "@/lib/alpha-public-owners";
import { loadAlphaWorkspace, saveAlphaWorkspace } from "@/lib/alpha-workspace";
import { journalMediaStore } from "@/lib/media-store";
import {
  alphaSharedJournalMediaAvailable,
  loadAlphaSharedJournals,
  publishAlphaSharedJournal,
  withdrawAlphaSharedJournal,
} from "@/lib/alpha-shared-journals";
import { getMechoriRuntime } from "@/lib/runtime-config";
import { clearAllLocalDrafts } from "@/lib/local-draft-store";
import { pushAnalyticsEvent } from "@/lib/analytics";
import { alphaJournalSyncError } from "@/lib/journal-save-error";
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
  useRef,
  useState,
  type ReactNode,
} from "react";

interface AppContextValue {
  data: AppData;
  locale: Locale;
  hydrated: boolean;
  isRemoteAlpha: boolean;
  alphaJournalSharingAvailable: boolean;
  alphaJournalMediaSharingAvailable: boolean;
  sharedJournals: GarageJournalPost[];
  sharedProfiles: SocialProfile[];
  authSession: AuthSession;
  signedIn: boolean;
  persistenceError: boolean;
  contentPolicyAccepted: boolean;
  setLocale(locale: Locale): void;
  signIn(provider: AuthProvider): void;
  signOut(): Promise<void>;
  clearPersistenceError(): void;
  addVehicle(
    draft: VehicleDraft,
    catalogResolution?: VehicleCatalogResolutionOverride,
  ): Promise<Vehicle>;
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
  updateProfileIdentity(
    displayName: string,
    publicUsername: string,
    bio: string,
  ): Promise<void>;
  updateProfileImage(file: File | null): Promise<void>;
  acceptContentPolicy(): Promise<void>;
  journalReaction(journalId: string): { appreciationCount: number; likedByMe: boolean };
  toggleJournalLike(journalId: string): Promise<void>;
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
export const alphaContentPolicyVersion = "alpha-public-content-v1";

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => cloneDemoData());
  const [locale, setLocaleState] = useState<Locale>("ja");
  const [authSession, setAuthSession] = useState<AuthSession>(signedOutSession);
  const [hydrated, setHydrated] = useState(false);
  const [persistenceError, setPersistenceError] = useState(false);
  const [alphaJournalSharingAvailable, setAlphaJournalSharingAvailable] = useState(
    !isRemoteAlpha,
  );
  const [
    alphaJournalMediaSharingAvailable,
    setAlphaJournalMediaSharingAvailable,
  ] = useState(!isRemoteAlpha);
  const [alphaSharedContent, setAlphaSharedContent] = useState<AlphaSharedJournal[]>([]);
  const [alphaJournalReactions, setAlphaJournalReactions] = useState<
    Map<string, AlphaJournalReaction>
  >(new Map());
  const journalLikeRequests = useRef(new Set<string>());
  const [contentPolicyAccepted, setContentPolicyAccepted] = useState(!isRemoteAlpha);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      const storedLocale = readStorageValue(localeKey) ?? readStorageValue(legacyLocaleKey);
      try {
        const storedAuthSession = isRemoteAlpha
          ? await loadAlphaAuthSession()
          : readStoredAuthSession();
        let storedData: AppData | null;
        let sharedContent: AlphaSharedJournal[] = [];
        if (isRemoteAlpha && isSignedIn(storedAuthSession)) {
          const [
            loadedWorkspace,
            identity,
            profileFollows,
            loadedSharedContent,
            reactions,
            mediaSharingAvailable,
            publicProfileImages,
          ] = await Promise.all([
            loadAlphaWorkspace(storedAuthSession.profileId),
            loadMyAlphaProfileIdentity().catch(() => null),
            loadMyAlphaUserFollows(storedAuthSession.profileId).catch(() => null),
            loadAlphaSharedJournals().catch(() => null),
            loadAlphaJournalReactions().catch(() => []),
            alphaSharedJournalMediaAvailable().catch(() => false),
            loadAlphaPublicProfileImages().catch(() => new Map<string, string>()),
          ]);
          storedData = loadedWorkspace;
          if (identity) {
            storedData = updateCurrentProfileIdentity(
              storedData,
              identity.displayName,
              identity.publicUsername,
              identity.bio,
            );
            if (identity.profileImagePath) {
              storedData = updateCurrentProfileImage(
                storedData,
                identity.profileImagePath,
              );
            }
            if (active) {
              setContentPolicyAccepted(
                identity.contentPolicyVersion === alphaContentPolicyVersion &&
                  Boolean(identity.contentPolicyAcceptedAt),
              );
            }
          }
          if (profileFollows) {
            storedData = {
              ...storedData,
              follows: [
                ...storedData.follows.filter(
                  (follow) => follow.targetType !== "profile",
                ),
                ...profileFollows,
              ],
            };
          }
          if (loadedSharedContent) {
            sharedContent = loadedSharedContent.map((item) => ({
              ...item,
              author: {
                ...item.author,
                profileImagePath: publicProfileImages.get(item.author.id),
              },
            }));
            if (active) setAlphaJournalSharingAvailable(true);
          } else if (active) {
            setAlphaJournalSharingAvailable(false);
          }
          if (active) {
            setAlphaJournalReactions(
              new Map(reactions.map((reaction) => [reaction.journalId, reaction])),
            );
            setAlphaJournalMediaSharingAvailable(mediaSharingAvailable);
          }
        } else {
          storedData = isRemoteAlpha ? null : await dataProvider.load();
        }

        if (!active) return;
        if (storedData) setData(storedData);
        setAlphaSharedContent(sharedContent);
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
        setAlphaSharedContent([]);
        setAlphaJournalReactions(new Map());
        setContentPolicyAccepted(!isRemoteAlpha);
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
        setAlphaSharedContent([]);
        setAlphaJournalReactions(new Map());
        setContentPolicyAccepted(!isRemoteAlpha);
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

  const refreshAlphaSharedContent = useCallback(async () => {
    if (!isRemoteAlpha || !isSignedIn(authSession)) return;
    try {
      const [sharedContent, reactions] = await Promise.all([
        loadAlphaSharedJournals(),
        loadAlphaJournalReactions().catch(() => []),
      ]);
      setAlphaSharedContent(sharedContent);
      setAlphaJournalReactions(
        new Map(reactions.map((reaction) => [reaction.journalId, reaction])),
      );
      setAlphaJournalSharingAvailable(true);
    } catch {
      setAlphaJournalSharingAvailable(false);
    }
  }, [authSession]);

  const recordEngagement = useCallback((name: EngagementEventName) => {
    if (!isSignedIn(authSession)) return;
    recordLocalEngagement(name);
    void recordAlphaEngagement(name).catch(() => undefined);
  }, [authSession]);

  const addVehicle = useCallback(
    async (
      draft: VehicleDraft,
      catalogResolution?: VehicleCatalogResolutionOverride,
    ) => {
      if (!isSignedIn(authSession)) throw new Error("authentication_required");
      if (isRemoteAlpha && !contentPolicyAccepted) {
        throw new Error("content_policy_acceptance_required");
      }
      const result = addVehicleToData(data, draft, catalogResolution);
      await persist(result.data);
      recordLocalEngagement("vehicle_created");
      void recordAlphaEngagement("vehicle_created").catch(() => undefined);
      pushAnalyticsEvent("vehicle_created", {
        vehicle_category: result.vehicle.vehicleCategory,
        ownership_type: result.vehicle.ownershipType,
      });
      return result.vehicle;
    },
    [authSession, contentPolicyAccepted, data, persist],
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
      if (isRemoteAlpha && !contentPolicyAccepted) {
        throw new Error("content_policy_acceptance_required");
      }
      const vehicle = data.vehicles.find((item) => item.id === vehicleId) ?? getPreferredVehicle(data.vehicles);
      if (!vehicle) throw new Error("A demo vehicle is required");
      const result = applyRecordDraftToData(data, draft, undefined, locale, vehicle.id);
      await persist(result.data);
      recordLocalEngagement("maintenance_saved");
      void recordAlphaEngagement("maintenance_saved").catch(() => undefined);
      pushAnalyticsEvent("maintenance_saved", {
        resolution_status: result.record.resolutionStatus,
      });
      return result.record;
    },
    [authSession, contentPolicyAccepted, data, locale, persist],
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
      if (isRemoteAlpha && !contentPolicyAccepted) {
        throw new Error("content_policy_acceptance_required");
      }
      if (isRemoteAlpha && draft.visibility === "public" && !alphaJournalSharingAvailable) {
        throw new Error("alpha_journal_sharing_unavailable");
      }
      const result = addJournalToData(data, draft, locale);
      if (
        isRemoteAlpha &&
        result.journal.visibility === "public" &&
        result.journal.media.some(
          (attachment) =>
            attachment.kind === "image" && attachment.privacyState === "public_ready",
        ) &&
        !alphaJournalMediaSharingAvailable
      ) {
        throw new Error("alpha_shared_image_sync_failed");
      }
      await Promise.all(
        uploads.map(({ attachment, blob }) => {
          if (!attachment.storageKey) throw new Error("media_storage_key_required");
          return journalMediaStore.save(attachment.storageKey, blob);
        }),
      );
      await persist(result.data);
      if (isRemoteAlpha && result.journal.visibility === "public") {
        const author = result.data.profiles.find(
          (profile) => profile.id === result.data.currentProfileId,
        );
        try {
          await publishAlphaSharedJournal(
            result.journal,
            author?.displayName ?? "MECHORI User",
          );
        } catch {
          await saveAlphaWorkspace(data);
          setData(data);
          await Promise.all(
            uploads
              .map(({ attachment }) => attachment.storageKey)
              .filter((key): key is string => Boolean(key))
              .map((key) => journalMediaStore.delete(key)),
          );
          throw new Error("alpha_shared_journal_publish_failed");
        }
        await refreshAlphaSharedContent();
      }
      recordLocalEngagement("journal_saved");
      void recordAlphaEngagement("journal_saved").catch(() => undefined);
      pushAnalyticsEvent("post_created", {
        visibility: result.journal.visibility,
        media_count: result.journal.media.length,
      });
      return result.journal;
    },
    [
      alphaJournalSharingAvailable,
      alphaJournalMediaSharingAvailable,
      authSession,
      contentPolicyAccepted,
      data,
      locale,
      persist,
      refreshAlphaSharedContent,
    ],
  );

  const updateJournal = useCallback(
    async (id: string, draft: JournalDraft, uploads: JournalMediaUpload[] = []) => {
      if (!isSignedIn(authSession)) throw new Error("authentication_required");
      const previous = data.journals.find((journal) => journal.id === id);
      if (!previous) throw new Error("journal_not_found");
      if (
        isRemoteAlpha &&
        (draft.visibility === "public" || previous.visibility === "public") &&
        !alphaJournalSharingAvailable
      ) {
        throw new Error("alpha_journal_sharing_unavailable");
      }
      const result = updateJournalInData(data, id, draft);
      if (
        isRemoteAlpha &&
        result.journal.visibility === "public" &&
        result.journal.media.some(
          (attachment) =>
            attachment.kind === "image" && attachment.privacyState === "public_ready",
        ) &&
        !alphaJournalMediaSharingAvailable
      ) {
        throw new Error("alpha_shared_image_sync_failed");
      }
      await Promise.all(
        uploads.map(({ attachment, blob }) => {
          if (!attachment.storageKey) throw new Error("media_storage_key_required");
          return journalMediaStore.save(attachment.storageKey, blob);
        }),
      );
      await persist(result.data);
      if (isRemoteAlpha) {
        try {
          if (result.journal.visibility === "public") {
            const author = result.data.profiles.find(
              (profile) => profile.id === result.data.currentProfileId,
            );
            const previousSharedJournal = alphaSharedContent.find(
              (item) => item.journal.id === result.journal.id,
            )?.journal;
            await publishAlphaSharedJournal(
              result.journal,
              author?.displayName ?? "MECHORI User",
              previousSharedJournal,
            );
          } else if (previous.visibility === "public") {
            await withdrawAlphaSharedJournal(result.journal.id);
          }
        } catch (error) {
          await saveAlphaWorkspace(data);
          setData(data);
          await Promise.all(
            uploads
              .map(({ attachment }) => attachment.storageKey)
              .filter((key): key is string => Boolean(key))
              .map((key) => journalMediaStore.delete(key)),
          );
          throw alphaJournalSyncError(error);
        }
        await refreshAlphaSharedContent();
      }
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
    [
      alphaJournalSharingAvailable,
      alphaJournalMediaSharingAvailable,
      alphaSharedContent,
      authSession,
      data,
      persist,
      refreshAlphaSharedContent,
    ],
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
      const following = isFollowing(data, targetType, targetId);
      const nextData = toggleFollowInData(data, targetType, targetId);
      if (nextData === data) return;
      void (async () => {
        if (isRemoteAlpha && targetType === "profile") {
          await setAlphaUserFollow(targetId, !following);
        }
        await persist(nextData);
        if (!following) {
          pushAnalyticsEvent(
            targetType === "profile" ? "user_followed" : "vehicle_followed",
          );
        }
      })().catch(() => setPersistenceError(true));
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
      const blocking = !isProfileBlocked(data, profileId);
      const relatedVehicleTargetIds = alphaSharedContent
        .filter((item) => item.journal.authorProfileId === profileId)
        .flatMap((item) =>
          item.journal.vehicleTargetId ? [item.journal.vehicleTargetId] : [],
        );
      const nextData = toggleBlockProfileInData(
        data,
        profileId,
        new Date().toISOString(),
        relatedVehicleTargetIds,
      );
      void (async () => {
        if (
          isRemoteAlpha &&
          blocking &&
          isFollowing(data, "profile", profileId)
        ) {
          await setAlphaUserFollow(profileId, false);
        }
        await persist(nextData);
      })().catch(() => setPersistenceError(true));
    },
    [alphaSharedContent, authSession, data, persist],
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

  const updateProfileIdentity = useCallback(
    async (displayName: string, publicUsername: string, bio: string) => {
      if (!isSignedIn(authSession)) throw new Error("authentication_required");
      if (isRemoteAlpha) {
        const identity = await updateMyAlphaProfileIdentity(
          displayName,
          publicUsername,
          bio,
        );
        setData((current) =>
          updateCurrentProfileIdentity(
            current,
            identity.displayName,
            identity.publicUsername,
            identity.bio,
          ),
        );
        setPersistenceError(false);
        return;
      }
      await persist(
        updateCurrentProfileIdentity(data, displayName, publicUsername, bio),
      );
    },
    [authSession, data, persist],
  );

  const updateProfileImage = useCallback(
    async (file: File | null) => {
      if (!isSignedIn(authSession)) throw new Error("authentication_required");
      if (!isRemoteAlpha) throw new Error("profile_image_remote_alpha_required");
      const previousPath = data.profiles.find(
        (profile) => profile.id === data.currentProfileId,
      )?.profileImagePath;
      const nextPath = file
        ? await replaceMyAlphaProfileImage(file, previousPath)
        : undefined;
      if (!file) await removeMyAlphaProfileImage(previousPath);
      setData((current) => updateCurrentProfileImage(current, nextPath));
      setPersistenceError(false);
    },
    [authSession, data],
  );

  const acceptContentPolicy = useCallback(async () => {
    if (!isSignedIn(authSession)) throw new Error("authentication_required");
    if (isRemoteAlpha) {
      await acceptAlphaContentPolicy(alphaContentPolicyVersion);
    }
    setContentPolicyAccepted(true);
    pushAnalyticsEvent("content_policy_accepted", {
      policy_version: alphaContentPolicyVersion,
    });
  }, [authSession]);

  const journalReaction = useCallback((journalId: string) => {
    const reaction = alphaJournalReactions.get(journalId);
    return {
      appreciationCount: reaction?.appreciationCount ?? 0,
      likedByMe: reaction?.likedByMe ?? false,
    };
  }, [alphaJournalReactions]);

  const toggleJournalLike = useCallback(async (journalId: string) => {
    if (!isRemoteAlpha || !isSignedIn(authSession)) return;
    if (journalLikeRequests.current.has(journalId)) return;
    const shared = alphaSharedContent.find((item) => item.journal.id === journalId);
    if (!shared || shared.journal.authorProfileId === data.currentProfileId) return;
    journalLikeRequests.current.add(journalId);
    const previous = alphaJournalReactions.get(journalId) ?? {
      shareId: shared.shareId,
      journalId,
      appreciationCount: 0,
      likedByMe: false,
    };
    const nextLiked = !previous.likedByMe;
    setAlphaJournalReactions((current) => {
      const next = new Map(current);
      next.set(journalId, {
        ...previous,
        appreciationCount: Math.max(
          0,
          previous.appreciationCount + (nextLiked ? 1 : -1),
        ),
        likedByMe: nextLiked,
      });
      return next;
    });
    try {
      const saved = await setAlphaJournalLike(shared.shareId, nextLiked);
      const result: AlphaJournalReaction = {
        shareId: shared.shareId,
        journalId,
        ...saved,
      };
      setAlphaJournalReactions((current) => {
        const next = new Map(current);
        next.set(journalId, result);
        return next;
      });
      if (result.likedByMe) pushAnalyticsEvent("like_added");
    } catch (error) {
      setAlphaJournalReactions((current) => {
        const next = new Map(current);
        next.set(journalId, previous);
        return next;
      });
      throw error;
    } finally {
      journalLikeRequests.current.delete(journalId);
    }
  }, [alphaJournalReactions, alphaSharedContent, authSession, data.currentProfileId]);

  const resetDemo = useCallback(async () => {
    try {
      if (isRemoteAlpha && isSignedIn(authSession)) {
        const emptyData = createEmptyAppData(authSession.profileId);
        const sharedJournalIds = alphaJournalSharingAvailable
          ? data.journals
              .filter((journal) => journal.visibility === "public")
              .map((journal) => journal.id)
          : [];
        await Promise.all([
          saveAlphaWorkspace(emptyData),
          journalMediaStore.reset(),
          ...sharedJournalIds.map(withdrawAlphaSharedJournal),
        ]);
        setData(emptyData);
        setAlphaSharedContent([]);
        setAlphaJournalReactions(new Map());
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
  }, [alphaJournalSharingAvailable, authSession, data.journals]);

  const value = useMemo(
    () => ({
      data,
      locale,
      hydrated,
      isRemoteAlpha,
      alphaJournalSharingAvailable,
      alphaJournalMediaSharingAvailable,
      sharedJournals: alphaSharedContent.map((item) => item.journal),
      sharedProfiles: [
        ...new Map(
          alphaSharedContent.map((item) => [item.author.id, item.author]),
        ).values(),
      ],
      authSession,
      signedIn: isSignedIn(authSession),
      persistenceError,
      contentPolicyAccepted,
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
      updateProfileIdentity,
      updateProfileImage,
      acceptContentPolicy,
      journalReaction,
      toggleJournalLike,
      recordEngagement,
      resetDemo,
    }),
    [
      data,
      locale,
      hydrated,
      authSession,
      alphaJournalSharingAvailable,
      alphaJournalMediaSharingAvailable,
      alphaSharedContent,
      persistenceError,
      contentPolicyAccepted,
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
      updateProfileIdentity,
      updateProfileImage,
      acceptContentPolicy,
      journalReaction,
      toggleJournalLike,
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
