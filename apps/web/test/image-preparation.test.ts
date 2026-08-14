import assert from "node:assert/strict";
import test from "node:test";
import {
  imagePreparationMessageKey,
  maxSourceImageBytes,
  validateSourceImage,
} from "../lib/image-preparation.ts";

test("accepts common iPhone photo formats before browser-local preparation", () => {
  assert.equal(
    validateSourceImage({
      name: "IMG_0001.HEIC",
      size: 18 * 1024 * 1024,
      type: "image/heic",
    }),
    null,
  );
  assert.equal(
    validateSourceImage({
      name: "IMG_0002.heif",
      size: 18 * 1024 * 1024,
      type: "",
    }),
    null,
  );
  assert.equal(
    validateSourceImage({
      name: "IMG_0003.jpg",
      size: 24 * 1024 * 1024,
      type: "image/jpeg",
    }),
    null,
  );
});

test("rejects oversized and unsupported source files with specific messages", () => {
  assert.equal(
    validateSourceImage({
      name: "large.jpg",
      size: maxSourceImageBytes + 1,
      type: "image/jpeg",
    }),
    "image_too_large",
  );
  assert.equal(
    validateSourceImage({
      name: "camera-raw.dng",
      size: 20 * 1024 * 1024,
      type: "image/x-adobe-dng",
    }),
    "unsupported_image",
  );
  assert.equal(
    imagePreparationMessageKey(new Error("image_too_large")),
    "imageSourceTooLarge",
  );
  assert.equal(
    imagePreparationMessageKey(new Error("unsupported_image")),
    "imageSourceUnsupported",
  );
});
