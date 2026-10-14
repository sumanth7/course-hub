// Lesson 22 in 3D: EKS architecture. Two accounts: AWS runs the control plane (API servers and etcd in three
// AZs behind a load balancer) in its own VPC; your VPC holds the nodes, reached through cross-account ENIs.
// Endpoint access decides how kubectl and the kubelets reach the API. Managed node groups vs Fargate.
const S = createStage({ home: { target: [-22, 10, -14], dir: [0.9, 1.1, 1.15], zoom: 1 }, viewH: 330, minW: 640, phoneMinW: 460 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const FY = 1.9, TOP = 11;
const AZ = [{ name: "us-east-1a", z: -70 }, { name: "us-east-1b", z: 0 }, { name: "us-east-1c", z: 70 }];
const AWSV = { x0: -250, x1: -60 }, MYV = { x0: -20, x1: 210 };
const APISRV = (a) => ({ x: -130, z: AZ[a].z }), ETCD = (a) => ({ x: -205, z: AZ[a].z });
const NLB = { x: -78, z: -112 };
const XENI = (a) => ({ x: 0, z: AZ[a].z });
const NODE = (a) => ({ x: 70, z: AZ[a].z });
const FARGATE = (a) => ({ x: 160, z: AZ[a].z });
const LAPTOP = { x: 40, z: -150 }, BASTION = { x: 180, z: -122 }, NAT = { x: 210, z: -84 };

part("plate", { kind: "EKS", title: "An EKS cluster", noFrame: true, zoom: 1, anchor: V(-20, 30, 0),
  desc: "Left: a VPC in an AWS-owned account, where EKS runs your control plane. Right: your own VPC, where your nodes and pods run. They meet through network interfaces EKS places in your subnets." });
own("plate", S.plate({ x: -18, z: -14, w: 500, d: 330 }));
S.world.add(S.rect(AWSV.x0, -130, AWSV.x1, 110, 0.08, "edgeMid"));
S.world.add(S.rect(MYV.x0, -140, MYV.x1 + 20, 110, 0.08, "edgeMid"));
label("plate", "AWS-owned account · EKS control plane", { anchor: V(-155, 2, 100) });
S.label("plate", "your account · VPC 10.0.0.0/16", { anchor: V(95, 2, 100) });
AZ.forEach((a) => S.label("plate", a.name, { small: true, anchor: V(MYV.x0 + 20, 2, a.z - 26), lod: 1.4 }));
own("plate", track([...AZ.map((a, i) => [[ETCD(i).x, a.z], [FARGATE(i).x, a.z]]), [[NLB.x, NLB.z], [NLB.x, AZ[2].z]], [[LAPTOP.x, LAPTOP.z], [NLB.x, LAPTOP.z]], [[NLB.x, LAPTOP.z], [NLB.x, NLB.z]], [[NAT.x, NAT.z], [NAT.x, LAPTOP.z]], [[NAT.x, LAPTOP.z], [LAPTOP.x, LAPTOP.z]]], { width: 4 }));

// ---- the control plane (AWS's account) ----
const apiLamps = AZ.map((a, i) => { const id = part("api-" + i, { kind: "API server", title: `kube-apiserver (${a.name})`, zoom: 2.6, anchor: V(APISRV(i).x, 26, a.z), desc: () => `One of at least two API server instances, each in a different AZ, run and patched by AWS. You never log in to it. ${st.azDown === i ? "<b>This AZ is down</b>: the others keep serving." : ""}` }); own(id, housing({ x: APISRV(i).x, z: a.z, w: 34, d: 26, h: 14 })); const l = lamp(APISRV(i).x + 12, 14, a.z + 6, { r: 1.3 }); own(id, l.mesh); label(id, "API server", { small: true }); return l; });
const etcdLamps = AZ.map((a, i) => { const id = part("etcd-" + i, { kind: "etcd", title: `etcd member (${a.name})`, zoom: 2.6, anchor: V(ETCD(i).x, 24, a.z), desc: () => `Three etcd members, one per AZ, keep the cluster's state. Writes need a quorum of 2 out of 3: ${st.azDown >= 0 ? "<b>2 of 3 are up, so the cluster keeps working</b>" : "all 3 are up"}. AWS backs them up and replaces failed ones.` }); own(id, cyl(11, 12, { x: ETCD(i).x, z: a.z, seg: 28 })); const l = lamp(ETCD(i).x + 6, 12, a.z, { r: 1.2 }); own(id, l.mesh); label(id, "etcd", { small: true }); return l; });
part("nlb", { kind: "Public endpoint", title: "API endpoint (NLB)", zoom: 2.6, anchor: V(NLB.x, 24, NLB.z), desc: () => `https://9F2C1E.gr7.us-east-1.eks.amazonaws.com. A Network Load Balancer in front of the API servers. Public access: <b>${st.mode === "private" ? "off" : st.mode === "public" ? "on, from anywhere (or allowed CIDRs)" : "on, plus a private endpoint inside your VPC"}</b>.` });
own("nlb", housing({ x: NLB.x, z: NLB.z, w: 26, d: 22, h: 12 }));
const nlbLamp = lamp(NLB.x + 8, 12, NLB.z, { r: 1.4 });
own("nlb", nlbLamp.mesh);
label("nlb", "public endpoint");

// ---- your VPC: cross-account ENIs, nodes, Fargate ----
const xeniLamps = AZ.map((a, i) => { const id = part("xeni-" + i, { kind: "Cross-account ENI", title: `EKS-managed ENI (${a.name})`, zoom: 3, anchor: V(XENI(i).x, 18, a.z), desc: () => `A network interface EKS creates in your subnet but connects to the control plane. The API server reaches kubelets through it (kubectl logs, exec, port-forward, webhooks). With the private endpoint on, the cluster's API name resolves to these IPs inside your VPC: <b>${st.mode !== "public" ? "on" : "off (nodes go out to the public endpoint)"}</b>.` }); own(id, box(10, 6, 14, { x: XENI(i).x, y0: 0, z: a.z, tone: "hi", r: 0.6 })); const l = lamp(XENI(i).x, 6, a.z, { r: 1.1 }); own(id, l.mesh); label(id, "EKS ENI", { small: true, lod: 1.4 }); return l; });
const nodeObjs = AZ.map((a, i) => {
  const id = part("node-" + i, { kind: "Managed node group", title: `ng-general node (${a.name})`, zoom: 2.2, anchor: V(NODE(i).x, TOP + 22, a.z), desc: () => `An EC2 instance (m6i.large) in an Auto Scaling group that EKS manages: it picks the EKS-optimized AMI, joins the node to the cluster, and replaces nodes gracefully during updates. You still see and pay for the instance. Kubelet reaches the API ${st.mode === "public" ? "<b>over the internet</b> through the NAT gateway" : "<b>privately</b> through the EKS ENIs"}.` });
  own(id, S.tray({ x: NODE(i).x, z: a.z, w: 70, d: 46, top: TOP, slots: [[NODE(i).x - 16, a.z], [NODE(i).x + 16, a.z]], slotSize: [26, 26] }));
  const pods = [-16, 16].map((dx) => { const c = crate({ w: 22, h: 12, d: 20, ribs: 3 }); c.position.set(NODE(i).x + dx, TOP, a.z); c.visible = false; own(id, c); return c; });
  const l = lamp(NODE(i).x + 30, TOP, a.z - 16, { r: 1.2 });
  own(id, l.mesh);
  label(id, "EC2 node", { small: true });
  return { pods, l };
});
const fgObjs = AZ.map((a, i) => { const id = part("fg-" + i, { kind: "Fargate", title: `Fargate pod (${a.name})`, dynamic: true, zoom: 2.6, anchor: V(FARGATE(i).x, 26, a.z), desc: "A pod running on Fargate: AWS gives it a dedicated micro-VM sized to its requests, and it appears in kubectl get nodes as its own node (fargate-ip-…). No instances to patch, but no DaemonSets, GPUs or host access." }); const g = new THREE.Group(); g.add(box(32, 3, 30, { x: FARGATE(i).x, y0: 0, z: a.z, tone: "lo", r: 1 })); const c = crate({ w: 20, h: 12, d: 18, ribs: 3 }); c.position.set(FARGATE(i).x, 3, a.z); g.add(c); g.visible = false; own(id, g); label(id, "", { small: true }); return { g }; });
part("laptop", { kind: "You", title: "kubectl on your laptop", zoom: 2.6, anchor: V(LAPTOP.x, 22, LAPTOP.z), desc: () => `Outside the VPC. It can reach the API only through the public endpoint: <b>${st.mode === "private" ? "blocked (private only)" : "allowed"}</b>. It authenticates with an IAM identity (aws eks get-token).` });
own("laptop", housing({ x: LAPTOP.x, z: LAPTOP.z, w: 22, d: 16, h: 6 }), box(2, 11, 14, { x: LAPTOP.x - 9, y0: 6, z: LAPTOP.z, tone: "hi", r: 0.4 }));
const lapLamp = lamp(LAPTOP.x + 5, 6, LAPTOP.z, { r: 1.4 });
own("laptop", lapLamp.mesh);
label("laptop", "laptop (internet)");
part("bastion", { kind: "In the VPC", title: "Bastion / CI runner", zoom: 2.6, anchor: V(BASTION.x, 22, BASTION.z), desc: () => `Inside your VPC, so it can use the private endpoint: <b>${st.mode === "public" ? "not enabled: it goes out through NAT to the public endpoint" : "enabled"}</b>.` });
own("bastion", housing({ x: BASTION.x, z: BASTION.z, w: 22, d: 16, h: 8 }));
const basLamp = lamp(BASTION.x + 6, 8, BASTION.z, { r: 1.3 });
own("bastion", basLamp.mesh);
label("bastion", "bastion (in VPC)");
part("nat", { kind: "NAT gateway", title: "NAT gateway", zoom: 2.6, anchor: V(NAT.x, 20, NAT.z), desc: "How private subnets reach the internet. With public-only access, every kubelet and pod talking to the API goes out through here." });
own("nat", housing({ x: NAT.x, z: NAT.z, w: 20, d: 18, h: 8 }));
label("nat", "NAT", { small: true });

// ---- the model ----
const st = { mode: "both", azDown: -1, ngSize: 3, fargate: false, addons: { "vpc-cni": "v1.18.3-eksbuild.1", "kube-proxy": "v1.31.0-eksbuild.2", coredns: "v1.11.3-eksbuild.1", "aws-ebs-csi-driver": "v1.35.0-eksbuild.1" }, clock: 0 };
let msg = "";
const P = (x, z) => V(x, FY, z);
const net = S.packets({ speed: 200, onArrive: (d) => { if (d.done) d.done(); } });
const reach = { laptop: () => st.mode !== "private", bastion: () => true };
const liveApis = () => AZ.map((_, i) => i).filter((i) => i !== st.azDown);
function toApi(from, via, done, alt) {
  const a = liveApis()[Math.floor(Math.random() * liveApis().length)], api = APISRV(a);
  if (via === "public") net.add([P(from.x, from.z), ...(from === LAPTOP ? [] : [P(NAT.x, from.z), P(NAT.x, LAPTOP.z)]), P(NLB.x, LAPTOP.z), P(NLB.x, api.z), P(api.x + 17, api.z)], { ring: true, alt, done });
  else { const x = XENI(a); net.add([P(from.x, from.z), P(from.x, x.z), P(x.x, x.z), P(api.x + 17, api.z)], { ring: true, alt, done }); }
}
let spawnIn = 0, k = 0;
function traffic(dt) {
  if (reduced()) return;
  spawnIn -= dt; if (spawnIn > 0) return; spawnIn = 0.7;
  const turn = k++ % 4;
  if (turn === 0) { if (st.mode === "private") { net.add([P(LAPTOP.x, LAPTOP.z), P(LAPTOP.x - 40, LAPTOP.z)], { bad: true, fade: 10, done: () => flash.lap = { t: 0.4, ok: false } }); } else toApi(LAPTOP, "public", () => (flash.lap = { t: 0.4, ok: true })); }
  else if (turn === 1) toApi(BASTION, st.mode === "public" ? "public" : "private", () => (flash.bas = { t: 0.4, ok: true }));
  else { const n = [0, 1, 2].filter((i) => i !== st.azDown && i < st.ngSize)[k % 3] ?? 0; if (n === st.azDown) return; toApi(NODE(n), st.mode === "public" ? "public" : "private", () => (flash["n" + n] = { t: 0.4, ok: true }), true); }
}
const flash = {};
function setMode(m) { st.mode = m; msg = { public: "Public only: kubectl works from anywhere (limit it with allowed CIDRs). Nodes reach the API by leaving the VPC through the NAT gateway. The API server still reaches the kubelets through the EKS ENIs.", both: "Public and private: kubectl from outside uses the public endpoint; inside the VPC the API name resolves to the EKS ENIs, so nodes never leave the VPC. A common default.", private: "Private only: the API has no internet address. kubectl must run inside the VPC (a bastion, CI runners, VPN or Direct Connect). The laptop is refused." }[m]; }
function setAz(i) { st.azDown = st.azDown === i ? -1 : i; msg = st.azDown >= 0 ? `${AZ[i].name} is down. One API server and one etcd member are gone, but the API keeps answering: the other API servers serve, and etcd still has a quorum of 2 out of 3. Its worker node is lost too: its pods move.` : "All three AZs are back."; }
function setFargate(on) { st.fargate = on; msg = on ? "A Fargate profile for namespace batch: pods there get their own micro-VM each, shown as nodes named fargate-ip-…. No EC2 instances to manage." : "Fargate profile removed."; }
function setNg(n) { st.ngSize = Math.max(1, Math.min(3, n)); msg = `Managed node group ng-general: desired size ${st.ngSize}. EKS updates its Auto Scaling group.`; }

S.onTick((dt) => {
  st.clock += dt;
  traffic(dt); net.step(dt);
  for (const k2 in flash) flash[k2].t = Math.max(0, flash[k2].t - dt);
  apiLamps.forEach((l, i) => l.set(i === st.azDown ? "bad" : "on")); etcdLamps.forEach((l, i) => l.set(i === st.azDown ? "bad" : "on"));
  nlbLamp.set(st.mode === "private" ? "off" : "on");
  xeniLamps.forEach((l, i) => l.set(i === st.azDown ? "bad" : st.mode === "public" ? "off" : "on"));
  nodeObjs.forEach((n, i) => { const up = i < st.ngSize && i !== st.azDown; n.pods.forEach((c, j) => (c.visible = up && (j === 0 || i === 0 || st.azDown >= 0))); n.l.set(!up ? "off" : flash["n" + i]?.t > 0 ? "accent" : "on"); });
  fgObjs.forEach((f, i) => (f.g.visible = st.fargate && i !== st.azDown && i < 2));
  lapLamp.set(flash.lap?.t > 0 ? (flash.lap.ok ? "good" : "bad") : "on"); basLamp.set(flash.bas?.t > 0 ? "good" : "on");
  S.setLabel("nlb", st.mode === "private" ? "public endpoint · off" : "public endpoint", { bad: st.mode === "private" });
  S.say(`endpoint: ${{ public: "public", both: "public + private", private: "private" }[st.mode]} · API servers ${liveApis().length}/3 · etcd quorum ${liveApis().length >= 2 ? "ok" : "lost"} · nodes ${[0, 1, 2].filter((i) => i < st.ngSize && i !== st.azDown).length}${st.fargate ? " + Fargate" : ""}`);
  syncUi();
});

// ---- controls ----
S.overview = () => `<h2>Who runs what in EKS</h2><p class="muted">AWS runs everything on the left; you own everything on the right. Ringed dots are API calls (TLS). Pick a part:</p>`;
const ui = { status: document.getElementById("ek-status"), mode: [...document.querySelectorAll("[data-mode]")], az: document.getElementById("ek-az"), fg: document.getElementById("ek-fg"), ng: document.getElementById("ek-ng") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "mode") { setMode(b.dataset.mode); S.shellEcho?.(`aws eks update-cluster-config --name shop --resources-vpc-config endpointPublicAccess=${st.mode !== "private"},endpointPrivateAccess=${st.mode !== "public"}`, "button"); }
  if (a === "az") setAz(1); if (a === "fg") setFargate(!st.fargate);
  if (a === "ng-") setNg(st.ngSize - 1); if (a === "ng+") setNg(st.ngSize + 1);
  S.renderPanel();
}));
function syncUi() {
  const set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  ui.mode.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === st.mode)));
  set(ui.az, st.azDown >= 0 ? "Restore us-east-1b" : "Lose us-east-1b");
  set(ui.fg, st.fargate ? "Remove Fargate profile" : "Add a Fargate profile");
  set(ui.ng, `node group size ${st.ngSize}`);
  set(ui.status, msg || "A cluster with public and private endpoint access, a three-node managed node group, and the standard managed add-ons.");
  ui.status.dataset.tone = st.azDown >= 0 ? "bad" : "";
}

