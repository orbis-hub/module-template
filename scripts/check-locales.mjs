#!/usr/bin/env node
// Checks locales/*.json against english and module.json: missing keys, placeholder mismatches,
// languages listed in the manifest without a file (and the other way round), untranslated manifest texts.
// Exit code 1 on problems. Run with `pnpm check:locales` (the workflows run it too).
import { existsSync, readdirSync, readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync("module.json", "utf8"));
const langs = manifest.languages ?? [];
let problems = 0;
function fail(msg) {
  console.log(msg);
  problems++;
}

if (!existsSync("locales")) {
  if (langs.length) fail(`module.json lists ${langs.join(", ")} but there is no locales/ folder`);
  else console.log("no translations");
  process.exit(problems ? 1 : 0);
}

const files = readdirSync("locales")
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.slice(0, -5));
const load = (l) => JSON.parse(readFileSync(`locales/${l}.json`, "utf8"));
// plural forms may drop {count} ("one" → "a click"), so compare the general form
const placeholders = (v) =>
  [...(typeof v === "string" ? v : (v.other ?? "")).matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join(",");

for (const l of langs) if (!files.includes(l)) fail(`module.json lists "${l}" but locales/${l}.json is missing`);
for (const f of files) if (!langs.includes(f)) fail(`locales/${f}.json exists but "${f}" is not in module.json languages`);

if (!files.includes("en")) fail("locales/en.json (the fallback) is missing");
else {
  const en = load("en");
  const manifestKeys = [
    "manifest.name",
    ...(manifest.widgets ?? []).map((w) => `widget.${w.id}.name`),
    ...(manifest.pages ?? []).map((p) => `page.${p.id}.name`),
  ];
  for (const k of manifestKeys) if (!(k in en)) fail(`en.json has no "${k}" (that manifest text stays untranslated)`);
  for (const l of files.filter((f) => f !== "en")) {
    const other = load(l);
    const missing = Object.keys(en).filter((k) => !(k in other));
    const extra = Object.keys(other).filter((k) => !(k in en));
    const mismatch = Object.keys(en).filter((k) => k in other && placeholders(en[k]) !== placeholders(other[k]));
    if (missing.length) fail(`${l}: missing ${missing.join(", ")}`);
    if (extra.length) console.log(`${l}: not in en (ignored): ${extra.join(", ")}`);
    if (mismatch.length) fail(`${l}: placeholders differ from en: ${mismatch.join(", ")}`);
    if (!missing.length && !mismatch.length) console.log(`${l}: ok (${Object.keys(en).length} keys)`);
  }
}
process.exit(problems ? 1 : 0);
