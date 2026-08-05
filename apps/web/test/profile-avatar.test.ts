import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const avatar = readFileSync(new URL("../components/profile-avatar.tsx", import.meta.url), "utf8");
const garage = readFileSync(new URL("../app/garage/page.tsx", import.meta.url), "utf8");

test("profile avatars sign private image paths and fall back on image failure", () => {
  assert.match(avatar, /createSignedUrl\(imagePath/);
  assert.match(avatar, /<img/);
  assert.match(avatar, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(avatar, /ProfileAvatarInitial/);
});

test("Garage connects the current owner profile to the shared avatar", () => {
  assert.match(garage, /import \{ ProfileAvatar \} from "@\/components\/profile-avatar"/);
  assert.match(garage, /imagePath=\{owner\?\.profileImagePath\}/);
});
