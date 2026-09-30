# diff'D — web frontend

This is the source of the web frontend of **diff'D**, a site of quick skill games (typing,
reaction, memory, words and maths) with 1v1s, parties, daily challenges and leaderboards.
It is the code the site sends to your browser, published under the GNU General Public
License version 3 (see `LICENSE` and `NOTICE`). diff'D's look and some of its frontend are
derived from [Monkeytype](https://github.com/monkeytypegame/monkeytype) (GPL-3.0); diff'D
is not affiliated with Monkeytype.

The game server (accounts, runs, scoring of official games, 1v1s and parties) is not part
of this repository. This repository is a mirror: it is exported from diff'D's own
repository, so changes are made there and appear here with the next export.

## Layout

- `web/` — the frontend: SolidJS, Vite, Tailwind CSS and TypeScript.
- `wordlists/` — the word lists and dictionaries the word games use, with the scripts that
  build the dictionaries.
- `fixtures/scoring/` — shared scoring examples; the frontend's scoring rules are tested
  against them.

## Building

With Node.js 24 and pnpm 11:

```sh
cd web
pnpm install --frozen-lockfile
pnpm test        # unit tests
pnpm build       # the site, in web/dist
```

`pnpm dev` serves it at http://127.0.0.1:5173 and sends `/api` requests to a diff'D server
at `API_TARGET` (default `http://127.0.0.1:8080`); without one, the pages load but nothing
can be played. The end-to-end tests, which drive the frontend together with the server,
are not included.

`VITE_SOURCE_URL`, set when building, is the address of this source that the site's footer
links to.
