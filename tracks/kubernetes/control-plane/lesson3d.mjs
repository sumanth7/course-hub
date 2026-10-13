export default {
  pageTitle: "Inside the Control Plane (3D)",
  lede: "Run <b>kubectl apply</b> and follow every message along the floor spokes: through the API server's stamps, into etcd, out to the controllers, the scheduler and the kubelet. Turn off auto-play to step through it, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Control plane controls">
    <button type="button" data-do="apply">kubectl apply / scale</button>
    <button type="button" data-do="del" class="danger">kubectl delete pod</button>
    <button type="button" data-do="reset">Reset cluster</button>
    <button type="button" data-do="mode" id="cp-mode" aria-pressed="true">Auto-play: on</button>
    <button type="button" data-do="next" id="cp-next" disabled>Next step →</button>
  </div>
  <p class="status" id="cp-status" aria-live="polite"></p>
  <div class="table-wrap"><table><thead><tr><th>Kind (in etcd)</th><th>Name</th><th>State</th></tr></thead><tbody id="cp-objs"></tbody></table></div>`,
  caption: "kubectl only talks to the API server, and so does every other component: the API server authenticates and authorizes each request, runs admission, and is the only part that reads and writes etcd. The rest happens by watching: the deployment controller creates a ReplicaSet, the replicaset controller creates pods, the scheduler binds them to nodes, and the kubelet has the container runtime start them, then reports status. Deleting a pod is repaired the same way.",
};
