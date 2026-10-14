// Lesson 23 in 3D: the Amazon VPC CNI. Pods get real VPC IPs: ipamd (aws-node) attaches ENIs to each node and
// fills them with secondary IPs (or /28 prefixes), keeps a warm pool, and runs out when the subnet does.
const S = createStage({ home: { target: [0, 14, 10], dir: [0.9, 1.1, 1.15], zoom: 1 }, viewH: 300, minW: 520, phoneMinW: 420 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const TOP = 11, FY = 1.9;
const TYPES = { "t3.medium": { enis: 3, ips: 6, cpu: 2 }, "m5.large": { enis: 3, ips: 10, cpu: 2 }, "m5.xlarge": { enis: 4, ips: 15, cpu: 4 } };
const NODES = [{ x: -78 }, { x: 78 }];
const NODE_Z = 30, RACK_Z = -42, SUBNET_Z = 104, CGNAT_Z = 124;
const ALB = { x: 210, z: 30 };

part("plate", { kind: "VPC CNI", title: "Where pod IPs come from", noFrame: true, zoom: 1, anchor: V(0, 30, 0),
  desc: "Two worker nodes in one subnet. Behind each, its network interfaces (ENIs), each a card with a row of IP slots. At the front, the subnet's address space. Every pod IP is a real address from that subnet." });
own("plate", S.plate({ x: 10, z: 34, w: 470, d: 260 }));
own("plate", track([[[ALB.x, NODE_Z + 40], [-150, NODE_Z + 40]], ...NODES.map((n) => [[n.x, NODE_Z + 40], [n.x, NODE_Z + 30]])], { width: 4 }));

// ---- nodes with their ENI racks ----
const nodeVis = NODES.map((n, i) => {
  const id = part("node-" + i, { kind: "EC2 node", title: () => `node-${i + 1} (${st.type})`, zoom: 2, anchor: V(n.x, TOP + 26, NODE_Z),
    desc: () => { const s = nodeState[i]; return `An ${st.type}: up to <b>${T().enis} ENIs</b> with <b>${T().ips} IPv4 addresses each</b>. Max pods here: <b>${maxPods()}</b> (${st.prefix ? "prefix delegation: (ENIs × (IPs − 1) × 16) + 2, capped at 110" : `ENIs × (IPs − 1) + 2 = ${T().enis} × ${T().ips - 1} + 2`}${st.custom ? ", minus the primary ENI with custom networking" : ""}). Pods now: <b>${podsOn(i).length}</b>. IPs held by this node: <b>${heldIps(s)}</b>.`; } });
  own(id, S.tray({ x: n.x, z: NODE_Z, w: 120, d: 60, top: TOP }));
  label(id, "node-" + (i + 1));
  const rack = part("rack-" + i, { kind: "ENIs", title: `node-${i + 1}'s network interfaces`, zoom: 2.4, anchor: V(n.x, 40, RACK_Z),
    desc: () => `Each card is an ENI attached to the instance. Its first slot is the ENI's own primary IP (not for pods); the rest are secondary IPs ${st.prefix ? "<b>or, with prefix delegation, /28 prefixes of 16 IPs each</b>" : ""} that ipamd hands to pods. Lit: in use by a pod. Dim white: warm, allocated from the subnet but idle. Dark: not allocated.` });
  own("rack-" + i, box(110, 2, 30, { x: n.x, y0: 0, z: RACK_Z, tone: "lo", r: 0.8 }), box(3, 34, 26, { x: n.x - 54, y0: 2, z: RACK_Z, tone: "mid", r: 0.4 }));
  const cards = [0, 1, 2, 3].map((e) => { const y = 4 + e * 8; const c = box(100, 2, 22, { x: n.x + 2, y0: y, z: RACK_Z, tone: e === 0 ? "mid" : "hi", r: 0.4 }); own("rack-" + i, c); c.visible = false; const lamps = Array.from({ length: 15 }, (_, k) => { const l = lamp(n.x - 42 + k * 6.2, y + 2, RACK_Z + 6, { r: 1.1, state: "off" }); own("rack-" + i, l.mesh); l.mesh.visible = false; return l; }); const tag = S.label("rack-" + i, "", { small: true, anchor: V(n.x - 58, y + 3, RACK_Z), lod: 1.6 }); return { c, lamps, tag, y }; });
  label("rack-" + i, `node-${i + 1} ENIs`);
  return { cards };
});
const POD_MAX = 64;
const podMeshes = Array.from({ length: POD_MAX }, () => { const c = crate({ w: 8, h: 7, d: 8, ribs: 2 }); c.visible = false; const l = lamp(0, 7, 0, { r: 0.9 }); c.add(l.mesh); l.mesh.position.set(0, 7.7, 0); S.world.add(c); return { c, l }; });
part("subnet", { kind: "Subnet", title: () => `subnet-0a1 ${st.subnetCidr}`, zoom: 1.6, anchor: V(0, 12, SUBNET_Z), desc: () => `The nodes' subnet. AWS keeps 5 addresses in every subnet, so a ${st.subnetCidr} has <b>${subnetSize()}</b> usable. In use now: <b>${subnetUsed()}</b> (8 by other ENIs such as an RDS instance and VPC endpoints, node and ENI primary IPs, plus every secondary IP or prefix ipamd holds, idle or not). When it runs out, new pods can't get an IP.` });
own("subnet", box(300, 2, 10, { x: 0, y0: 0, z: SUBNET_Z, tone: "lo", r: 0.6 }));
const fillMat = new THREE.MeshBasicMaterial(), fillBad = new THREE.MeshBasicMaterial();
S.onTheme((p) => { fillMat.color.set(p.accent); fillBad.color.set(p.bad); });
const subnetFill = new THREE.Mesh(new THREE.BoxGeometry(1, 2.4, 8), fillMat);
subnetFill.position.set(-150, 1.2, SUBNET_Z); S.world.add(subnetFill);
label("subnet", "");
part("cgnat", { kind: "Secondary CIDR", title: "100.64.0.0/16 pod subnets (custom networking)", zoom: 1.6, anchor: V(0, 12, CGNAT_Z), desc: "A secondary CIDR added to the VPC, from the 100.64.0.0/10 range that isn't routable outside it. With custom networking, an ENIConfig per AZ tells ipamd to put pod ENIs in these big subnets, leaving the node subnets alone." });
const cgBar = box(300, 2, 10, { x: 0, y0: 0, z: CGNAT_Z, tone: "mid", r: 0.6 });
own("cgnat", cgBar);
const cgFill = new THREE.Mesh(new THREE.BoxGeometry(1, 2.4, 8), fillMat);
cgFill.position.set(-150, 1.2, CGNAT_Z); S.world.add(cgFill);
label("cgnat", "");
part("alb", { kind: "Load balancer", title: "ALB (target type ip)", zoom: 2.6, anchor: V(ALB.x, 22, ALB.z), desc: "Because pod IPs are VPC addresses, anything in the VPC (an ALB, an EC2 instance, a database) reaches a pod directly, with no NAT or overlay network in between." });
own("alb", housing({ x: ALB.x, z: ALB.z, w: 20, d: 40, h: 14 }));
label("alb", "ALB → pod IPs");
part("aws-node", { kind: "DaemonSet", title: "aws-node (ipamd)", zoom: 2.6, anchor: V(-200, 22, RACK_Z), desc: () => `The VPC CNI runs as the aws-node DaemonSet. Its ipamd process calls EC2 to attach ENIs and assign IPs ahead of time, so a new pod gets one instantly. Warm pool: <b>${st.warm === "eni" ? "WARM_ENI_TARGET=1 (a whole spare ENI's worth)" : "WARM_IP_TARGET=3 (just three spare IPs)"}</b>.` });
const ipamd = crate({ w: 26, h: 12, d: 20, ribs: 4 }); ipamd.position.set(-200, 0, RACK_Z);
const ipamdLamp = lamp(-192, 12, RACK_Z + 5, { r: 1.2 });
own("aws-node", ipamd, ipamdLamp.mesh);
label("aws-node", "aws-node (ipamd)");

// ---- the model ----
const st = { type: "m5.large", pods: 16, warm: "eni", prefix: false, custom: false, subnetCidr: "10.0.1.0/26", sgp: false, clock: 0 };
const T = () => TYPES[st.type];
const nodeState = NODES.map(() => ({ enis: [{ alloc: 0 }] }));
const maxPods = () => { const t = T(), e = st.custom ? t.enis - 1 : t.enis; return st.prefix ? Math.min(110, e * (t.ips - 1) * 16 + 2) : e * (t.ips - 1) + 2; };
const unit = () => (st.prefix ? 16 : 1);
const subnetSize = () => ({ "10.0.1.0/26": 59, "10.0.1.0/24": 251 })[st.subnetCidr];
const heldIps = (s) => s.enis.length + s.enis.reduce((a, e) => a + (st.custom && e === s.enis[0] ? 0 : e.alloc * unit()), 0);
// the node subnet holds every ENI's primary IP; pod IPs come from it unless custom networking moves them
const OTHERS = 8; // other ENIs in the same subnet: an RDS instance, a Lambda, VPC endpoints
const subnetUsed = () => OTHERS + nodeState.reduce((a, s) => a + s.enis.length + (st.custom ? 0 : s.enis.reduce((b, e) => b + e.alloc * unit(), 0)), 0);
const cgUsed = () => (st.custom ? nodeState.reduce((a, s) => a + s.enis.slice(1).reduce((b, e) => b + e.alloc * unit(), 0), 0) : 0);
const pods = []; // { id, node, state: "running" | "noip" | "pending", ip }
const podsOn = (i) => pods.filter((p) => p.node === i && p.state === "running");
const capacity = (s) => s.enis.reduce((a, e, k) => a + (st.custom && k === 0 ? 0 : e.alloc * unit()), 0);
let msg = "", lastEvent = "";
function ipamd_(i, dt) {
  const s = nodeState[i], t = T(), used = podsOn(i).length + pods.filter((p) => p.node === i && p.state === "noip").length;
  const want = st.warm === "eni" ? used + (t.ips - 1) * unit() : used + 3;
  const slotsPer = t.ips - 1;
  // grow: add an IP (or prefix) to the first ENI with room, attaching a new ENI when all are full
  if (capacity(s) < want) {
    const free = subnetSize() - subnetUsed(), cgFree = 4091 * 2 - cgUsed();
    let e = s.enis.find((x, k) => !(st.custom && k === 0) && x.alloc < slotsPer);
    if (!e) { if (s.enis.length < t.enis && free >= 1) { s.enis.push({ alloc: 0 }); return; } return; }
    if ((st.custom ? cgFree : free) >= unit()) e.alloc++;
    else if (lastEvent !== "full") { lastEvent = "full"; S.event("Warning", "InsufficientFreeAddressesInSubnet", "node/node-" + (i + 1), `ipamd: failed to allocate ${st.prefix ? "a /28 prefix" : "a private IP address"}: InsufficientFreeAddressesInSubnet: The specified subnet does not have enough free addresses to satisfy the request.`, "aws-node"); }
  }
  // shrink: give back what's beyond the warm target, one unit at a time, and detach empty ENIs
  else if (capacity(s) - unit() >= want) { const e = [...s.enis].reverse().find((x) => x.alloc > 0); if (e) e.alloc--; const last = s.enis[s.enis.length - 1]; if (s.enis.length > 1 && last.alloc === 0) s.enis.pop(); }
}
function schedulePods() {
  while (pods.length < st.pods) pods.push({ id: pods.length, node: pods.length % 2, state: "pending" });
  while (pods.length > st.pods) pods.pop();
  for (const p of pods) {
    if (p.state === "running") continue;
    // the scheduler only knows max pods; IPs come later, from the CNI
    if (pods.filter((q) => q.node === p.node && q.state !== "pending").length >= maxPods() && p.state === "pending") { const other = 1 - p.node; if (pods.filter((q) => q.node === other && q.state !== "pending").length < maxPods()) p.node = other; else continue; }
    const s = nodeState[p.node];
    if (podsOn(p.node).length < capacity(s)) { p.state = "running"; } else p.state = "noip";
  }
  // pods beyond max pods on both nodes stay Pending
  for (const i of [0, 1]) { const on = pods.filter((p) => p.node === i && p.state !== "pending"); on.slice(maxPods()).forEach((p) => (p.state = "pending")); }
}
let tick = 0;
S.onTick((dt) => {
  st.clock += dt; tick -= dt;
  if (tick <= 0) { tick = 0.12; schedulePods(); ipamd_(0); ipamd_(1); }
  // racks
  nodeVis.forEach((nv, i) => {
    const s = nodeState[i], t = T(), running = podsOn(i).length;
    let consumed = 0;
    nv.cards.forEach((card, e) => {
      const en = s.enis[e];
      card.c.visible = !!en; card.tag.show = !!en; if (card.tag.el.textContent !== `eth${e}`) card.tag.el.textContent = `eth${e}`;
      card.lamps.forEach((l, k) => {
        const vis = !!en && k < t.ips; l.mesh.visible = vis; if (!vis) return;
        if (k === 0) { l.set("on"); return; } // the ENI's own primary IP
        if ((st.custom && e === 0) || k > en.alloc) { l.set("off"); return; }
        const inUse = consumed < running; consumed += unit();
        l.set(inUse ? "accent" : "on");
      });
    });
  });
  // pods on the trays
  podMeshes.forEach((m) => (m.c.visible = false));
  let k = 0;
  for (const i of [0, 1]) {
    const list = pods.filter((p) => p.node === i && p.state !== "pending");
    list.forEach((p, j) => { const m = podMeshes[k++]; if (!m) return; m.c.visible = true; m.c.position.set(NODES[i].x - 50 + (j % 10) * 11, TOP, NODE_Z - 20 + Math.floor(j / 10) * 13); m.l.set(p.state === "running" ? "accent" : "bad"); m.c.scale.y = p.state === "running" ? 1 : 0.6; });
  }
  const used = subnetUsed(), size = subnetSize(), frac = Math.min(1, used / size);
  subnetFill.scale.x = Math.max(0.5, frac * 300); subnetFill.position.x = -150 + (frac * 300) / 2; subnetFill.material = frac >= 0.97 ? fillBad : fillMat;
  S.setLabel("subnet", `subnet-0a1 ${st.subnetCidr} · ${used}/${size} IPs used`, { bad: frac >= 0.97 });
  cgBar.visible = st.custom; cgFill.visible = st.custom; const cf = cgUsed() / 8182; cgFill.scale.x = Math.max(0.5, cf * 300); cgFill.position.x = -150 + (cf * 300) / 2;
  S.setLabel("cgnat", `pod subnets 100.64.0.0/19 ×2 · ${cgUsed()}/8182 used`, { show: st.custom });
  NODES.forEach((_, i) => S.setLabel("node-" + i, `node-${i + 1} · ${podsOn(i).length}/${maxPods()} pods`, { bad: pods.some((p) => p.node === i && p.state === "noip") }));
  ipamdLamp.set(pods.some((p) => p.state === "noip") ? "bad" : "on");
  const noip = pods.filter((p) => p.state === "noip").length, pend = pods.filter((p) => p.state === "pending").length;
  S.say(`${st.type} · max ${maxPods()} pods/node · running ${pods.filter((p) => p.state === "running").length}/${st.pods}${noip ? ` · ${noip} waiting for an IP` : ""}${pend ? ` · ${pend} Pending (too many pods)` : ""}`);
  syncUi();
});

// ---- actions ----
function setType(t) { st.type = t; nodeState.forEach((s) => (s.enis = [{ alloc: 0 }])); pods.forEach((p) => (p.state = "pending")); msg = `New nodes: ${t} has ${TYPES[t].enis} ENIs × ${TYPES[t].ips} IPs. Max pods is set by IPs, not by CPU: ${maxPods()} per node.`; }
function setPods(n) { st.pods = Math.max(0, Math.min(POD_MAX, n)); }
function setWarm(w) { st.warm = w; msg = w === "eni" ? "WARM_ENI_TARGET=1 (the default): ipamd keeps a whole spare ENI's worth of IPs per node. Pods start instantly, but each node holds many idle addresses." : "WARM_IP_TARGET=3: ipamd keeps only three spare IPs per node and returns the rest. Far fewer idle addresses; a burst of pods waits a little for EC2 calls."; }
function setPrefix(on) { st.prefix = on; nodeState.forEach((s) => (s.enis = [{ alloc: 0 }])); pods.forEach((p) => (p.state = "pending")); msg = on ? `Prefix delegation: each slot now holds a /28 prefix (16 IPs). Max pods jumps to ${maxPods()}, but each node grabs IPs 16 at a time, so a small subnet runs out faster.` : "Back to one secondary IP per slot."; }
function setCustom(on) { st.custom = on; nodeState.forEach((s) => (s.enis = [{ alloc: 0 }])); pods.forEach((p) => (p.state = "pending")); msg = on ? "Custom networking: pod ENIs move to subnets in the secondary CIDR 100.64.0.0/16. The node subnet now only holds node IPs. The primary ENI no longer serves pods, so max pods drops." : "Pods use the node subnet again."; }
function setSubnet(c) { st.subnetCidr = c; msg = c === "10.0.1.0/24" ? "A /24: 251 usable addresses." : "A /26: only 59 usable addresses. Small subnets are the most common cause of IP exhaustion on EKS."; }

// ---- controls ----
S.overview = () => `<h2>Where pod IPs come from</h2><p class="muted">Accent slots are IPs held by running pods, white ones are warm spares, dark ones unallocated. Red pods are waiting for an IP. Pick a part:</p>`;
const ui = { status: document.getElementById("vc-status"), pods: document.getElementById("vc-pods"), type: [...document.querySelectorAll("[data-type]")], warm: document.getElementById("vc-warm"), prefix: document.getElementById("vc-prefix"), custom: document.getElementById("vc-custom"), subnet: document.getElementById("vc-subnet") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "p-") setPods(st.pods - 6); if (a === "p+") setPods(st.pods + 6);
  if (a === "type") setType(b.dataset.type);
  if (a === "warm") { setWarm(st.warm === "eni" ? "ip" : "eni"); S.shellEcho?.(`kubectl set env daemonset aws-node -n kube-system ${st.warm === "ip" ? "WARM_IP_TARGET=3 WARM_ENI_TARGET-" : "WARM_ENI_TARGET=1 WARM_IP_TARGET-"}`, "button"); }
  if (a === "prefix") { setPrefix(!st.prefix); S.shellEcho?.(`kubectl set env daemonset aws-node -n kube-system ENABLE_PREFIX_DELEGATION=${st.prefix}`, "button"); }
  if (a === "custom") setCustom(!st.custom);
  if (a === "subnet") setSubnet(st.subnetCidr === "10.0.1.0/26" ? "10.0.1.0/24" : "10.0.1.0/26");
  S.renderPanel();
}));
function syncUi() {
  const set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  set(ui.pods, `${st.pods} pods`);
  ui.type.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === st.type)));
  set(ui.warm, st.warm === "eni" ? "Warm pool: WARM_ENI_TARGET=1" : "Warm pool: WARM_IP_TARGET=3");
  set(ui.prefix, `Prefix delegation: ${st.prefix ? "on" : "off"}`); ui.prefix.setAttribute("aria-pressed", String(st.prefix));
  set(ui.custom, `Custom networking: ${st.custom ? "on" : "off"}`); ui.custom.setAttribute("aria-pressed", String(st.custom));
  set(ui.subnet, `Subnet: ${st.subnetCidr}`);
  const noip = pods.filter((p) => p.state === "noip").length;
  set(ui.status, noip ? `${noip} pod(s) stuck in ContainerCreating: "failed to assign an IP address to container". The subnet has ${subnetSize() - subnetUsed()} free addresses, ${st.warm === "eni" ? "and the warm pools are holding many of them idle" : "and nothing left to hand out"}. Try WARM_IP_TARGET, a bigger subnet, or custom networking.` : msg || "Two m5.large nodes in a small /26 subnet. Add pods and watch the ENIs fill.");
  ui.status.dataset.tone = noip || pods.some((p) => p.state === "pending") ? "bad" : "";
}

