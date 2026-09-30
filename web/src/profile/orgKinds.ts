import type { OrgKind } from "../api/types";

/** How each kind of organisation reads, in the order a picker offers them. */
export const ORG_KINDS: [OrgKind, string][] = [
  ["team", "professional team"],
  ["company", "company"],
  ["school", "college, university or school"],
  ["club", "club"],
  ["group", "group"],
  ["friends", "friend circle"],
  ["other", "other"],
];

export const orgKindLabel = (kind: OrgKind) => ORG_KINDS.find(([k]) => k === kind)?.[1] ?? kind;
