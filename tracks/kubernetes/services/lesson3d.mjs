export default {
  pageTitle: "Pod Networking & Services (3D)",
  lede: "Follow one request from the frontend pod to a backend pod: a DNS lookup, a virtual IP, kube-proxy's rewrite, then a pod on either node. Switch the Service type to let outside traffic in, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Service controls">
    <button type="button" data-do="type" data-type="ClusterIP" aria-pressed="true">ClusterIP</button>
    <button type="button" data-do="type" data-type="NodePort" aria-pressed="false">NodePort</button>
    <button type="button" data-do="type" data-type="LoadBalancer" aria-pressed="false">LoadBalancer</button>
    <span class="pair"><span id="sv-scale">replicas 3</span><button type="button" data-do="down" aria-label="Scale down">−</button><button type="button" data-do="up" aria-label="Scale up">+</button></span>
    <button type="button" data-do="del" class="danger">Delete a backend pod</button>
  </div>
  <p class="status" id="sv-status" aria-live="polite"></p>
  <div class="table-wrap"><table><thead><tr><th>Pod</th><th>Node</th><th>Pod IP</th><th>Service</th></tr></thead><tbody id="sv-rows"></tbody></table></div>`,
  caption: "Every pod gets its own IP, and any pod can reach any other directly over the pod network. Pods come and go and change IPs, so clients use a Service: a stable name in cluster DNS and a stable virtual IP. The Service lists its ready pods in an EndpointSlice, and kube-proxy on every node turns traffic for the virtual IP into traffic for one of them. NodePort opens the same port on every node for outside traffic; LoadBalancer puts a cloud load balancer in front.",
};
