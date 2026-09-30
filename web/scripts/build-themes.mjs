// Extracts Monkeytype's theme colours (GPL-3.0, credited in NOTICE) into
// src/themes/themes.json. Run from web/ with the ../monkeytype checkout present:
//   pnpm themes
import { readFileSync, writeFileSync } from "node:fs";

const KEYS = [
  "bg",
  "main",
  "caret",
  "sub",
  "subAlt",
  "text",
  "error",
  "errorExtra",
  "colorfulError",
  "colorfulErrorExtra",
];

const source = readFileSync(
  new URL("../../monkeytype/frontend/src/ts/constants/themes.ts", import.meta.url),
  "utf8",
);
const body = source.slice(
  source.indexOf("export const themes"),
  source.indexOf("export type ThemeWithName"),
);

const themes = {};
for (const [, name, fields] of body.matchAll(/^ {2}"?([a-z0-9_]+)"?: \{\n([\s\S]*?)\n {2}\},/gm)) {
  const colours = {};
  for (const [, key, value] of fields.matchAll(/^ {4}(\w+): "(#[0-9a-fA-F]{3,8})",$/gm)) {
    colours[key] = value.toLowerCase();
  }
  const missing = KEYS.filter((key) => !colours[key]);
  if (missing.length > 0) throw new Error(`${name}: missing ${missing.join(", ")}`);
  themes[name] = Object.fromEntries(KEYS.map((key) => [key, colours[key]]));
}

const names = Object.keys(themes).sort();
if (names.length < 150) throw new Error(`only ${names.length} themes found; did the source format change?`);
const sorted = Object.fromEntries(names.map((name) => [name, themes[name]]));
writeFileSync(new URL("../src/themes/themes.json", import.meta.url), `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`wrote ${names.length} themes`);
