export default {
  pageTitle: "Production: CDN to Pod (3D)",
  lede: "One request in production: DNS sends the user to a CDN edge (CloudFront or Akamai), where TLS ends, the WAF checks the request and the cache answers or forwards it. API calls go on to an ALB, which sends them straight to pod IPs in three Availability Zones. Raise the load, break things, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Production controls">
    <button type="button" data-do="prov" data-prov="cloudfront" aria-pressed="true">CloudFront</button>
    <button type="button" data-do="prov" data-prov="akamai" aria-pressed="false">Akamai</button>
    <span class="pair"><span id="pr-load">load 160 req/s</span><button type="button" data-do="l-" aria-label="Less load">−</button><button type="button" data-do="l+" aria-label="More load">+</button></span>
    <button type="button" data-do="inv">Invalidate /static/*</button>
    <button type="button" data-do="atk" class="danger">Send an attack</button>
    <button type="button" data-do="az" id="pr-az" class="danger">Fail us-east-1b</button>
    <button type="button" data-do="brk" id="pr-break" class="danger">Bad api release</button>
  </div>
  <p class="status" id="pr-status" aria-live="polite"></p>`,
  caption: "DNS points the site's name at a CDN, so users reach an edge server near them. The edge ends TLS, runs the WAF, and serves cached files without touching the origin; misses go to S3, and uncacheable API calls go to the ALB over a new TLS connection. On EKS, the AWS Load Balancer Controller builds that ALB from an Ingress: listener rules from its paths, target groups from its backends, and, with target type ip, each ready pod's VPC address registered as a target. Health checks take failing pods and whole zones out of rotation, the HPA adds pods as traffic grows, and topology spread keeps them in several zones so one zone's failure costs a third of the capacity, not the site.",
};
