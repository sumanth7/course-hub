export default {
  pageTitle: "Edge: DNS, TLS & Gateway API (3D)",
  lede: "Apply a Gateway, an HTTPRoute and a Certificate, then watch three controllers turn that YAML into a load balancer, DNS records in Route 53 and a Let's Encrypt certificate proven with a DNS-01 challenge. Split traffic by weight and header, age the certificate, break an IAM permission, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Edge controls">
    <button type="button" data-do="apply" id="ed-apply">Apply the route</button>
    <button type="button" data-do="mode" data-mode="gateway" aria-pressed="true">Gateway API</button>
    <button type="button" data-do="mode" data-mode="ingress" aria-pressed="false">Ingress</button>
    <span class="pair"><span id="ed-w">v2 weight 20%</span><button type="button" data-do="w-" aria-label="Less v2">−</button><button type="button" data-do="w+" aria-label="More v2">+</button></span>
    <button type="button" data-do="ff">+30 days</button>
    <button type="button" data-do="iam" id="ed-iam" class="danger">Break cert-manager's IAM</button>
  </div>
  <p class="status" id="ed-status" aria-live="polite"></p>`,
  caption: "Controllers connect Kubernetes objects to the world outside the cluster. A Gateway controller turns a Gateway into a load balancer. external-dns reads hostnames from routes and writes DNS records, with a TXT record so it only deletes what it owns. cert-manager turns a Certificate into a real certificate through ACME: it publishes a challenge, the CA checks it, and the result lands in a Secret the listener reads, renewed automatically at two thirds of its life. Gateway API splits what Ingress kept in one object: the GatewayClass belongs to the infrastructure team, the Gateway to the platform team, and HTTPRoutes to app teams, with weights and header matches built in.",
};
