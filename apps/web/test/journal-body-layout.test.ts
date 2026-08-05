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

test("body media has responsive portrait, square, and landscape bounds without changing compact thumbnails", () => {
  assert.match(css, /\.journal-media\.body .*body-portrait.*max-width: 540px/);
  assert.match(css, /\.journal-media\.body .*body-square.*max-width: 720px/);
  assert.match(css, /\.journal-media\.body .*body-landscape.*max-width: 960px/);
  assert.match(css, /\.journal-media\.body .*width: 100%/);
  assert.match(css, /\.journal-media\.compact \.journal-media-item \{ aspect-ratio: 16 \/ 8; \}/);
});
