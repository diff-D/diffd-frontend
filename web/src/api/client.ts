import type {
  About,
  AdminGame,
  AdminOverview,
  AdminUser,
  Role,
  AdminUserDetail,
  AdminUsersResponse,
  BestsResponse,
  DailyInfo,
  DuelHistoryResponse,
  FinishRunResponse,
  FriendsResponse,
  GameAnalytics,
  GameDetail,
  LeaderboardPeriod,
  LeaderboardResponse,
  RemoteDevice,
  HistoryResponse,
  LoginResponse,
  Me,
  Mode,
  OrgKind,
  OrgSummary,
  Organisation,
  ProfileSummary,
  RegisterResponse,
  Settings,
  StartRunResponse,
  UserProfile,
} from "./types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, credentials: "same-origin" };
  if (method !== "GET") {
    // the server rejects writes without a JSON content type (CSRF defence)
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body ?? {});
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, init);
  } catch {
    throw unreachable(0);
  }
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (data as { error?: { code?: string; message?: string } } | null)?.error;
    // the server always sends its error body; a bare 5xx comes from the proxy in front of it
    if (!error && res.status >= 500) throw unreachable(res.status);
    throw new ApiError(res.status, error?.code ?? "unknown", error?.message ?? `request failed (${res.status})`);
  }
  return data as T;
}

function unreachable(status: number): ApiError {
  return new ApiError(status, "network", "can't reach the server");
}

export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "something went wrong";
}

export const auth = {
  me: () => api<Me>("GET", "/auth/me"),
  register: (body: { username: string; password: string; email?: string }) =>
    api<RegisterResponse>("POST", "/auth/register", body),
  login: (body: { username: string; password: string }) => api<LoginResponse>("POST", "/auth/login", body),
  logout: () => api<void>("POST", "/auth/logout"),
};

export const runs = {
  /** `daily`: today's daily challenge (ranked, standard settings, one attempt). */
  start: <C>(test: string, mode: Mode, settings: unknown, daily = false) =>
    api<StartRunResponse<C>>("POST", "/runs", daily ? { test, mode, daily } : { test, mode, settings }),
  finish: <S>(runId: string, events: unknown[]) =>
    api<FinishRunResponse<S>>("POST", `/runs/${runId}/finish`, { events }),
  /** A live run's socket (see tests/shell/live.ts). */
  liveUrl: (runId: string) => socketUrl(`/runs/${runId}/live`),
};

const page = (cursor?: string) => (cursor ? `?cursor=${encodeURIComponent(cursor)}` : "");

/** `?cursor=` and, for one game's runs, `&test=`. */
const runsPage = (cursor?: string, test?: string) => {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (test) params.set("test", test);
  return params.size > 0 ? `?${params}` : "";
};
const board = (key?: string) => (key ? `?key=${encodeURIComponent(key)}` : "");

/** Your own profile (a guest's too). */
export const profile = {
  summary: () => api<ProfileSummary>("GET", "/profile/summary"),
  game: (test: string, key?: string) => api<GameDetail>("GET", `/profile/games/${test}${board(key)}`),
  history: (cursor?: string, test?: string) => api<HistoryResponse>("GET", `/profile/history${runsPage(cursor, test)}`),
  about: () => api<About>("GET", "/profile/about"),
  /** Your bio, and the tag (one of your organisations') shown before your name, or none. */
  setAbout: (about: { bio: string | null; display: string | null }) => api<About>("PUT", "/profile/about", about),
  /** Your best on each game's default board (the home page's cards). */
  bests: () => api<BestsResponse>("GET", "/profile/bests"),
  duels: (cursor?: string) => api<DuelHistoryResponse>("GET", `/profile/duels${page(cursor)}`),
};

export const friends = {
  list: () => api<FriendsResponse>("GET", "/friends"),
  /** Sends a request, or accepts theirs if they asked first. */
  request: (username: string) => api<{ status: "pending" | "accepted" }>("POST", "/friends/requests", { username }),
  accept: (id: string) => api<{ status: "accepted" }>("POST", `/friends/requests/${id}/accept`),
  /** Declines a request to you, or cancels one you sent. */
  decline: (id: string) => api<void>("POST", `/friends/requests/${id}/decline`),
  /** Unfriends (or withdraws a request) by name. */
  remove: (username: string) => api<void>("DELETE", `/friends/${encodeURIComponent(username)}`),
};

/** Anyone's public profile. */
export const users = {
  /** Up to 8 usernames starting with `q` (accounts only). */
  search: (q: string) => api<{ usernames: string[] }>("GET", `/users?q=${encodeURIComponent(q)}`),
  get: (username: string) => api<UserProfile>("GET", `/users/${encodeURIComponent(username)}`),
  duels: (username: string, cursor?: string) =>
    api<DuelHistoryResponse>("GET", `/users/${encodeURIComponent(username)}/duels${page(cursor)}`),
  game: (username: string, test: string, key?: string) =>
    api<GameDetail>("GET", `/users/${encodeURIComponent(username)}/games/${test}${board(key)}`),
  /** Their ranked runs (practice stays private). */
  history: (username: string, cursor?: string, test?: string) =>
    api<HistoryResponse>("GET", `/users/${encodeURIComponent(username)}/history${runsPage(cursor, test)}`),
};

const org = (tag: string) => `/organisations/${encodeURIComponent(tag)}`;
type OrgDetails = { name: string; kind: OrgKind; open: boolean; aliases: string[] };

