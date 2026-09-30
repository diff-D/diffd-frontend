import type { Mode } from "../../api/types";
import { type Control, type TestSettings, hasExactly, isRecord, note, option } from "../shell/settings";
import { SYMBOLS } from "./logic";
import type { MathsSettings, Op, Tier } from "./types";

// the server's rules
const TIMES = [30, 60, 120];
const TIERS: Tier[] = ["easy", "medium", "hard"];
/** Every tier asks all four (sized to the tier); practice can pick fewer. */
const OPERATIONS: Op[] = ["add", "subtract", "multiply", "divide"];
const DEFAULTS: MathsSettings = { time_s: 60, tier: "medium" };

function isValid(value: unknown, mode: Mode): value is MathsSettings {
  if (!isRecord(value)) return false;
  const { time_s, tier, operations } = value;
  const keys = operations === undefined ? ["time_s", "tier"] : ["time_s", "tier", "operations"];
  if (!hasExactly(value, keys) || !TIMES.includes(time_s as number) || !TIERS.includes(tier as Tier)) return false;
  if (operations !== undefined) {
    if (!Array.isArray(operations)) return false;
    const ops: unknown[] = operations;
    const allowed: unknown[] = OPERATIONS;
    if (ops.length === 0 || new Set(ops).size !== ops.length || !ops.every((op) => allowed.includes(op))) return false;
  }
  return mode === "practice" || (time_s === 60 && tier === "medium" && operations === undefined);
}

/** The settings with these operations; all four is sent as no list (the server's default). */
function withOperations(s: MathsSettings, operations: Op[]): MathsSettings {
  const base = { time_s: s.time_s, tier: s.tier };
  return operations.length === OPERATIONS.length ? base : { ...base, operations };
}

function bar(s: MathsSettings, mode: Mode): Control<MathsSettings>[][] {
  if (mode === "ranked") return [[note("60 s · medium")]];
  const on = s.operations ?? OPERATIONS;
  const toggle = (op: Op): Control<MathsSettings> => {
    const active = on.includes(op);
    const next = active ? on.filter((o) => o !== op) : OPERATIONS.filter((o) => o === op || on.includes(o));
    // the last operation stays on
    return { kind: "option", label: SYMBOLS[op], active, next: next.length === 0 ? s : withOperations(s, next) };
  };
  return [
    [note("seconds", (t) => `${t} s`), ...TIMES.map((t) => option(s, String(t), s.time_s === t, { time_s: t }))],
    [note("level"), ...TIERS.map((tier) => option(s, tier, s.tier === tier, { tier }))],
    [note("operations"), ...OPERATIONS.map(toggle)],
  ];
}

export const mathsSettings: TestSettings<MathsSettings> = { defaults: { ranked: DEFAULTS, practice: DEFAULTS }, isValid, bar };
