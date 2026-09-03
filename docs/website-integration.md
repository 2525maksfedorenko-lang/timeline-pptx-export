# How this app reaches the aicoo website

The Tools page has a card, "Timeline → PowerPoint". Before this integration it
wore a *Coming Soon* overlay. It now links to `/tools/timeline-pptx-export`,
which serves this app.

This document is the argument for how that is wired, so that the parts of it
that look lazy can be read as decisions instead.

## The shape of it

| Where | What |
| --- | --- |
| `public/tools/timeline-pptx-export/` | the built bundle — eight files — which is what is actually served |
| `public/tools/timeline-pptx-export/README.md` | how to rebuild those eight files, and from which commit they came |
| `next.config.ts` | one rewrite, so the bare path resolves to `index.html` |
| `middleware.ts` | one matcher exclusion, so next-intl does not claim the path |
| `app/[locale]/tools/ToolsPageClient.tsx` | the card links out instead of saying Coming Soon |

**Twelve files, and no source.** That is the whole of it.

## No source travels

An earlier version of this integration checked the whole project into the
website at `tools/timeline-pptx-export/` — source, docs, checks, dotfiles, a
lockfile, four tsconfigs, and the fifteen design-system files the build needs.
129 files. The site's owner rejected it, correctly: the website's repository
should carry what it takes to serve the tool and nothing else.

So it carries the bundle and a README, and the README is what replaces the
source. It names this repository, the commit the bundle was built from, the one
command that rebuilds it, and the eight files that come out — enough to
reproduce the folder without ever having seen this project. Keeping that commit
hash current, when the bundle is replaced, is the whole discipline the
arrangement asks for.

Two things follow from there being no source there:

- **The design system does not travel at all.** The website already has one in
  `.ds-sync/`, and two copies of a design system in one repository is precisely
  the thing that drifts. Our copy is a build input here — `src/index.css` does
  `@import "../design-system/styles.css"` — but a build input is consumed at
  build time, in this repository, and only its output ships.
- **The site's `tsconfig.json` needs no exclusion.** It used to need one, and
  the next section is why.

## The decision: the built bundle is committed

The alternative was to hook this project into the website's own build, so that
`next build` produces the bundle and nothing compiled is ever committed. That
is the cleaner arrangement and it is not the one chosen.

**Why not.** The website's `tsconfig.json` includes `**/*.ts` and `**/*.tsx`
and excludes only `node_modules`, and `next build` runs a TypeScript pass over
everything it includes. So this app's source, sitting anywhere in that
repository, is type-checked against *the website's* tsconfig and *the
website's* `node_modules`. It was tried, and here is what it does:

```
   Creating an optimized production build ...
 ✓ Compiled successfully in 7.1s
   Running TypeScript ...
Failed to type check.

./tools/timeline-pptx-export/src/App.tsx:29:39
Type error: Parameter 'state' implicitly has an 'any' type.

  29 |   const loadPlans = useTimelineStore((state) => state.loadPlans)
     |                                       ^
Next.js build worker exited with code: 1
```

Nothing is wrong with that line. `zustand` is not installed in the website, so
`useTimelineStore` has no type, so its callback parameter is implicitly `any`,
so `strict` fails the build. The same is true of `pptxgenjs`, `jspdf`, `idb`,
`xlsx`, `marked` and the rest.

Making the website build this app therefore means one of:

- merging eleven runtime dependencies and a second toolchain into the
  website's `package.json` — its install, its lockfile and its build time all
  grow, for a tool that changes far less often than the site does; or
- a workspace or a nested build step, which is a change to how the website's
  production build works.

Either way the website's deploy acquires a new way to fail, and the failure
lands on whoever is shipping the site that day rather than on whoever changed
this app. For a static bundle that is rebuilt occasionally, that is a bad
trade.

**What committing the bundle buys.** It works the moment the pull request is
merged, with nothing asked of the website's CI, and everything it can break is
inside one folder under `public/`.

None of this is a live problem any more, because no source of this app sits in
that repository to be type-checked. It is written down because it is the reason
the bundle is committed rather than built there, and because anyone proposing
the other arrangement will meet it again on the first `next build`.

**What committing the bundle costs, plainly.** Compiled files are in the
repository, and they do not rebuild themselves: the served output can fall
behind this repository without anything complaining. The README beside the
bundle records the commit it was built from, which is the only thing that makes
the drift visible. The rebuild is one command and the next section is how.

**When to revisit.** If this app starts changing often, or if the website
adopts workspaces for another reason, the second arrangement becomes the right
one. Nothing here is load-bearing against it: delete the `public/` copy and add
a build step that produces it.

## Rebuilding the served bundle

From this repository:

```bash
npm install
npm run build:embed          # vite build --base=/tools/… , then drop our logo
```

Then, in the website's checkout, replace the folder's contents but keep the
README — the built filenames carry content hashes, so clearing first is what
stops stale assets accumulating:

```bash
cd <website>/public/tools/timeline-pptx-export
find . -mindepth 1 ! -name README.md -delete
cp -r <this repo>/dist/. .
```

and update the commit hash the README names, because nothing else records what
is being served.

`--base` is the part that matters and the part that is easy to forget, which
is why it is a named script rather than a flag anyone has to remember. Without
it every asset URL comes out rooted at `/` and 404s a level above where the
app is served.

