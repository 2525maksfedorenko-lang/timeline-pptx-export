# How this app reaches the aicoo website

The Tools page has a card, "Timeline → PowerPoint". Before this integration it
wore a *Coming Soon* overlay. It now links to `/tools/timeline-pptx-export`,
which serves this app.

This document is the argument for how that is wired, so that the parts of it
that look lazy can be read as decisions instead.

## The shape of it

| Where | What |
| --- | --- |
| `tools/timeline-pptx-export/` | this project — source, docs, checks, its own `package.json`; see *What is vendored and what is not* |
| `public/tools/timeline-pptx-export/` | the built bundle, which is what is actually served |
| `next.config.ts` | one rewrite, so the bare path resolves to `index.html` |
| `middleware.ts` | one matcher exclusion, so next-intl does not claim the path |
| `app/[locale]/tools/ToolsPageClient.tsx` | the card links out instead of saying Coming Soon |
| `tsconfig.json` | one `exclude`, so the site's build does not try to compile this app |

Two copies of the same app therefore live in the website repository: the source
in `tools/`, and the compiled bundle in `public/`. That is the cost of the
decision below, and it is stated here rather than discovered later.

## What is vendored and what is not

The website does not need the whole workshop, and it must not carry a second
design system — it already has one in `.ds-sync/`, and two copies of a design
system in one repository is precisely the thing that drifts.

So the vendoring is filtered, by `.gitattributes` in this project rather than
by whoever runs the copy: `git archive` honours `export-ignore`, so
`design-system/**` is dropped and the files the app genuinely needs are named
back in. **Fourteen files stay out of 169:**

| Kept | Why |
| --- | --- |
| `design-system/styles.css` + `design-system/tokens/*.css` (10) | a **build input**, not reference. `src/index.css` does `@import "../design-system/styles.css"`, which pulls the nine token files. Remove them and `vite build` fails on a missing import, and every colour, radius, shadow and type step goes with it |
| `components/core/Button.jsx`, `forms/Input.jsx`, `forms/Checkbox.jsx`, `overlays/DropdownMenu.jsx` (4) | `npm run check:design` reads these four at run time to prove that `src/components/systemUi.ts` — a hand transcription of them into Tailwind — has not drifted. Without them that check cannot run, and a check that cannot run is worse than one that fails |
| `design-system/readme.md` | one page saying what the other 155 files were, and where the real copy lives |

Dropped: the 104 remaining primitives and their `.d.ts`/`.prompt.md`, the 19
guideline specimens, the coordinator UI kit, the brand assets, the rebuilt
`_ds_bundle.js` and its manifest, and the skill/thumbnail files. None of it is
read by the app, by the build, or by any of the six checks.

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

**What it costs, plainly.** Compiled files are in the repository. The bundle
does not rebuild itself, so source and served output can drift — the source in
`tools/` is *not* what serves the page. The rebuild is one command and the
next section is how.

**When to revisit.** If this app starts changing often, or if the website
adopts workspaces for another reason, the second arrangement becomes the right
one. Nothing here is load-bearing against it: delete the `public/` copy, drop
the `tsconfig.json` exclusion, and add a build step.

## Rebuilding the served bundle

From `tools/timeline-pptx-export/`:

```bash
npm install
npm run build:embed          # vite build --base=/tools/… , then drop our logo
rm -rf ../../public/tools/timeline-pptx-export
mkdir -p ../../public/tools/timeline-pptx-export
cp -r dist/. ../../public/tools/timeline-pptx-export/
```

`--base` is the part that matters and the part that is easy to forget, which
is why it is a named script rather than a flag anyone has to remember. Without
it every asset URL comes out rooted at `/` and 404s a level above where the
app is served.

The script's second half deletes `dist/aicoo_logo.svg`. That file exists so the
app has a mark when it runs standalone; on this domain the site already has one
and the app asks for that instead, so shipping ours would put a second
`aicoo_logo.svg` on the site — see below.

To refresh the **source** copy, from this project's own repository:

```bash
git archive HEAD | tar -x -C <website>/tools/timeline-pptx-export
```

`.gitattributes` does the filtering, so there is nothing to remember and
nothing to clean up afterwards.

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

## The four site edits

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

**`tsconfig.json`** — the exclusion described above. This is the one edit that
is not about the card, and the one that is easiest to delete by accident; the
comment in the file says what breaks if it goes.

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
  That is not this integration's to fix. When it is fixed, this app's folder
  should go into `globalIgnores` for the same reason it is excluded from
  `tsconfig.json`.
