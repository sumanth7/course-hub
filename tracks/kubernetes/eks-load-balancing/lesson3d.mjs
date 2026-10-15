export default {
  pageTitle: "Load balancing on EKS: ALB, NLB & target types (3D)",
  lede: "The AWS Load Balancer Controller turns an Ingress into an ALB and a Service into an NLB. Switch between instance and ip targets and watch requests take the extra kube-proxy hop or skip it, roll out a new version with and without readiness gates, untag a subnet, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="Load balancer controls">
    <span class="pair">Load balancer <button type="button" data-do="lb" data-lb="alb" aria-pressed="true">ALB (Ingress)</button><button type="button" data-do="lb" data-lb="nlb" aria-pressed="false">NLB (Service)</button></span>
    <span class="pair">Target type <button type="button" data-do="tt" data-tt="instance" aria-pressed="false">instance</button><button type="button" data-do="tt" data-tt="ip" aria-pressed="true">ip</button></span>
    <button type="button" data-do="gate" id="lb-gate" aria-pressed="false">Readiness gates</button>
    <button type="button" data-do="roll">Roll out a new version</button>
    <button type="button" data-do="untag" id="lb-untag" class="danger">Untag us-east-1c's subnet</button>
    <button type="button" data-do="untagall" id="lb-untagall" class="danger">Untag every subnet</button>
  </div>
  <p class="status" id="lb-status" aria-live="polite"></p>`,
  caption: "On EKS, the AWS Load Balancer Controller watches Ingress objects (class alb) and Services of type LoadBalancer (with aws-load-balancer-type: external) and builds an Application or Network Load Balancer for each, with listeners and target groups recorded as TargetGroupBinding objects. It places internet-facing load balancers in subnets tagged kubernetes.io/role/elb=1 (internal ones: kubernetes.io/role/internal-elb=1); an ALB needs subnets in at least two Availability Zones. With target type instance, the targets are the nodes on a NodePort, and kube-proxy forwards each request to a pod that may be on another node or in another zone, replacing the client's address with the node's. With target type ip, the targets are the pods' own VPC addresses (thanks to the VPC CNI), so requests go straight to a pod and health checks test the pods themselves; Fargate pods only work this way. During a rollout, a pod can be Ready to Kubernetes before the load balancer has finished health-checking it, so old pods can be removed while their replacements are still in initial state. Labelling the namespace elbv2.k8s.aws/pod-readiness-gate-inject=enabled adds a readiness gate to new pods, which keeps each one from counting as Ready until its target is healthy.",
};
