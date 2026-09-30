import { createSignal } from "solid-js";
import { auth } from "../api/client";
import type { Me } from "../api/types";

const [identity, setIdentity] = createSignal<Me>();

export { identity };

export function currentUsername(): string | undefined {
  const me = identity();
  return me?.kind === "user" ? me.user.username : undefined;
}

export function isAdmin(): boolean {
  const me = identity();
  return me?.kind === "user" && me.user.role === "admin";
}

/** Admins and moderators: they get the admin page (moderators a part of it). */
export function isStaff(): boolean {
  const me = identity();
  return me?.kind === "user" && (me.user.role === "admin" || me.user.role === "moderator");
}

export async function refreshIdentity(): Promise<void> {
  try {
    setIdentity(await auth.me());
  } catch {
    setIdentity({ kind: "guest" });
  }
}