// ---- what the inspector shows ----
const awsNodeY = () => `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: aws-node
  namespace: kube-system
spec:
  selector: { matchLabels: { k8s-app: aws-node } }
  template:
    spec:
      hostNetwork: true   # ← it configures the node's own networking
      containers:
      - name: aws-node
        image: 602401143452.dkr.ecr.us-east-1.amazonaws.com/amazon-k8s-cni:v1.18.3-eksbuild.1
        env:
        - { name: ${st.warm === "eni" ? "WARM_ENI_TARGET" : "WARM_IP_TARGET"}, value: "${st.warm === "eni" ? 1 : 3}" }   # ← how many spare IPs each node keeps
        - { name: ENABLE_PREFIX_DELEGATION, value: "${st.prefix}" }   # ← /28 prefixes instead of single IPs
        - { name: AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG, value: "${st.custom}" }   # ← pod ENIs in other subnets (ENIConfig)
        - { name: ENABLE_POD_ENI, value: "${st.sgp}" }   # ← security groups for pods (branch ENIs)`;
const enicfgY = () => `apiVersion: crd.k8s.amazonaws.com/v1alpha1
kind: ENIConfig
metadata:
  name: us-east-1a   # ← one per AZ; nodes pick theirs by zone label
spec:
  subnet: subnet-0f9c1e2a7b4d0a1b2   # ← 100.64.0.0/19 in us-east-1a
  securityGroups: [sg-0pods1a2b3c]`;