The script's second half deletes `dist/aicoo_logo.svg`. That file exists so the
app has a mark when it runs standalone; on this domain the site already has one
and the app asks for that instead, so shipping ours would put a second
`aicoo_logo.svg` on the site — see below.

The same instructions live in the website, at
`public/tools/timeline-pptx-export/README.md`, because that is where someone
who has only that repository will look.

## The logo: one file per domain, and it is the site's

The plan screen's header carries the aicoo mark. It asks for it at
`/aicoo_logo.svg` — an absolute URL, so it resolves against the root of
whatever origin serves the app. Embedded in the website that is the site's own
`public/aicoo_logo.svg`, the very file the site header uses, so replacing the
logo there replaces it here too. The customer's requirement, and the right one:
a mark with two copies on one domain is a mark that will be replaced in one
place and not the other.

Three things make that work, and each is a place it could have gone wrong:

- **The path escapes the base.** The embed build is based at
  `/tools/timeline-pptx-export/`, and Vite rewrites `index.html`'s asset URLs
  with that prefix — but not a string inside a component. So `/aicoo_logo.svg`
  stays rooted at `/`, which is what reaches the site's file rather than a
  404 inside our own folder. The favicon, which *is* in `index.html`, is
  prefixed and stays ours.
- **Standalone still has a logo.** `public/aicoo_logo.svg` is a copy of the
  site's file under the same name, so `npm run dev` shows the same mark from
  our own `public/`. It is the site's variant and not a different one, so the
  screen looks in development exactly as it looks embedded.
- **That copy does not travel.** `build:embed` deletes it from `dist/`, so the
  website receives no `aicoo_logo.svg` of ours.

The mark is nearly square (155×152), so the header sizes it by height with the
width left to the file. This is a visible change from what the tool used to
show: the old file was the orbit-plus-wordmark lockup from
`design-system/assets/`, and the site's file is the mark alone.

## The three site edits

**`next.config.ts`** — a rewrite. Next serves files out of `public/` but does
not resolve a directory to its `index.html`, so the bare path is mapped to it
explicitly. Everything below the prefix — assets, icons — is already served as
a plain file and needs no rule.

**`middleware.ts`** — the next-intl matcher. Without the exclusion the
middleware treats `/tools/timeline-pptx-export` as a page path, prefixes it
with a locale and redirects to `/en/tools/timeline-pptx-export`, where no file
exists.

**`app/[locale]/tools/ToolsPageClient.tsx`** — the card. The *Coming Soon*
overlay is gone and the title is a link. The link is a full-card target: it
carries an `after:absolute after:inset-0` overlay, which is the same
stretched-link pattern the other live cards on that page use, so the whole card
is clickable and the focus ring is drawn around the card rather than around the
words. `ImageCard` already had the `titleContent` prop this uses.

There is no fourth. An earlier version of this integration also changed
`tsconfig.json`, to exclude the vendored source from the site's TypeScript
pass. With the source gone the exclusion has nothing to exclude, and
`next build` was run without it: *Finished TypeScript* clean. The file is back
to what it is on `main`.

## Settled: no subdomain, no separate service

This tool is served from the website's own domain, under `/tools/…`, and that
is closed rather than pending. It was worth asking, because the other free
tools on that page are **not** served this way — they are separate services,
each with its own container and its own database, and a couple of them sit on
their own hosts. Read from the outside, the obvious inference is that this one
should follow.

It should not, and the reason is that the resemblance is only on the Tools
page. Those tools have a backend because they need one: something to run, and
somewhere to keep what it produced. This one has neither. It is a frontend and
nothing else — no server, no API calls, no accounts. Plans live in the
visitor's own IndexedDB (`store/planStorage.ts`), and the `.pptx` and `.pdf`
are generated in the page, by `pptxgenjs` and `jspdf`, on the visitor's
machine. Nothing it does needs a process of its own to be alive.

So a subdomain would buy nothing and cost the usual: a host or a container to
keep running, a certificate, a deploy of its own, DNS, and one more thing that
can be down while the rest of the site is up. Static files under `public/` have
none of that — they go out with the site, they are up exactly when the site is
up, and there is nothing to operate.

**Do not reopen this on the grounds that "the other tools are separate
services."** That is the argument that was already weighed, and the answer is
that those tools have servers because they have server-side work. The day this
one grows a backend — accounts, plans stored for a team, anything a browser
cannot do alone — the question becomes a real one again and should be asked
afresh. Until then it is a static bundle, and static bundles belong with the
site.

## What is deliberately not here

- **No route, no page component.** The app is static. Giving it an
  `app/[locale]/tools/timeline-pptx-export/page.tsx` would put a React tree
  around a bundle that already has one.
- **No locale prefix.** The app's own interface is English only, and a locale
  segment would promise a translation that does not exist.
- **The website's `npm run lint` is broken on `main`**, before and after this
  change: `eslint-config-next` is pinned to `^0.2.4`, which is an unrelated
  package from long before Next's own config, so `eslint.config.mjs` fails to
  resolve `eslint-config-next/core-web-vitals` and no file is linted at all.
  That is not this integration's to fix — and nothing this integration adds is
  lintable anyway, since `public/` is build output.