/** Organisations: found by tag, name or another name; joined, run by their owner. */
export const organisations = {
  search: (q: string) => api<{ organisations: OrgSummary[] }>("GET", `/organisations?q=${encodeURIComponent(q)}`),
  get: (tag: string) => api<Organisation>("GET", org(tag)),
  create: (details: OrgDetails & { tag: string }) => api<OrgSummary>("POST", "/organisations", details),
  update: (tag: string, details: OrgDetails) => api<OrgSummary>("PATCH", org(tag), details),
  remove: (tag: string) => api<void>("DELETE", org(tag)),
  join: (tag: string) => api<{ status: "member" | "pending" }>("POST", `${org(tag)}/join`),
  leave: (tag: string) => api<void>("POST", `${org(tag)}/leave`),
  accept: (tag: string, username: string) => api<void>("POST", `${org(tag)}/members/${encodeURIComponent(username)}/accept`),
  /** Removes a member, or turns down a request. */
  removeMember: (tag: string, username: string) => api<void>("DELETE", `${org(tag)}/members/${encodeURIComponent(username)}`),
};

export const settings = {
  get: () => api<Settings>("GET", "/settings"),
  put: (changes: Partial<Settings>) => api<Settings>("PUT", "/settings", changes),
};

const socketUrl = (path: string) => `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api${path}`;

export const duels = {
  /** The 1v1 socket: quick match, a new invite room (with practice `settings`), a friend's room, or a challenge. */
  socketUrl(test: string, how: { invite?: boolean; settings?: unknown; room?: string; challenge?: string } = {}): string {
    const params = new URLSearchParams({ test });
    if (how.invite) params.set("invite", "true");
    if (how.invite && how.settings !== undefined) params.set("settings", JSON.stringify(how.settings));
    if (how.room) params.set("room", how.room);
    if (how.challenge) params.set("challenge", how.challenge);
    return socketUrl(`/duels/ws?${params}`);
  },
};

export const challenges = {
  /** Invites a friend into the room you're waiting in. */
  invite: (username: string, room: string) => api<{ id: string }>("POST", "/challenges", { username, room }),
  decline: (id: string) => api<void>("POST", `/challenges/${id}/decline`),
};

/** The signed-in user's notification socket. */
export const live = { socketUrl: () => socketUrl("/live/ws") };

export const admin = {
  overview: () => api<AdminOverview>("GET", "/admin/overview"),
  users: (q: string, cursor?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cursor) params.set("cursor", cursor);
    return api<AdminUsersResponse>("GET", `/admin/users?${params}`);
  },
  user: (id: string) => api<AdminUserDetail>("GET", `/admin/users/${id}`),
  ban: (id: string, reason?: string) => api<AdminUser>("POST", `/admin/users/${id}/ban`, { reason }),
  unban: (id: string) => api<AdminUser>("POST", `/admin/users/${id}/unban`),
  kick: (id: string) => api<AdminUser>("POST", `/admin/users/${id}/kick`),
  allowOrgs: (id: string, allowed: boolean) => api<AdminUser>("POST", `/admin/users/${id}/organisations`, { allowed }),
  update: (id: string, changes: { username?: string; role?: Role }) => api<AdminUser>("PATCH", `/admin/users/${id}`, changes),
  remove: (id: string) => api<void>("DELETE", `/admin/users/${id}`),
  removeRun: (id: string) => api<void>("DELETE", `/admin/runs/${id}`),
  games: () => api<{ games: AdminGame[] }>("GET", "/admin/games"),
  game: (test: string, key: string | undefined, period: LeaderboardPeriod) => {
    const params = new URLSearchParams({ period });
    if (key) params.set("key", key);
    return api<GameAnalytics>("GET", `/admin/games/${test}?${params}`);
  },
};

export const remote = {
  /** A code for the QR code a phone scans (makes the visitor a guest if needed). */
  pair: () => api<{ code: string; expires_in_s: number }>("POST", "/remote/pairings"),
  /** From the phone: pair with the code it scanned. */
  claim: (code: string) => api<RemoteDevice>("POST", "/remote/claim", { code }),
  /** From the phone: is it still paired? */
  me: () => api<RemoteDevice>("GET", "/remote/me"),
  devices: () => api<{ devices: RemoteDevice[] }>("GET", "/remote/devices"),
  forget: (id: string) => api<void>("DELETE", `/remote/devices/${id}`),
  socketUrl: (role: "desk" | "phone") => socketUrl(`/remote/ws?role=${role}`),
};

export const parties = {
  /** A new party, or the one with this code (back to a seat with its `rejoin` token). */
  socketUrl: (room?: string, rejoin?: string) => {
    const params = new URLSearchParams();
    if (room) params.set("room", room);
    if (room && rejoin) params.set("rejoin", rejoin);
    return socketUrl(`/parties/ws?${params}`);
  },
  invite: (code: string, username: string) => api<void>("POST", `/parties/${code}/invite`, { username }),
};

export const leaderboards = {
  /** `friends`: only you and your friends (signed in). */
  get: (test: string, query: { settings_key?: string; period?: LeaderboardPeriod; cursor?: string; friends?: boolean } = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value) params.set(key, String(value));
    return api<LeaderboardResponse>("GET", `/leaderboards/${test}?${params}`);
  },
};

export const daily = {
  today: () => api<DailyInfo>("GET", "/daily"),
};
