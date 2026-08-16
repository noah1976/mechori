import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("selected provider uses a compact text change action", () => {
  const component = readFileSync(new URL("../components/service-attribution-field.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(component, /type="button" className="text-link selected-provider-change"/);
  assert.match(component, /onClick=\{\(\) => onChange\(\{ version: 1, performedByType: "service_provider" \}\)\}/);
  assert.doesNotMatch(component, /className="text-button" onClick=\{\(\) => onChange\(\{ version: 1, performedByType: "service_provider" \}\)\}/);
  assert.match(css, /\.selected-provider-change \{[\s\S]*?min-width:\s*44px[\s\S]*?min-height:\s*44px[\s\S]*?background:\s*transparent[\s\S]*?border:\s*0/);
});