// ---- what the inspector shows ----
const nodeDoc = (i) => K.node({ name: `ip-10-0-${i + 1}-${[17, 41, 88][i]}.ec2.internal`, cidr: `10.0.${i + 1}.0/24`, cpu: "2", mem: "8Gi", pods: 29, ready: i !== st.azDown && i < st.ngSize, labels: { "topology.kubernetes.io/zone": AZ[i].name, "eks.amazonaws.com/nodegroup": "ng-general", "node.kubernetes.io/instance-type": "m6i.large" } }).replace(/podCIDR: .*/, "providerID: aws:///" + AZ[i].name + "/i-0" + (i + 3) + "f9c1e2a7b4d   # ← the EC2 instance behind it; pod IPs come from the VPC subnet (lesson 23)").replace('pods: "29" }', 'pods: "29" }   # ← max pods: set by how many IPs an m6i.large can hold');
const clusterY = () => `# aws eks describe-cluster --name shop (excerpt)
cluster:
  name: shop
  version: "1.31"
  endpoint: https://9F2C1E.gr7.us-east-1.eks.amazonaws.com
  roleArn: arn:aws:iam::111122223333:role/eks-cluster-role   # ← lets EKS create the ENIs in your VPC
  resourcesVpcConfig:
    subnetIds: [subnet-0a1 (us-east-1a), subnet-0b2 (us-east-1b), subnet-0c3 (us-east-1c)]   # ← where the EKS ENIs go
    endpointPublicAccess: ${st.mode !== "private"}
    endpointPrivateAccess: ${st.mode !== "public"}
    publicAccessCidrs: ["0.0.0.0/0"]   # ← narrow this to your office or VPN
  accessConfig: { authenticationMode: API }   # ← access entries decide who is admin (lesson 24)
  kubernetesNetworkConfig: { serviceIpv4Cidr: 172.20.0.0/16 }
  status: ACTIVE`;
