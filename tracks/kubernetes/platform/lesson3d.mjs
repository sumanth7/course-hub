export default {
  pageTitle: "Platform: CRDs, Operators, Quotas & Karpenter (3D)",
  lede: "Extend Kubernetes with a CustomResourceDefinition and run Postgres through an operator that handles failover. Then share the cluster between two teams: ResourceQuotas cap what each may request, LimitRanges fill in defaults, and Karpenter launches and consolidates nodes to fit their pods. Or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Platform controls">
    <button type="button" data-do="install" id="pf-install">Install CRD + operator</button>
    <button type="button" data-do="pg" id="pf-pg">Create Cluster pg</button>
    <span class="pair"><span id="pf-a">team-a web 4</span><button type="button" data-do="a-" aria-label="Fewer team-a replicas">−</button><button type="button" data-do="a+" aria-label="More team-a replicas">+</button></span>
    <span class="pair"><span id="pf-b">team-b web 2</span><button type="button" data-do="b-" aria-label="Fewer team-b replicas">−</button><button type="button" data-do="b+" aria-label="More team-b replicas">+</button></span>
  </div>
  <p class="status" id="pf-status" aria-live="polite"></p>`,
  caption: "A CustomResourceDefinition teaches the API server a new kind of object, with validation and kubectl support, and an operator is a controller that acts on it with domain knowledge: here it turns one Cluster object into a replicated Postgres and performs failover. ResourceQuotas cap the total a namespace may request and are enforced at admission, so excess pods are never created; LimitRanges add default requests and limits to pods that set none. Karpenter watches for pods the scheduler can't place, launches the cheapest instance type that fits them, and consolidates underused nodes away.",
};
