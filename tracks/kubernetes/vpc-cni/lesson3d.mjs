export default {
  pageTitle: "VPC CNI & Pod IPs (3D)",
  lede: "On EKS every pod gets a real VPC address. The aws-node DaemonSet attaches network interfaces (ENIs) to each node and fills them with secondary IPs, keeping some warm. That sets max pods per instance type, and it's why small subnets run out. Add pods, change the warm pool, turn on prefix delegation or custom networking, or press <b>▶ Guided tour</b>.",
  controls: `<div class="ctl" role="group" aria-label="VPC CNI controls">
    <span class="pair"><span id="vc-pods">16 pods</span><button type="button" data-do="p-" aria-label="Fewer pods">−</button><button type="button" data-do="p+" aria-label="More pods">+</button></span>
    <button type="button" data-do="type" data-type="t3.medium" aria-pressed="false">t3.medium</button>
    <button type="button" data-do="type" data-type="m5.large" aria-pressed="true">m5.large</button>
    <button type="button" data-do="type" data-type="m5.xlarge" aria-pressed="false">m5.xlarge</button>
    <button type="button" data-do="warm" id="vc-warm">Warm pool: WARM_ENI_TARGET=1</button>
    <button type="button" data-do="prefix" id="vc-prefix" aria-pressed="false">Prefix delegation: off</button>
    <button type="button" data-do="custom" id="vc-custom" aria-pressed="false">Custom networking: off</button>
    <button type="button" data-do="subnet" id="vc-subnet">Subnet: 10.0.1.0/26</button>
  </div>
  <p class="status" id="vc-status" aria-live="polite"></p>`,
  caption: "The Amazon VPC CNI gives each pod an IP address from the VPC itself, so pods are directly reachable from load balancers and other VPC resources with no overlay. Its ipamd daemon attaches ENIs to the node and assigns secondary IPs to them ahead of time, keeping a warm pool (a whole spare ENI by default, or a fixed number of IPs with WARM_IP_TARGET) so new pods start instantly. Because each instance type supports a fixed number of ENIs and IPs per ENI, max pods is ENIs × (IPs − 1) + 2. Prefix delegation assigns /28 prefixes instead, raising pod density; custom networking moves pod ENIs into subnets from a secondary CIDR such as 100.64.0.0/16. The most common EKS networking failure is a subnet running out of addresses: pods stay in ContainerCreating with 'failed to assign an IP address'.",
};
