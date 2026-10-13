export default {
  pageTitle: "Deployments & Rollouts (3D)",
  lede: "Release a new version and watch a rolling update happen: new pods in, old pods out, never fewer ready pods than you allow. Click the <b>rollout gauge</b> on the control cabinet to see the limits, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Rollout controls">
    <button type="button" data-do="good" id="dp-good">Release v2</button>
    <button type="button" data-do="bad" id="dp-bad" class="danger">Release v2 (broken)</button>
    <button type="button" data-do="undo" id="dp-undo" disabled>Roll back</button>
    <span class="pair"><span id="dp-surge">maxSurge 2</span><button type="button" data-do="s-" aria-label="Decrease maxSurge">−</button><button type="button" data-do="s+" aria-label="Increase maxSurge">+</button></span>
    <span class="pair"><span id="dp-unavail">maxUnavailable 1</span><button type="button" data-do="u-" aria-label="Decrease maxUnavailable">−</button><button type="button" data-do="u+" aria-label="Increase maxUnavailable">+</button></span>
  </div>
  <p class="status" id="dp-status" aria-live="polite"></p>
  <pre><b>kind:</b> Deployment
<b>spec:</b>
  <b>replicas:</b> 6
  <b>strategy:</b> { type: RollingUpdate, rollingUpdate: { <b>maxSurge:</b> 2, <b>maxUnavailable:</b> 1 } }
  <b>template:</b> { spec: { containers: [{ name: web, image: web:v2 }] } }
# kubectl rollout status deploy/web · kubectl rollout undo deploy/web</pre>`,
  caption: "A Deployment keeps one ReplicaSet per version. On a rolling update the controller scales the new ReplicaSet up and the old one down within two limits: total pods may rise to replicas + maxSurge, and ready pods may fall to replicas − maxUnavailable. A new pod counts as available only once its readiness probe passes, so a broken image stops the rollout at the floor while the old pods keep serving; kubectl rollout undo switches the template back.",
};
