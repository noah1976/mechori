import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const avatar = readFileSync(new URL("../components/profile-avatar.tsx", import.meta.url), "utf8");
const alphaProfile = readFileSync(new URL("../lib/alpha-profile.ts", import.meta.url), "utf8");
const appShell = readFileSync(new URL("../components/app-shell.tsx", import.meta.url), "utf8");
const garage = readFileSync(new URL("../app/garage/page.tsx", import.meta.url), "utf8");
const publicProfile = readFileSync(new URL("../app/profile/[id]/page.tsx", import.meta.url), "utf8");
const journalCard = readFileSync(new URL("../components/journal-card.tsx", import.meta.url), "utf8");
const journalDetail = readFileSync(new URL("../app/journal/[id]/page.tsx", import.meta.url), "utf8");

test("profile avatars download private image paths and render the resulting blob URL", () => {
  assert.match(avatar, /getAvatarObjectUrl\(imagePath/);
  assert.match(avatar, /useSyncExternalStore/);
  assert.match(avatar, /invalidateAvatarCache\(imagePath\)/);
  assert.doesNotMatch(avatar, /URL\.revokeObjectURL\(objectUrl\)/);
  assert.doesNotMatch(avatar, /setSource\(null\)/);
  assert.match(avatar, /setFailed\(false\)/);
  assert.doesNotMatch(avatar, /createSignedUrl\(imagePath/);
  assert.match(avatar, /<img/);
  assert.match(avatar, /src=\{source\}/);
  assert.match(avatar, /onError=\{\(\) => \{/);
  assert.match(avatar, /ProfileAvatarInitial/);
});

test("Garage connects the current owner profile to the shared avatar", () => {
  assert.match(garage, /import \{ ProfileAvatar \} from "@\/components\/profile-avatar"/);
  assert.match(garage, /imagePath=\{owner\?\.profileImagePath\}/);
});

test("saved profile image paths reach every primary Avatar surface", () => {
  assert.match(alphaProfile, /get_my_alpha_profile_image/);
  assert.match(alphaProfile, /profileImagePath:/);
  assert.match(alphaProfile, /update_my_alpha_profile_image/);
  assert.match(appShell, /imagePath=\{currentProfile\?\.profileImagePath\}/);
  assert.match(publicProfile, /imagePath=\{profile\.profileImagePath\}/);
  assert.match(journalCard, /imagePath=\{author\?\.profileImagePath\}/);
  assert.match(journalDetail, /imagePath=\{author\?\.profileImagePath\}/);
});
