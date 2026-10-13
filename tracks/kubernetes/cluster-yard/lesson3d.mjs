export default {
  pageTitle: "The Cluster at a Glance (3D)",
  lede: "A whole Kubernetes cluster as a container yard. Drag to rotate, scroll or pinch to zoom, click any part to see what it does, or press <b>▶ Guided tour</b> at the bottom of the view.",
  controls: `<div class="ctl" role="group" aria-label="Cluster controls">
    <span class="pair"><span id="cy-replicas">replicas 6</span><button type="button" data-do="minus" aria-label="Fewer replicas">−</button><button type="button" data-do="plus" aria-label="More replicas">+</button></span>
    <button type="button" data-do="node" data-node="0" class="danger">Fail node-1</button>
    <button type="button" data-do="node" data-node="1" class="danger">Fail node-2</button>
    <button type="button" data-do="node" data-node="2" class="danger">Fail node-3</button>
  </div>
  <p class="status" id="cy-status" aria-live="polite"></p>`,
  caption: "The control plane stores the desired state, here how many replicas of the web app should run. The scheduler compares that with what is running and places each new pod on the least-loaded node that is up. When a node fails, its pods are lost and replaced on the nodes that are left, up to their capacity; anything over capacity waits as Pending. Outside traffic enters through the Ingress, and the Service sends each request to one ready pod.",
};
