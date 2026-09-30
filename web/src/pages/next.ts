import { useSearchParams } from "@solidjs/router";

/** Where to go after signing in or up: `?next=` if it is a path on this site, else home. */
export function useNextPath(): () => string {
  const [search] = useSearchParams<{ next?: string }>();
  return () => {
    const next = search.next;
    return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  };
}

/** A sign-in or sign-up link that keeps `?next=`. */
export const withNext = (path: string, next: string) => (next === "/" ? path : `${path}?next=${encodeURIComponent(next)}`);