const fields = { "spec.template.spec.containers[0].env[0].value": { check: (v) => (!/^\d+$/.test(String(v)) ? "must be a number" : ""), set: () => {} }, "spec.template.spec.containers[0].env[0].name": { check: (v) => (!["WARM_ENI_TARGET", "WARM_IP_TARGET"].includes(v) ? "WARM_ENI_TARGET or WARM_IP_TARGET" : ""), set: (v) => setWarm(v === "WARM_IP_TARGET" ? "ip" : "eni") }, "spec.template.spec.containers[0].env[1].value": { check: (v) => (!["true", "false", true, false].includes(v) ? '"true" or "false"' : ""), set: (v) => { if (String(v) === "true" !== st.prefix) setPrefix(String(v) === "true"); } }, "spec.template.spec.containers[0].env[2].value": { check: (v) => (!["true", "false", true, false].includes(v) ? '"true" or "false"' : ""), set: (v) => { if (String(v) === "true" !== st.custom) setCustom(String(v) === "true"); } }, "spec.template.spec.containers[0].env[3].value": { check: () => "", set: () => {} } };
Object.assign(S.PARTS["aws-node"], { manifest: () => awsNodeY() + (st.custom ? "\n---\n" + enicfgY() : ""), fields: (kind) => (kind === "DaemonSet" ? fields : kind === "ENIConfig" ? {} : null) });
NODES.forEach((_, i) => {
  Object.assign(S.PARTS["rack-" + i], { manifest: () => `# aws ec2 describe-network-interfaces --filters Name=attachment.instance-id,Values=i-0${i + 3}f9c1e2a (excerpt)\n` + nodeState[i].enis.map((e, k) => `- NetworkInterfaceId: eni-0${k}${i}9c1e2a7b4d\n  Description: ${k === 0 ? "primary (eth0)" : `aws-K8S-i-0${i + 3}f9c1e2a`}   # ← ${k === 0 ? "created with the instance" : "attached by ipamd"}\n  PrivateIpAddress: 10.0.1.${10 + i * 20 + k}\n  ${st.prefix ? `Ipv4Prefixes: [${Array.from({ length: e.alloc }, (_, j) => `10.0.1.${64 + (i * 4 + k) * 16 + j * 16}/28`).join(", ")}]` : `SecondaryPrivateIps: ${e.alloc}`}`).join("\n") });
  Object.assign(S.PARTS["node-" + i], { manifest: () => K.node({ name: `ip-10-0-1-${10 + i * 20}.ec2.internal`, cidr: "10.0.1.0/26", cpu: String(T().cpu), mem: "8Gi", pods: maxPods(), labels: { "node.kubernetes.io/instance-type": st.type, "topology.kubernetes.io/zone": "us-east-1a" } }).replace(/podCIDR: .*/, "# no podCIDR: with the VPC CNI, pods take IPs from the VPC subnet").replace(`pods: "${maxPods()}" }   #`, `pods: "${maxPods()}" }   # ← max pods, computed from ENIs × IPs;`) });
});

