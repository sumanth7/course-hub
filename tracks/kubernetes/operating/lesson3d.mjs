export default {
  pageTitle: "Debugging & Helm (3D)",
  lede: "A Helm chart and its values sheet installed release <b>shop</b>. Break it with a bad <code>helm upgrade</code>, investigate with kubectl, then <code>helm rollback</code>. Or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Break the release">
    <button type="button" data-do="brk" data-f="image" class="danger">helm upgrade: bad image tag</button>
    <button type="button" data-do="brk" data-f="crash" class="danger">helm upgrade: drop DATABASE_URL</button>
    <button type="button" data-do="brk" data-f="pending" class="danger">helm upgrade: 64Gi memory</button>
    <button type="button" data-do="brk" data-f="selector" class="danger">helm upgrade: selector typo</button>
  </div>
  <div class="ctl" role="group" aria-label="Investigate">
    <button type="button" data-do="tool" data-t="get">kubectl get pods</button>
    <button type="button" data-do="tool" data-t="describe">describe pod</button>
    <button type="button" data-do="tool" data-t="logs">logs</button>
    <button type="button" data-do="tool" data-t="events">get events</button>
    <button type="button" data-do="tool" data-t="endpoints">get endpoints</button>
    <button type="button" data-do="rb" id="op-rollback" disabled>helm rollback</button>
  </div>
  <p class="status" id="op-status" aria-live="polite"></p>
  <pre id="op-term" aria-live="polite" style="min-height:9em"></pre>`,
  caption: "Helm packages an app's manifests as a chart: templates plus values. helm install renders and applies them as a release, helm upgrade applies new values as a new revision, and helm rollback returns to an earlier revision's values. When something breaks, work outward from the pod: get pods for the status, describe for settings and events, logs for what the app said, get events for what the cluster did, and get endpoints to see whether a Service finds your pods.",
};
