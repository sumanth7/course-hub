# Course Hub

Interactive, hand-built figures for learning infrastructure, reliability and AI systems.
Tracks: Kubernetes, SRE & DevOps, Platform Engineering, AI Systems.

## Layout
- `catalog.mjs`: every track and lesson, with its goal and status (`live` or `planned`). The hub is generated from it.
- `tracks/<track>/<slug>/build.mjs`: builds one lesson's figure, dark and light.
- `tracks/<track>/OUTLINE.md`: per-track notes: metaphors and the shared visual language.
- `scripts/build-all.mjs`: builds every live lesson, adds the course nav (hub link, theme switch, mark complete, next lesson), and writes the hub.
- `scripts/hub.mjs`: the hub page and lesson nav templates.
- `kit/`, `scripts/inline-kit.mjs`: the isometric drawing kit.
- `assets/thumbs/`: lesson thumbnails, `<track>-<slug>-dark.png` and `-light.png`.
- `site/`: build output (not committed; GitHub Actions builds it).

## Build and preview
```bash
npm run build
```
Then open `site/index.html`, or serve it with `npx serve site`.

## Add a lesson
1. Create `tracks/<track>/<slug>/build.mjs` (copy an existing one as a starting point).
2. Set the lesson's `status` to `"live"` in `catalog.mjs`.
3. Run `npm run build`, then capture its two thumbnails into `assets/thumbs/`.

## Deploy
Pushing to `main` runs `.github/workflows/pages.yml`, which builds the site and publishes it to GitHub Pages.
Learner progress is stored in each visitor's browser (localStorage); there is no backend.