// ---- kubectl and the YAML editor ----
const podName = (p) => `web-6d8f9-${"bcdfghjklmnpqrstvwxz"[p.id % 20]}${"2456789bcdfg"[Math.floor(p.id / 20) % 12]}${p.id}`;
const ipOf = (p) => { if (p.state !== "running") return "<none>"; const g = pods.filter((q) => q.state === "running").indexOf(p); return st.custom ? `100.64.${p.node * 32 + Math.floor(g / 250)}.${(g % 250) + 4}` : `10.0.1.${8 + g}`; };
S.kube({
  ns: "default", auto: false,
  help: ["kubectl get pods -o wide   (pod IPs are VPC addresses)", "kubectl describe pod <a ContainerCreating pod>", "kubectl set env ds aws-node -n kube-system WARM_IP_TARGET=3   ·   ENABLE_PREFIX_DELEGATION=true", "kubectl scale deploy web --replicas=40", "aws ec2 describe-subnets --subnet-ids subnet-0a1   ·   kubectl get node -o jsonpath max pods: kubectl describe node node-1", "max-pods-calculator.sh --instance-type m5.large --cni-version 1.18.3"],
  examples: ["kubectl get pods -o wide", "kubectl scale deploy web --replicas=40", "aws ec2 describe-subnets --subnet-ids subnet-0a1", "kubectl set env ds aws-node -n kube-system WARM_IP_TARGET=3", "kubectl set env ds aws-node -n kube-system ENABLE_PREFIX_DELEGATION=true", "max-pods-calculator.sh --instance-type m5.xlarge", "kubectl get events"],
  objects: () => [
    ...pods.map((p) => ({ kind: "Pod", name: podName(p), labels: { app: "web" }, row: { READY: p.state === "running" ? "1/1" : "0/1", STATUS: p.state === "running" ? "Running" : p.state === "noip" ? "ContainerCreating" : "Pending", RESTARTS: 0 }, wide: { IP: ipOf(p), NODE: p.state === "pending" ? "<none>" : `ip-10-0-1-${10 + p.node * 20}.ec2.internal` }, describe: () => (p.state === "noip" ? [["Status:", "Pending"], ["Events:"], ["  Warning  FailedCreatePodSandBox  kubelet  Failed to create pod sandbox: plugin type=\"aws-cni\" failed (add): add cmd: failed to assign an IP address to container"]] : p.state === "pending" ? [["Status:", "Pending"], ["Events:"], [`  Warning  FailedScheduling  default-scheduler  0/2 nodes are available: 2 Too many pods.`]] : [["Status:", "Running"], ["IP:", ipOf(p) + "   # a VPC address: reachable from anything in the VPC"]]) })),
    ...NODES.map((_, i) => ({ kind: "Node", name: `ip-10-0-1-${10 + i * 20}.ec2.internal`, part: "node-" + i, labels: { "node.kubernetes.io/instance-type": st.type }, row: { STATUS: "Ready", ROLES: "<none>", VERSION: "v1.31.2-eks-7f9249a" }, wide: { "MAX PODS": maxPods(), "INSTANCE-TYPE": st.type }, describe: () => [["Capacity:"], ["  pods:", maxPods()], ["Allocated pods:", podsOn(i).length]] })),
    { kind: "DaemonSet", name: "aws-node", ns: "kube-system", part: "aws-node", labels: { "k8s-app": "aws-node" }, row: { DESIRED: 2, CURRENT: 2, READY: 2, "NODE SELECTOR": "<none>" } },
  ],
  verbs: {
    scale({ pos, f }) { if (!/web$/.test(pos.join("/"))) return { err: 'Error from server (NotFound): deployments.apps not found (this lesson has deploy/web)' }; const n = +f["--replicas"]; if (!Number.isInteger(n) || n < 0 || n > POD_MAX) return { err: `0–${POD_MAX} replicas here` }; S.stopTour(); setPods(n); return ["deployment.apps/web scaled"]; },
    set({ pos }) {
      if (pos[0] !== "env" || !/aws-node/.test(pos.join(" "))) return { err: "this lesson simulates kubectl set env ds aws-node -n kube-system KEY=value" };
      const kv = pos.filter((x) => /=|-$/.test(x)), out = [];
      S.stopTour();
      for (const x of kv) { const [k, v] = x.split("="); if (k === "WARM_IP_TARGET" && v) setWarm("ip"); else if (k === "WARM_ENI_TARGET" && v) setWarm("eni"); else if (k === "ENABLE_PREFIX_DELEGATION") { if ((v === "true") !== st.prefix) setPrefix(v === "true"); } else if (k === "AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG") { if ((v === "true") !== st.custom) setCustom(v === "true"); } else if (!x.endsWith("-")) return { err: `this lesson models WARM_IP_TARGET, WARM_ENI_TARGET, ENABLE_PREFIX_DELEGATION and AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG` }; }
      return ["daemonset.apps/aws-node env updated   # the aws-node pods restart with the new settings"];
    },
  },
  tools: {
    aws({ pos }) { if (pos[0] !== "ec2" || pos[1] !== "describe-subnets") return { err: "this lesson simulates aws ec2 describe-subnets --subnet-ids subnet-0a1" }; return [`SubnetId: subnet-0a1   CidrBlock: ${st.subnetCidr}   AvailabilityZone: us-east-1a`, `AvailableIpAddressCount: ${Math.max(0, subnetSize() - subnetUsed())}   # ← of ${subnetSize()} usable (AWS keeps 5)`]; },
    "max-pods-calculator.sh"({ f }) { const t = TYPES[f["--instance-type"]] ? f["--instance-type"] : null; if (!t) return { err: `known here: ${Object.keys(TYPES).join(", ")}` }; const x = TYPES[t], e = x.enis; return [`${e * (x.ips - 1) + 2}   # ${e} ENIs × (${x.ips} IPs − 1) + 2`, `# with prefix delegation: ${Math.min(110, e * (x.ips - 1) * 16 + 2)} (EKS recommends a cap of 110 below 30 vCPUs)`]; },
  },
});
// ---- end kubectl ----