const ngY = () => `# aws eks describe-nodegroup --cluster-name shop --nodegroup-name ng-general (excerpt)
nodegroup:
  nodegroupName: ng-general
  amiType: AL2023_x86_64_STANDARD   # ← EKS-optimized AMI, chosen and updated by EKS
  instanceTypes: [m6i.large]
  capacityType: ON_DEMAND
  scalingConfig: { minSize: 1, maxSize: 6, desiredSize: ${st.ngSize} }
  subnets: [subnet-0a1, subnet-0b2, subnet-0c3]
  nodeRole: arn:aws:iam::111122223333:role/eks-node-role   # ← the kubelet's AWS identity
  updateConfig: { maxUnavailable: 1 }   # ← rolling updates replace one node at a time
  status: ACTIVE`;
const fgY = () => `# aws eks describe-fargate-profile --cluster-name shop --fargate-profile-name batch
fargateProfile:
  fargateProfileName: batch
  selectors: [{ namespace: batch }]   # ← pods in this namespace run on Fargate
  podExecutionRoleArn: arn:aws:iam::111122223333:role/eks-fargate-pods
  subnets: [subnet-0a1, subnet-0b2]   # ← private subnets only
  status: ${st.fargate ? "ACTIVE" : "DELETING"}`;
Object.assign(S.PARTS.plate, { manifest: clusterY });
AZ.forEach((_, i) => { Object.assign(S.PARTS["api-" + i], { manifest: clusterY }); Object.assign(S.PARTS["node-" + i], { manifest: () => ngY() + "\n---\n" + nodeDoc(i) }); Object.assign(S.PARTS["fg-" + i], { manifest: () => !st.fargate ? "" : fgY() + "\n---\n" + K.node({ name: `fargate-ip-10-0-${i + 1}-${[200, 201][i] || 202}.ec2.internal`, cpu: "0.25", mem: "0.5Gi", pods: 1, labels: { "eks.amazonaws.com/compute-type": "fargate", "topology.kubernetes.io/zone": AZ[i].name } }) }); });
const addonY = () => Object.entries(st.addons).map(([n, v]) => `- { addonName: ${n}, addonVersion: ${v}, status: ACTIVE }   # ← ${{ "vpc-cni": "aws-node DaemonSet: pod IPs from the VPC (lesson 23)", "kube-proxy": "Service routing on each node", coredns: "cluster DNS", "aws-ebs-csi-driver": "EBS volumes for PVCs (lesson 25)" }[n]}`).join("\n");
Object.assign(S.PARTS.nlb, { manifest: () => `# aws eks list-addons + describe-addon (managed add-ons: EKS installs and upgrades them)\naddons:\n${addonY()}` });

