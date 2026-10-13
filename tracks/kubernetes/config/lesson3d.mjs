export default {
  pageTitle: "ConfigMaps & Secrets (3D)",
  lede: "Look inside a pod with its lid off: an env-var plugboard filled when the container starts, and a mounted file tray the kubelet refreshes. Edit the ConfigMap and see which one changes, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Config controls">
    <button type="button" data-do="log">Edit ConfigMap: LOG_LEVEL</button>
    <button type="button" data-do="feat">Edit ConfigMap: FEATURE_X</button>
    <button type="button" data-do="restart">Restart the pod</button>
    <button type="button" data-do="decode" id="cf-decode" aria-pressed="false" class="danger">Decode the Secret</button>
  </div>
  <p class="status" id="cf-status" aria-live="polite"></p>
  <div class="table-wrap"><table><thead><tr><th>Key</th><th>From</th><th>In the API</th><th>Env var in pod</th><th>File in pod</th></tr></thead><tbody id="cf-rows"></tbody></table></div>`,
  caption: "A ConfigMap holds plain settings and a Secret holds sensitive ones; both are API objects stored in etcd. A pod can take their values as environment variables, copied in once when the container starts, or as files in a mounted volume, which the kubelet refreshes on its periodic sync. Editing a ConfigMap therefore changes mounted files after a delay but never the env vars of a running container. A Secret's values are only base64-encoded: limit who can read Secrets with RBAC and enable encryption at rest.",
};
