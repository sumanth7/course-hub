export default {
  pageTitle: "Ingress & NetworkPolicy (3D)",
  lede: "Outside requests enter through the Ingress controller, which ends TLS and routes by host and path. Inside, NetworkPolicy fences decide which pods may talk to which. Switch the policy mode, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="NetworkPolicy mode">
    <button type="button" data-do="mode" data-mode="off" aria-pressed="true">No policies</button>
    <button type="button" data-do="mode" data-mode="deny" aria-pressed="false" class="danger">Default deny</button>
    <button type="button" data-do="mode" data-mode="allow" aria-pressed="false">Default deny + allow rules</button>
  </div>
  <p class="status" id="ig-status" aria-live="polite"></p>
  <pre id="ig-log" aria-live="polite" style="min-height:8.5em"></pre>`,
  caption: "An Ingress is a set of HTTP routing rules, by host name and path, to Services; an Ingress controller such as ingress-nginx reads them, terminates TLS with a certificate from a Secret, and forwards requests in. NetworkPolicy works inside the cluster: by default every pod accepts traffic from every other pod, but once a policy selects a pod, only traffic some policy allows gets in. The usual pattern is a default-deny policy plus narrow allow rules.",
};