// ---- kubectl and the YAML editor ----
const nodesNow = () => [...[0, 1, 2].filter((i) => i < st.ngSize && i !== st.azDown).map((i) => ({ kind: "Node", name: `ip-10-0-${i + 1}-${[17, 41, 88][i]}.ec2.internal`, part: "node-" + i, manifest: () => nodeDoc(i), labels: { "eks.amazonaws.com/nodegroup": "ng-general", "topology.kubernetes.io/zone": AZ[i].name }, row: { STATUS: "Ready", ROLES: "<none>", VERSION: "v1.31.2-eks-7f9249a" }, wide: { "INSTANCE-TYPE": "m6i.large", ZONE: AZ[i].name } })), ...(st.fargate ? [0, 1].filter((i) => i !== st.azDown).map((i) => ({ kind: "Node", name: `fargate-ip-10-0-${i + 1}-${200 + i}.ec2.internal`, part: "fg-" + i, labels: { "eks.amazonaws.com/compute-type": "fargate" }, row: { STATUS: "Ready", ROLES: "<none>", VERSION: "v1.31.2-eks-fargate" }, wide: { "INSTANCE-TYPE": "fargate", ZONE: AZ[i].name } })) : [])];
const sysPods = () => [...nodesNow().filter((n) => !/fargate/.test(n.name)).flatMap((n, j) => [{ kind: "Pod", name: `aws-node-${["7xk2p", "m9q4z", "c3w8d"][j]}`, ns: "kube-system", labels: { "k8s-app": "aws-node" }, row: { READY: "2/2", STATUS: "Running", RESTARTS: 0 }, wide: { NODE: n.name } }, { kind: "Pod", name: `kube-proxy-${["b4t9n", "h2v6r", "p8k1s"][j]}`, ns: "kube-system", labels: { "k8s-app": "kube-proxy" }, row: { READY: "1/1", STATUS: "Running", RESTARTS: 0 }, wide: { NODE: n.name } }]), ...["5d8f7c9b6-x2k9w", "5d8f7c9b6-q7m3n"].map((s) => ({ kind: "Pod", name: "coredns-" + s, ns: "kube-system", labels: { "k8s-app": "kube-dns" }, row: { READY: "1/1", STATUS: "Running", RESTARTS: 0 }, wide: { NODE: nodesNow()[0]?.name || "<none>" } }))];
const authOk = (f) => true;
S.kube({
  ns: "default", auto: false,
  help: ["aws eks describe-cluster --name shop   ·   aws eks update-kubeconfig --name shop", "aws eks update-cluster-config --name shop --resources-vpc-config endpointPublicAccess=false,endpointPrivateAccess=true", "aws eks list-addons --cluster-name shop   ·   aws eks describe-nodegroup …   ·   aws eks update-nodegroup-config … --scaling-config desiredSize=2", "kubectl get nodes -o wide   ·   kubectl get pods -n kube-system -o wide", "ssh bastion   (run kubectl from inside the VPC) · exit",
    "kubectl cluster-info   ·   dig +short 9F2C1E.gr7.us-east-1.eks.amazonaws.com   (from the laptop or the bastion)"],
  examples: ["aws eks update-kubeconfig --name shop", "kubectl get nodes -o wide", "kubectl get pods -n kube-system", "aws eks list-addons --cluster-name shop", "dig +short 9F2C1E.gr7.us-east-1.eks.amazonaws.com", "aws eks update-cluster-config --name shop --resources-vpc-config endpointPublicAccess=false,endpointPrivateAccess=true", "kubectl cluster-info"],
  objects: () => [...nodesNow(), ...sysPods()],
  verbs: {
    "cluster-info"() { return st.mode === "private" && st.where !== "bastion" ? { err: "Unable to connect to the server: dial tcp 54.85.140.12:443: i/o timeout   # private-only endpoint: run kubectl from inside the VPC" } : ["Kubernetes control plane is running at https://9F2C1E.gr7.us-east-1.eks.amazonaws.com", "CoreDNS is running at https://9F2C1E.gr7.us-east-1.eks.amazonaws.com/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy"]; },
    get({ pos }) { if (st.mode === "private" && st.where !== "bastion") return { err: "Unable to connect to the server: dial tcp 54.85.140.12:443: i/o timeout   # the laptop can't reach a private-only endpoint" }; return undefined; },
  },
  tools: {
    ssh({ pos }) { if (!/bastion/.test(pos.join(" "))) return { err: "ssh: this lesson has one host: ssh bastion" }; st.where = "bastion"; return ["# you are now on the bastion inside the VPC: kubectl uses the private endpoint here. Type exit to go back."]; },
    exit() { st.where = "laptop"; return ["# back on your laptop, outside the VPC"]; },
    aws({ pos, f }) {
      const [svc, op] = pos;
      if (svc !== "eks") return { err: "this lesson simulates aws eks …" };
      if (op === "describe-cluster") return { yaml: clusterY() };
      if (op === "update-kubeconfig") return ["Added new context arn:aws:eks:us-east-1:111122223333:cluster/shop to /home/you/.kube/config   # it calls 'aws eks get-token' for every kubectl command"];
      if (op === "list-addons") return ['{ "addons": [' + Object.keys(st.addons).map((a) => `"${a}"`).join(", ") + "] }"];
      if (op === "describe-addon") return { yaml: addonY() };
      if (op === "describe-nodegroup") return { yaml: ngY() };
      if (op === "describe-fargate-profile") return st.fargate ? { yaml: fgY() } : { err: "An error occurred (ResourceNotFoundException): No Fargate Profile found with name: batch" };
      if (op === "create-fargate-profile") { S.stopTour(); setFargate(true); return ['{ "fargateProfile": { "fargateProfileName": "batch", "status": "CREATING" } }']; }
      if (op === "update-nodegroup-config") { const m = [f["--scaling-config"], ...pos].join(" ").match(/desiredSize=(\d+)/); if (!m) return { err: "--scaling-config desiredSize=N is required" }; S.stopTour(); setNg(+m[1]); return ['{ "update": { "type": "ConfigUpdate", "status": "InProgress" } }']; }
      if (op === "update-cluster-config") { const s = [f["--resources-vpc-config"], ...pos].join(" "); const pub = !/endpointPublicAccess=false/.test(s), priv = /endpointPrivateAccess=true/.test(s) || (!/endpointPrivateAccess=false/.test(s) && st.mode !== "public"); if (!pub && !priv) return { err: "An error occurred (InvalidParameterException): At least one of public or private endpoint access must be enabled" }; S.stopTour(); setMode(pub && priv ? "both" : pub ? "public" : "private"); return ['{ "update": { "type": "EndpointAccessUpdate", "status": "InProgress" } }   # takes a few minutes in real life']; }
      return { err: "this lesson simulates aws eks describe-cluster | update-kubeconfig | list-addons | describe-addon | describe-nodegroup | update-nodegroup-config | create-fargate-profile | update-cluster-config" };
    },
    dig({ pos }) { if (!pos.some((x) => /eks\.amazonaws\.com/.test(x))) return { err: "try: dig +short 9F2C1E.gr7.us-east-1.eks.amazonaws.com" }; return st.mode === "public" ? ["54.85.140.12", "3.214.18.77", "# public IPs of the endpoint's load balancer, from anywhere"] : st.mode === "both" ? ["# from the laptop: 54.85.140.12, 3.214.18.77 (public)", "# from inside the VPC: 10.0.1.143, 10.0.2.87 (the EKS ENIs, via Route 53 private hosted zone)"] : ["# from the laptop: no answer you can use (private only)", "# from inside the VPC: 10.0.1.143, 10.0.2.87 (the EKS ENIs)"]; },
  },
});
// ---- end kubectl ----

