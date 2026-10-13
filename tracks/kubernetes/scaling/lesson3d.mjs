export default {
  pageTitle: "Autoscaling & Placement (3D)",
  lede: "Raise the load and the HPA adds pods; when they no longer fit, the Cluster Autoscaler adds a node. Click node-2's label plate and node-3's taint barrier to see how pods are steered. Or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Autoscaling controls">
    <span class="pair"><span id="sc-load">load 150 req/s</span><button type="button" data-do="down" aria-label="Less load">−</button><button type="button" data-do="up" aria-label="More load">+</button></span>
    <button type="button" data-do="taint" id="sc-taint">Remove taint from node-3</button>
  </div>
  <p class="status" id="sc-status" aria-live="polite"></p>
  <div class="table-wrap"><table><thead><tr><th>Pod</th><th>Placement rule</th><th>Placed on</th></tr></thead><tbody id="sc-rows"></tbody></table></div>`,
  caption: "The Horizontal Pod Autoscaler sets a Deployment's replicas from a metric, here average CPU against a 50% target. It scales up quickly and down only after a stabilization window. When pods stay Pending because no node they are allowed on has room, the Cluster Autoscaler adds a node, and removes nodes that sit empty. A nodeSelector or node affinity pulls a pod to labelled nodes; a taint pushes pods away from a node unless they tolerate it.",
};
