export default {
  pageTitle: "EKS Architecture (3D)",
  lede: "What AWS runs and what you run. The control plane (API servers and etcd across three AZs) lives in an AWS account; your nodes live in your VPC, reached through ENIs EKS places in your subnets. Switch the endpoint between public and private, lose an AZ, add Fargate, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="EKS controls">
    <button type="button" data-do="mode" data-mode="public" aria-pressed="false">Public endpoint</button>
    <button type="button" data-do="mode" data-mode="both" aria-pressed="true">Public + private</button>
    <button type="button" data-do="mode" data-mode="private" aria-pressed="false">Private only</button>
    <button type="button" data-do="az" id="ek-az" class="danger">Lose us-east-1b</button>
    <button type="button" data-do="fg" id="ek-fg">Add a Fargate profile</button>
    <span class="pair"><span id="ek-ng">node group size 3</span><button type="button" data-do="ng-" aria-label="Fewer nodes">−</button><button type="button" data-do="ng+" aria-label="More nodes">+</button></span>
  </div>
  <p class="status" id="ek-status" aria-live="polite"></p>`,
  caption: "EKS runs the Kubernetes control plane for you: at least two API servers and three etcd members spread across Availability Zones in an AWS-owned account, patched, scaled and backed up by AWS. It reaches into your VPC through elastic network interfaces it creates in your subnets; the API server uses them to talk to kubelets, and with private endpoint access your nodes and tools use them to reach the API without leaving the VPC. Public access exposes the API through a load balancer, ideally limited to known CIDRs. Your pods run on managed node groups (EC2 instances EKS keeps updated), on Fargate (a micro-VM per pod), or on nodes from Karpenter or EKS Auto Mode, and core components such as the VPC CNI, kube-proxy, CoreDNS and the EBS CSI driver are installed as managed add-ons.",
};