S.setTour([
  { home: true, say: "Two m5.large nodes in one small subnet. Behind each node, its network interfaces (ENIs), each with ten IP slots.", hold: 6 },
  { focus: "rack-0", zoom: 2.2, say: "The first slot on each ENI is its own address. The rest are secondary IPs ipamd assigns to pods: accent in use, white kept warm.", hold: 7 },
  { focus: "node-0", zoom: 1.8, say: "Max pods comes from IPs, not CPU: 3 ENIs × (10 − 1) + 2 = 29 pods on an m5.large.", hold: 6 },
  { home: true, say: "Scale to 52 pods. Each node attaches more ENIs and fills them, plus a whole spare ENI's worth kept warm...", run: () => setPods(52), hold: 8 },
  { focus: "subnet", zoom: 1.6, say: "...and the /26 subnet runs dry. New pods sit in ContainerCreating: failed to assign an IP address.", hold: 7 },
  { home: true, say: "WARM_IP_TARGET=3 hands idle warm addresses back to the subnet. It helps, but 52 pods simply don't fit in a /26.", run: () => setWarm("ip"), hold: 8 },
  { home: true, say: "Custom networking moves pod IPs into a big secondary CIDR, 100.64.0.0/16, so node subnets stop running out.", run: () => setCustom(true), hold: 8 },
  { home: true, say: "Every pod has a real VPC address. That's why an ALB can send to pods directly, and why you plan subnets for pods, not just nodes.", run: () => { setCustom(false); setWarm("eni"); setPods(16); }, hold: 6 },
]);
S.start();
