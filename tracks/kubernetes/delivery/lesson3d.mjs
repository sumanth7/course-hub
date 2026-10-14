export default {
  pageTitle: "Delivery: GitOps, Blue-Green & Canary (3D)",
  lede: "Merge a change and follow it: CI builds and pushes an image, commits the new tag to Git, and Argo CD syncs staging. Promote it to prod and Argo Rollouts releases it with blue-green or canary, running an analysis before users get it. Try a broken release, change prod by hand, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Delivery controls">
    <button type="button" data-do="commit">Merge a change</button>
    <button type="button" data-do="bad" class="danger">Merge a broken change</button>
    <button type="button" data-do="promote">Promote staging → prod</button>
    <button type="button" data-do="rpromote" id="dl-promote" disabled>Promote rollout</button>
    <button type="button" data-do="strat" data-strat="bluegreen" aria-pressed="true">Blue-green</button>
    <button type="button" data-do="strat" data-strat="canary" aria-pressed="false">Canary</button>
    <button type="button" data-do="drift" class="danger">Change prod by hand</button>
  </div>
  <p class="status" id="dl-status" aria-live="polite"></p>`,
  caption: "In GitOps the cluster pulls its desired state from Git instead of CI pushing into it. CI builds an immutable image and commits its tag; Kustomize overlays hold what differs per environment, so promoting is a one-line commit; Argo CD renders and applies each overlay, and with selfHeal it undoes hand edits. Argo Rollouts then controls how users meet the new version. Blue-green runs it at full size beside the old one, tests it through a preview Service and flips the active Service in one step, keeping the old side for an instant rollback. Canary moves real traffic over step by step. Both gate each step on an analysis of real metrics, and abort automatically when it fails.",
};
