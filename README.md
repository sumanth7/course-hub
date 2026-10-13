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

## 3D lessons
Every lesson also has a 3D version at `site/<track>/<slug>/3d/`, built from two files next to its 2D build script:
- `scene3d.js`: the scene and its model, using the shared engine (`createStage`, parts, labels, packets, tours).
- `lesson3d.mjs`: the page text and the controls under the viewer.

The engine lives in `engine3d/` (`engine.js` for the browser, `page.mjs` for the page template). It uses three.js from a CDN, so everything renders on the reader's device and the site stays static.

## Add a lesson
1. Create `tracks/<track>/<slug>/build.mjs` (copy an existing one as a starting point).
2. Set the lesson's `status` to `"live"` in `catalog.mjs`.
3. Run `npm run build`, then capture its two thumbnails into `assets/thumbs/`.

## Deploy
Pushing to `main` runs `.github/workflows/pages.yml`, which builds the site and publishes it to GitHub Pages.
Learner progress is stored in each visitor's browser (localStorage); there is no backend.

### Editable YAML and the simulated terminal

- `engine3d/yaml.js` parses YAML and reports errors the way the API server does.
- `engine3d/kubectl.js` is a simulated kubectl. A lesson calls `S.kube({ objects, verbs, examples })`, and get, describe, logs, edit, apply and events then work against the lesson's own model.
- A part becomes editable once it has `fields: { "spec.replicas": { check, set } }`. Changes to fields the lesson doesn't model are accepted and listed as ignored.
- Every lesson has the terminal. Objects in a part's YAML are found automatically, so `get`, `describe` and `-o yaml` work with no extra code. Each lesson's `scene3d.js` ends with a "kubectl and the YAML editor" block that adds its own commands and editable fields.
- Built in for any editable field: `label`, `scale`, `set image` and `patch`. Lessons can also add other CLIs as `tools`: helm, istioctl, docker, ssh, curl, etcdctl and kubeadm.
- Lesson 05 (Deployments) is the fullest example: scale, set image, rollout status/history/undo/restart, and delete pod.