S.setTour([
  { home: true, say: "Two accounts. On the left, AWS runs your control plane; on the right is your own VPC with your nodes.", hold: 6 },
  { focus: "etcd-1", zoom: 1.6, say: "The control plane: API servers and three etcd members spread over three AZs. AWS patches, scales and backs it up.", hold: 6 },
  { focus: "nlb", zoom: 2.2, say: "kubectl on your laptop reaches the API through the public endpoint, a load balancer, authenticated with IAM.", hold: 6 },
  { focus: "xeni-1", zoom: 2.4, say: "EKS places network interfaces in your subnets. The API server reaches kubelets through them, and with private access on, so do your nodes.", hold: 7 },
  { home: true, say: "Switch to private only: the laptop is refused, while the bastion and the nodes still reach the API inside the VPC.", run: () => setMode("private"), hold: 7 },
  { home: true, say: "Lose an AZ: one API server and one etcd member go, but etcd keeps its quorum of 2 of 3 and the API keeps answering.", run: () => { setMode("both"); setAz(1); }, hold: 7 },
  { focus: "fg-0", zoom: 1.8, say: "Fargate: pods in the batch namespace each get their own micro-VM; no EC2 instances for you to run.", run: () => { setAz(1); setFargate(true); }, hold: 6 },
  { home: true, say: "AWS runs the control plane; you choose how it's reached and what the pods run on.", hold: 5 },
]);
S.start();
