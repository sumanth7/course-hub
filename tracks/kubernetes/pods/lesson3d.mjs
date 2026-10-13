export default {
  pageTitle: "Pods, Labels & Namespaces (3D)",
  lede: "Six labelled pods on two nodes. Pick a selector and a namespace: matching pods light up and the kubectl output updates. On the workbench, one pod is opened up beside its phase board. Or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Selectors">
    <button type="button" data-do="sel" data-sel="app=web" aria-pressed="true">-l app=web</button>
    <button type="button" data-do="sel" data-sel="tier=backend" aria-pressed="false">-l tier=backend</button>
    <button type="button" data-do="sel" data-sel="app=api,tier=backend" aria-pressed="false">-l app=api,tier=backend</button>
    <button type="button" data-do="sel" data-sel="app=demo" aria-pressed="false">-l app=demo</button>
  </div>
  <div class="ctl" role="group" aria-label="Namespaces">
    <button type="button" data-do="ns" data-ns="prod" aria-pressed="true">-n prod</button>
    <button type="button" data-do="ns" data-ns="dev" aria-pressed="false">-n dev</button>
    <button type="button" data-do="ns" data-ns="all" aria-pressed="false">-A (all namespaces)</button>
  </div>
  <pre id="pd-term" aria-live="polite"></pre>
  <div class="ctl" role="group" aria-label="Run a pod">
    <button type="button" data-do="run" data-kind="server">Run a server pod</button>
    <button type="button" data-do="run" data-kind="job">Run a Job pod</button>
    <button type="button" data-do="run" data-kind="crash" class="danger">Run a crashing pod</button>
  </div>
  <p class="status" id="pd-status" aria-live="polite"></p>`,
  caption: "A pod is the smallest thing Kubernetes runs: one or more containers that share an IP and volumes and are scheduled together. Pods carry labels, and almost everything finds pods through label selectors. Namespaces divide one cluster into named groups for names, access rules and quotas; they are logical and span all nodes. A pod's phase moves from Pending through ContainerCreating to Running, and ends as Succeeded or Failed.",
};
