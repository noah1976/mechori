import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const content = read("../components/journal-content.tsx");
const media = read("../components/journal-media.tsx");
const css = read("../app/globals.css");

test("record body renders the saved content block order with body media", () => {
  assert.match(content, /contentBlocks\.map\(\(block\)/);
  assert.match(content, /body\n\s+locale/);
  assert.doesNotMatch(content, /journal\.media\.map/);
});

test("body media keeps intrinsic ratio and renders its description after the image", () => {
  assert.match(media, /body \? \(/);
  assert.match(media, /naturalWidth \/ event\.currentTarget\.naturalHeight/);
  assert.match(media, /className="journal-media-caption"/);
  assert.match(media, /<figcaption className="journal-media-caption">\{attachment\.altText\}<\/figcaption>/);
  assert.match(css, /\.journal-media\.body .*object-fit: initial/);
  assert.doesNotMatch(css, /\.journal-media\.body .*object-fit: (?:cover|contain)/);
});

test("body media is full width on mobile and applies aspect bounds only on desktop", () => {
  assert.match(css, /\.journal-detail \{ --journal-body-media-bleed: 38px;/);
  assert.match(css, /\.journal-content > \.journal-media\.body \{[\s\S]*inline-size: calc\(100% \+ var\(--journal-body-media-bleed\) \+ var\(--journal-body-media-bleed\)\);/);
  assert.match(css, /\.journal-content > \.journal-media\.body \{[\s\S]*max-inline-size: none;[\s\S]*align-self: stretch;[\s\S]*justify-self: stretch;/);
  assert.match(css, /\.journal-detail \{ --journal-body-media-bleed: 19px; padding: 25px 19px;/);
  assert.match(css, /\.journal-media\.body \.journal-media-item \{ width: 100%; min-width: 0; max-width: none; margin: 0;/);
  assert.match(css, /\.journal-media\.body \.journal-media-item img, \.journal-media\.body \.journal-media-item video \{ display: block; width: 100%; max-width: 100%; height: auto; margin: 0;/);
  const desktopBodyMedia = css.slice(css.indexOf("@media (min-width: 768px)"));
  assert.match(desktopBodyMedia, /body-portrait \{ max-width: 540px/);
  assert.match(desktopBodyMedia, /body-square \{ max-width: 720px/);
  assert.match(desktopBodyMedia, /body-landscape \{ max-width: 960px/);
  assert.match(css, /\.journal-media\.compact \.journal-media-item \{ aspect-ratio: 16 \/ 8; \}/);
});
