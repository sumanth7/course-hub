export default {
  pageTitle: "Upgrading EKS (3D)",
  lede: "Take a cluster from Kubernetes 1.31 to 1.32 the way EKS expects: check upgrade insights, fix a removed API, upgrade the control plane, then the add-ons, then the nodes. Try doing it out of order or skipping a version, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Upgrade controls">
    <button type="button" data-do="check">1 · Check upgrade insights</button>
    <button type="button" data-do="fix">Fix the monitoring chart</button>
    <button type="button" data-do="cp">2 · Upgrade control plane to 1.32</button>
    <button type="button" data-do="addons">3 · Update add-ons</button>
    <button type="button" data-do="nodes">4 · Update node group</button>
  </div>
  <p class="status" id="up-status" aria-live="polite"></p>`,
  caption: "EKS upgrades go one minor version at a time and in order. Upgrade insights scan the API server's audit logs for calls to APIs the next version removes, so you can fix clients and charts first. The control plane upgrade is done by EKS in place, replacing API servers without downtime, and can't be rolled back. Managed add-ons then move to the versions built for the new release; kube-proxy should match the control plane. Nodes come last: a managed node group launches new nodes from the new AMI, then cordons, drains (respecting PodDisruptionBudgets) and terminates old ones. Kubelets may lag the control plane by up to three minor versions but may never be newer. Each version has about 14 months of standard support, followed by paid extended support.",
};
