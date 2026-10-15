// Lesson 27 in 3D: load balancing on EKS. The AWS Load Balancer Controller builds an ALB (from an Ingress) or an
// NLB (from a Service) in tagged subnets. Target type instance sends requests to nodes and kube-proxy forwards
// them, often across nodes; target type ip sends them straight to pod IPs. Readiness gates keep rollouts safe.
const S = createStage({ home: { target: [0, 10, -12], dir: [0.9, 1.1, 1.15], zoom: 1 }, viewH: 265, minW: 490, phoneMinW: 420 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const FY = 1.9, TOP = 11;
const AZ = [{ name: "us-east-1a", z: -70 }, { name: "us-east-1b", z: 0 }, { name: "us-east-1c", z: 70 }];
const laneZ = (a) => AZ[a].z + 30;
const NODE_X = -40, SLOT_DX = [-27, 0, 27], HOP_X = -100, JUNC_X = 70, NP_X = NODE_X + 50;
const LB = { x: 112, w: 22, d: 196, h: 20 }, TAG_X = 152, CLIENT = { x: 214, z: 0 };
const LBC = { x: -176, z: -128 }, OBJ = { x: -96, z: -128 }, TG = { x: 44, z: -142 };
const NODE_NAMES = ["ip-10-0-1-17", "ip-10-0-2-41", "ip-10-0-3-88"];
const INSTANCES = ["i-0a3f9c1e27b4d5e60", "i-0b7e2d4c19a8f3e51", "i-0c5d8e1f3a7b9c2d4"];
const SUBNETS = ["subnet-0a1f3c5e7b9d2a4c6", "subnet-0b2e4d6f8a1c3e5b7", "subnet-0c3d5f7a9b2e4c6d8"];
const LBNAME = { alb: "k8s-shop-web-4f2a9c1e7b", nlb: "k8s-shop-web-9d3e51a0c2" };
const DNSNAME = { alb: "k8s-shop-web-4f2a9c1e7b-1428305216.us-east-1.elb.amazonaws.com", nlb: "k8s-shop-web-9d3e51a0c2-0c7f9e2b1a4d6e83.elb.us-east-1.amazonaws.com" };
const HASH = ["7c9d4f6b8", "5b8f2a1d7", "6d1e9c3a5", "8a4b7e2f1", "3f6c1d9b2"];
const REPLICAS = 4, HC_T = 6, DEREG_T = 3, START_T = 0.8;

part("plate", { kind: "Load balancing on EKS", title: "From the internet to a pod", noFrame: true, zoom: 1, anchor: V(0, 30, 0),
  desc: "Clients on the right, the load balancer in the public subnets of three Availability Zones, then three nodes running the web pods. At the back: the controller that builds the load balancer from a Kubernetes object, and the target group it fills." });
own("plate", S.plate({ x: 8, z: -18, w: 490, d: 316 }));
AZ.forEach((a) => S.label("plate", a.name, { small: true, anchor: V(NODE_X - 92, 2, a.z), lod: 1.2 }));
S.world.add(S.lines([-35, 35].map((z) => [V(HOP_X - 14, 0.08, z), V(TAG_X + 22, 0.08, z)]), "edgeLo"));
own("plate", track([[[CLIENT.x, 0], [LB.x + LB.w / 2 + 8, 0]], [[LB.x + LB.w / 2 + 8, AZ[0].z], [LB.x + LB.w / 2 + 8, AZ[2].z]], ...AZ.map((a) => [[LB.x - LB.w / 2, a.z], [JUNC_X, a.z]]), [[JUNC_X, AZ[0].z], [JUNC_X, laneZ(2)]], ...AZ.map((_, k) => [[JUNC_X, laneZ(k)], [HOP_X, laneZ(k)]]), [[HOP_X, laneZ(0)], [HOP_X, laneZ(2)]], [[LBC.x, LBC.z], [LB.x, LBC.z]], [[LB.x, LBC.z], [LB.x, -LB.d / 2]]], { width: 4 }));

// ---- clients ----
part("clients", { kind: "Clients", title: "Users on the internet", zoom: 2.4, anchor: V(CLIENT.x, 22, CLIENT.z), desc: () => `Browsers resolving <b>${DNSNAME[st.lb]}</b> and sending requests to whichever load balancer node DNS hands them. Last ${st.results.length} requests: <b>${okCount()} OK, ${st.results.length - okCount()} failed</b>.` });
own("clients", housing({ x: CLIENT.x, z: CLIENT.z, w: 22, d: 44, h: 8 }), box(2, 12, 36, { x: CLIENT.x - 10, y0: 8, z: CLIENT.z, tone: "hi", r: 0.4 }));
const clientLamp = lamp(CLIENT.x + 5, 8, CLIENT.z, { r: 1.5 });
own("clients", clientLamp.mesh);
label("clients", "clients");

// ---- the load balancer: one node per AZ it was placed in ----
part("lb", { kind: "Application Load Balancer", title: () => (st.lb === "alb" ? "ALB " : "NLB ") + LBNAME[st.lb], zoom: 1.8, anchor: V(LB.x, LB.h + 16, 0),
  desc: () => `${st.lb === "alb" ? "Layer 7: it ends HTTP, matches the Ingress rules and forwards to a target group." : "Layer 4: it forwards TCP connections to a target group without reading them, so it suits non-HTTP traffic and keeps a static IP per AZ."} It has a node in each AZ whose public subnet carries the right tag: <b>${st.lbState === "active" ? st.lbAzs.map((i) => AZ[i].name).join(", ") : st.lbState === "failed" ? "none (it couldn't be built)" : "being built"}</b>. Cross-zone load balancing is on here, so any node can pick any healthy target.` });
own("lb", housing({ x: LB.x, z: 0, w: LB.w, d: LB.d, h: LB.h }), cyl(4.2, 1.8, { x: LB.x + LB.w / 2, y0: 10, z: 0, axis: "x" }));
const lbNodes = AZ.map((a) => { const b = box(14, 3, 34, { x: LB.x, y0: LB.h, z: a.z, tone: "hi", r: 0.5 }); const l = lamp(LB.x + 4, LB.h + 3, a.z + 11, { r: 1.2 }); own("lb", b, l.mesh); return { b, l }; });
label("lb", "ALB");

// ---- public subnets and their tags ----
const tagVis = AZ.map((a, i) => {
  const id = part("subnet-" + i, { kind: "Public subnet", title: `${SUBNETS[i]} (${a.name})`, zoom: 2.6, anchor: V(TAG_X, 14, a.z),
    desc: () => `A public subnet in ${a.name}. The controller finds subnets for internet-facing load balancers by the tag <b>kubernetes.io/role/elb=1</b> (internal ones use kubernetes.io/role/internal-elb=1). This one is <b>${st.tags[i] ? "tagged" : "not tagged"}</b>.`,
    actions: () => [{ label: st.tags[i] ? "Remove the elb tag" : "Add the elb tag", danger: st.tags[i], run: () => setTags(st.tags.map((t, j) => (j === i ? !t : t))) }] });
  const tile = box(26, 2, 44, { x: TAG_X, z: a.z, tone: "lo", r: 0.4 });
  const tag = box(10, 4, 8, { x: TAG_X + 4, y0: 2, z: a.z - 12, tone: "hi", r: 0.3 });
  const l = lamp(TAG_X - 6, 2, a.z - 12, { r: 1.2 });
  own(id, tile, tag, l.mesh);
  label(id, "role/elb=1", { small: true });
  return { tag, l };
});

// ---- nodes, NodePorts, pod slots ----
const nodeVis = AZ.map((a, k) => {
  const id = part("node-" + k, { kind: "Node", title: `${NODE_NAMES[k]} (${a.name})`, zoom: 2, anchor: V(NODE_X, TOP + 24, a.z),
    desc: () => `A worker node in ${a.name}, running <b>${livePods().filter((p) => p.node === k).length}</b> web pod(s). ${st.tt === "instance" ? `With target type instance it is itself a target: the load balancer sends requests to its NodePort <b>30080</b>, and kube-proxy forwards each one to any ready web pod in the cluster, on this node or another, and replaces the client's address with this node's.` : "With target type ip the load balancer skips the node and its kube-proxy rules: it sends straight to the pods' VPC addresses."}` });
  own(id, S.tray({ x: NODE_X, z: a.z, w: 96, d: 44, top: TOP }));
  const np = cyl(4.2, 3, { x: NP_X, z: laneZ(k), tone: "hi", seg: 20 });
  const npl = lamp(NP_X, 3, laneZ(k), { r: 1.4 });
  own(id, np, npl.mesh);
  label(id, `node · ${a.name}`);
  const slots = SLOT_DX.map((dx, s) => {
    const sid = part(`slot-${k}-${s}`, { kind: "Pod", dynamic: true, listed: false, zoom: 3, anchor: V(NODE_X + dx, TOP + 18, a.z),
      title: () => { const p = podAt(k, s); return p ? p.name : "empty slot"; },
      desc: () => { const p = podAt(k, s); if (!p) return "No pod here right now."; const t = tg.get(p.name); return `Pod IP <b>${p.ip}</b>, version <b>${p.ver}</b>. ${p.term ? "Terminating." : !p.cReady ? "Starting." : p.ready ? "Ready." : "Containers ready, waiting for its readiness gate."} ${st.tt === "ip" ? `As a target: <b>${t ? t.state : "not registered"}</b>.` : "Not a target itself (target type instance): kube-proxy sends it requests from any node."}${p.gated ? " It has a readiness gate: Kubernetes won't call it Ready until the load balancer reports its target healthy." : ""}`; } });
    const c = crate({ w: 18, h: 11, d: 18, ribs: 3 }); c.position.set(NODE_X + dx, TOP, a.z); c.visible = false;
    const l = lamp(NODE_X + dx + 5, TOP + 11, a.z - 5, { r: 1.1 }); l.mesh.visible = false;
    own(sid, c, l.mesh);
    label(sid, "", { small: true, anchor: V(NODE_X + dx, TOP + 14, a.z), lod: 1.8 });
    return { id: sid, c, l };
  });
  return { np, npl, slots };
});

// ---- controller, the Kubernetes object, the target group ----
part("lbc", { kind: "Controller", title: "aws-load-balancer-controller", zoom: 2.6, anchor: V(LBC.x, 26, LBC.z), desc: "Runs in kube-system with an IAM role (through Pod Identity or IRSA, lesson 24). It watches Ingress objects of class alb and Services of type LoadBalancer, discovers subnets by tag, creates the load balancer, its listeners and target groups, and keeps the targets in step with the nodes or pods. It also injects readiness gates into pods in labelled namespaces." });
const lbcCrate = crate({ w: 26, h: 13, d: 20, ribs: 4 }); lbcCrate.position.set(LBC.x, 0, LBC.z);
const lbcLamp = lamp(LBC.x + 9, 13, LBC.z + 5, { r: 1.2 });
own("lbc", lbcCrate, lbcLamp.mesh);
label("lbc", "LB controller");
part("obj", { kind: "Ingress", title: () => (st.lb === "alb" ? "Ingress web (class alb)" : "Service web (type LoadBalancer)"), zoom: 2.8, anchor: V(OBJ.x, 20, OBJ.z),
  desc: () => (st.lb === "alb" ? "The Ingress the controller turns into an ALB. Its annotations choose the scheme and the target type; the backend Service tells it which pods (or which NodePort) to target." : "A Service of type LoadBalancer with aws-load-balancer-type: external, so the AWS Load Balancer Controller builds an NLB for it. Without that annotation, the legacy cloud provider in Kubernetes would build a Classic Load Balancer with instance targets.") });
own("obj", housing({ x: OBJ.x, z: OBJ.z, w: 28, d: 18, h: 9, plinth: false }));
label("obj", "Ingress web");
part("tg", { kind: "Target group", title: () => `Target group (${st.tt})`, zoom: 2.4, anchor: V(TG.x, 20, TG.z), desc: () => `The load balancer's list of targets, kept by the controller through a TargetGroupBinding. Type <b>${st.tt}</b>: ${st.tt === "instance" ? "the three nodes on NodePort 30080." : "each web pod's IP on port 8080."} New targets start in <b>initial</b> until they pass health checks (about ${HC_T}s here), and removed ones <b>drain</b> for ${DEREG_T}s.` });
own("tg", housing({ x: TG.x, z: TG.z, w: 64, d: 20, h: 6 }));
const tgLamps = Array.from({ length: 6 }, (_, j) => { const l = lamp(TG.x - 25 + j * 10, 6, TG.z, { r: 1.5, state: "off" }); own("tg", l.mesh); return l; });
label("tg", "target group");
part("web", { kind: "Deployment", title: "Deployment web", zoom: 1.3, anchor: V(NODE_X, 30, 0), desc: () => `${REPLICAS} replicas of shop/web:${st.ver}, rolled one at a time (maxSurge 1, maxUnavailable 0). ${st.rolling ? "<b>Rolling out now.</b>" : ""}` });

// ---- the model ----
const st = { lb: "alb", tt: "ip", tags: [true, true, true], gate: false, ver: "v1", verN: 1, rolling: false, settling: false, rollErr: 0, lbState: "active", lbAzs: [0, 1, 2], results: [], clock: 0, seq: 0 };
const pods = [];
const tg = new Map(); // target key → { state: initial | healthy | draining, t }
let msg = "", lbcBlink = 0, last503 = -9;
const livePods = () => pods.filter((p) => !p.term);
const podAt = (k, s) => pods.find((p) => p.node === k && p.slot === s);
const okCount = () => st.results.filter((r) => r.ok).length;
function spawn(ver, k, s) {
  if (k === undefined) { const free = []; for (let n = 0; n < 3; n++) for (let j = 0; j < 3; j++) if (!podAt(n, j)) free.push([n, j, livePods().filter((p) => p.node === n).length]); if (!free.length) return null; free.sort((a, b) => a[2] - b[2] || a[0] - b[0]); [k, s] = free[0]; }
  const p = { name: `web-${HASH[(st.verN - 1) % HASH.length]}-${"abcdefghjkmnpqrstvwxz".split("").sort(() => Math.random() - 0.5).slice(0, 5).join("")}`, ver, node: k, slot: s, ip: `10.0.${k + 1}.${20 + ((st.seq++ * 37) % 200)}`, t: 0, cReady: false, ready: false, gated: st.gate && st.tt === "ip", term: false };
  pods.push(p);
  return p;
}
[[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([k, s]) => { const p = spawn("v1", k, s); p.t = 99; p.cReady = p.ready = true; });
const targetKeys = () => (st.tt === "instance" ? [0, 1, 2].map((k) => "node-" + k) : pods.filter((p) => p.cReady && !p.term).map((p) => p.name));
const targetLabel = (key) => (key.startsWith("node-") ? `${INSTANCES[+key.slice(5)]}:30080` : `${(pods.find((p) => p.name === key) || {}).ip || "?"}:8080`);
const targetAz = (key) => (key.startsWith("node-") ? +key.slice(5) : (pods.find((p) => p.name === key) || {}).node);
// fill the target group now, as if its targets had been healthy for a while
function settle() { tg.clear(); for (const k of targetKeys()) tg.set(k, { state: "healthy", t: 99 }); }
settle();

function stepTargets(dt) {
  if (st.lbState !== "active") return;
  const want = new Set(targetKeys());
  for (const k of want) if (!tg.has(k)) { tg.set(k, { state: "initial", t: 0 }); lbcBlink = 0.5; S.event("Normal", "SuccessfullyReconciled", "targetgroupbinding/" + tgbName(), `Registered target ${targetLabel(k)}`, "targetGroupBinding"); }
  for (const [k, t] of tg) {
    t.t += dt;
    if (!want.has(k) && t.state !== "draining") { t.state = "draining"; t.t = 0; S.event("Normal", "SuccessfullyReconciled", "targetgroupbinding/" + tgbName(), `Deregistered target ${targetLabel(k)}`, "targetGroupBinding"); }
    else if (t.state === "initial" && t.t > HC_T) { t.state = "healthy"; }
    else if (t.state === "draining" && t.t > DEREG_T) tg.delete(k);
  }
}
function stepPods(dt) {
  for (const p of pods) {
    p.t += dt;
    if (!p.cReady && !p.term && p.t > START_T) p.cReady = true;
    if (p.cReady && !p.ready && !p.term) { const t = tg.get(p.name); if (!p.gated || st.tt !== "ip" || (t && t.state === "healthy")) { p.ready = true; if (p.gated) S.event("Normal", "ReadinessGateReady", "pod/" + p.name, "target-health.elbv2.k8s.aws condition True: target is healthy", "targetGroupBinding"); } }
  }
  for (let i = pods.length - 1; i >= 0; i--) if (pods[i].term && pods[i].t > 1.5) pods.splice(i, 1);
}
function stepRollout() {
  if (!st.rolling) return;
  const live = livePods(), fresh = live.filter((p) => p.ver === st.ver), old = live.filter((p) => p.ver !== st.ver);
  if (fresh.some((p) => !p.ready)) return;
  if (!old.length) { st.rolling = false; st.settling = true; S.event("Normal", "RolloutComplete", "deployment/web", `deployment "web" successfully rolled out (${st.ver})`, "deployment-controller"); if ([...tg.values()].some((t) => t.state === "initial")) msg = `Kubernetes says the rollout to ${st.ver} is done, but the load balancer is still health-checking the new targets, and every old one is gone.`; return; }
  if (live.length < REPLICAS + 1) { const p = spawn(st.ver); if (p) S.event("Normal", "SuccessfulCreate", "replicaset/web-" + HASH[(st.verN - 1) % HASH.length], `Created pod: ${p.name}${p.gated ? " (readiness gate injected)" : ""}`, "replicaset-controller"); return; }
  const o = old[0]; o.term = true; o.t = 0; o.ready = false;
  S.event("Normal", "Killing", "pod/" + o.name, "Stopping container web", "kubelet");
}
// after the Deployment finishes, keep counting failures until the load balancer has caught up
function stepSettle() {
  if (!st.settling || [...tg.values()].some((t) => t.state === "initial")) return;
  st.settling = false;
  msg = st.rollErr ? `Rollout to ${st.ver} done, but ${st.rollErr} request(s) failed on the way: Kubernetes removed old pods as soon as new ones were Ready, before the load balancer had finished health-checking them. Turn on readiness gates and roll again.` : `Rollout to ${st.ver} done with no failed requests.${st.tt === "ip" && st.gate ? " Each new pod waited for its target to be healthy before it counted as Ready." : st.tt === "instance" ? " The targets are the nodes, which stayed healthy, and kube-proxy switched pods instantly." : ""}`;
}
function rollout() {
  if (st.rolling || st.settling) return { err: 'error: deployment "web" is already rolling out' };
  st.verN++; st.ver = "v" + st.verN; st.rolling = true; st.rollErr = 0;
  msg = st.tt === "ip" && !st.gate ? `Rolling out ${st.ver} without readiness gates: each new pod is Ready once its container is, so old pods go while the new targets are still in initial. Watch for failed requests.` : st.tt === "ip" ? `Rolling out ${st.ver} with readiness gates: each new pod stays not-Ready until its target passes health checks, so the rollout is slower and never runs out of healthy targets.` : `Rolling out ${st.ver} with instance targets: the targets are the nodes, so the target group doesn't change; kube-proxy moves to the new pods as they become Ready.`;
  return { ok: true };
}

// the controller reconciles: it discovers subnets, then builds or updates the load balancer and target group
let recBusy = false;
function reconcile(kind) {
  lbcBlink = 0.8; recBusy = true;
  if (kind === "create") { st.lbState = "provisioning"; tg.clear(); }
  ctl.add([V(LBC.x, FY, LBC.z), V(LB.x, FY, LBC.z), V(LB.x, FY, -LB.d / 2)], { ring: true, next: () => {
    recBusy = false;
    const wasFailed = st.lbState === "failed";
    const tagged = [0, 1, 2].filter((i) => st.tags[i]);
    const obj = st.lb === "alb" ? "ingress/web" : "service/web";
    let err = "";
    if (!tagged.length) err = "Failed build model due to couldn't auto-discover subnets: unable to resolve at least one subnet (0 match VPC and tags: [kubernetes.io/role/elb])";
    else if (st.lb === "alb" && tagged.length < 2) err = "Failed deploy model due to operation error Elastic Load Balancing v2: " + (kind === "create" ? "CreateLoadBalancer" : "SetSubnets") + ", api error ValidationError: At least two subnets in two different Availability Zones must be specified";
    if (err) {
      S.event("Warning", err.startsWith("Failed build") ? "FailedBuildModel" : "FailedDeployModel", obj, err, st.lb === "alb" ? "ingress" : "service");
      if (st.lbState === "provisioning") { st.lbState = "failed"; msg = `The controller can't build the ${st.lb.toUpperCase()}: ${err}. There is no address, so every request fails. Tag the subnets again.`; }
      else msg = `The controller can't reconcile: ${err}. The existing ${st.lb.toUpperCase()} keeps its old subnets and keeps serving, but nothing about it can change, and a new Ingress or Service would get no load balancer at all.`;
      return;
    }
    if (kind === "create" || wasFailed) settle();
    st.lbAzs = tagged; st.lbState = "active";
    S.event("Normal", "SuccessfullyReconciled", obj, "Successfully reconciled", st.lb === "alb" ? "ingress" : "service");
    if (kind === "subnets") msg = tagged.length === 3 ? "All three subnets are tagged again: the load balancer has a node in every AZ." : `The controller re-read the tags and moved the ${st.lb.toUpperCase()} to ${tagged.map((i) => AZ[i].name).join(" and ")}. (A real controller only notices tag changes on its next reconcile.)`;
  } });
}
function setLb(lb) {
  if (lb === st.lb) return;
  st.lb = lb; st.lbAzs = [];
  msg = lb === "nlb" ? "The app is now exposed by a Service of type LoadBalancer: the controller deletes the ALB and builds an NLB, with a new DNS name. Clients and DNS records pointing at the old name must change." : "Back to an Ingress: the controller deletes the NLB and builds an ALB, with a new DNS name.";
  reconcile("create");
}
function setTT(tt) {
  if (tt === st.tt) return;
  st.tt = tt;
  msg = tt === "instance" ? "Target type instance: the target group now lists the three nodes on NodePort 30080 (the Service becomes NodePort). Each request reaches a node, and kube-proxy forwards it to a ready pod, often on another node. The node in us-east-1c has no web pods, so everything it gets takes a second hop." : "Target type ip: the target group lists the pods' own VPC addresses, so requests go straight to a pod with no kube-proxy hop, and health checks test the pods themselves.";
  // a target group's type can't change, so the controller makes a new one; here it is filled and healthy at once
  settle(); reconcile("tg");
}
function setGate(on) {
  st.gate = on;
  msg = on ? "Namespace shop is labelled elbv2.k8s.aws/pod-readiness-gate-inject=enabled. Pods created from now on get a readiness gate (only for ip targets). Existing pods don't: roll out to replace them." : "Readiness gate injection is off: new pods are Ready as soon as their containers are.";
  if (on && st.tt === "instance") msg += " (Readiness gates only apply to ip targets.)";
}
function setTags(tags) { st.tags = tags; reconcile("subnets"); }

// ---- requests ----
const net = S.packets({ speed: 250, onArrive: (d) => d.next && d.next() });
const ctl = S.packets({ speed: 260, onArrive: (d) => d.next && d.next() });
const P = (x, z, y = FY) => V(x, y, z);
const record = (ok, hop) => { st.results.push({ ok, hop }); if (st.results.length > 40) st.results.shift(); if (!ok && (st.rolling || st.settling)) st.rollErr++; };
function request() {
  const cz = (Math.random() - 0.5) * 30;
  const into = [P(CLIENT.x - 12, cz), P(CLIENT.x - 20, 0)];
  if (st.lbState !== "active") { net.add([...into, P(LB.x + LB.w / 2 + 10, 0)], { bad: true, fade: 14 }); record(false); return; }
  const i = st.lbAzs[Math.floor(Math.random() * st.lbAzs.length)];
  const toLb = [...into, P(LB.x + LB.w / 2 + 8, 0), P(LB.x + LB.w / 2 + 8, AZ[i].z), P(LB.x - LB.w / 2, AZ[i].z), P(JUNC_X, AZ[i].z)];
  const healthy = [...tg].filter(([k, t]) => t.state === "healthy" && k.startsWith("node-") === (st.tt === "instance") && (st.tt === "instance" || pods.some((p) => p.name === k))).map(([k]) => k);
  if (!healthy.length) {
    net.add(toLb.slice(0, 4), { bad: true, fade: 10 }); record(false);
    if (st.clock - last503 > 2) { last503 = st.clock; S.event("Warning", "503", st.lb === "alb" ? "ingress/web" : "service/web", st.lb === "alb" ? "ALB returned 503 Service Temporarily Unavailable: no healthy targets in the target group" : "NLB reset the connection: no healthy targets", "elbv2"); }
    return;
  }
  const key = healthy[Math.floor(Math.random() * healthy.length)];
  if (st.tt === "ip") {
    const p = pods.find((q) => q.name === key);
    const px = NODE_X + SLOT_DX[p.slot];
    net.add([...toLb, P(JUNC_X, laneZ(p.node)), P(px, laneZ(p.node)), P(px, AZ[p.node].z + 9, TOP + 4)], { next: () => { p.hit = 0.25; } });
    record(true, false); return;
  }
  const k = +key.slice(5), ready = livePods().filter((p) => p.ready);
  const viaNode = [...toLb, P(JUNC_X, laneZ(k)), P(NP_X, laneZ(k))];
  if (!ready.length) { net.add(viaNode, { bad: true, fade: 10 }); record(false); return; }
  const p = ready[Math.floor(Math.random() * ready.length)], px = NODE_X + SLOT_DX[p.slot];
  const path = p.node === k ? [...viaNode, P(px, laneZ(k)), P(px, AZ[k].z + 9, TOP + 4)] : [...viaNode, P(HOP_X, laneZ(k)), P(HOP_X, laneZ(p.node)), P(px, laneZ(p.node)), P(px, AZ[p.node].z + 9, TOP + 4)];
  nodeVis[k].hit = 0.3;
  net.add(path, { alt: p.node !== k, next: () => { p.hit = 0.25; } });
  record(true, p.node !== k);
}

let reqT = 0, rollT = 0;
S.onTick((dt) => {
  st.clock += dt; net.step(dt); ctl.step(dt);
  stepPods(dt); stepTargets(dt);
  rollT -= dt; if (rollT <= 0) { rollT = 0.2; stepRollout(); stepSettle(); }
  reqT -= dt; if (reqT <= 0) { reqT = 0.28; request(); }
  lbcBlink = Math.max(0, lbcBlink - dt);
  lbcLamp.set(lbcBlink > 0 ? "accent" : recBusy ? (Math.sin(st.clock * 10) > 0 ? "accent" : "off") : "on");
  const fails = st.results.slice(-8).filter((r) => !r.ok).length;
  clientLamp.set(fails > 2 ? "bad" : "on");
  lbNodes.forEach((n, i) => { const on = st.lbState === "active" && st.lbAzs.includes(i); n.b.visible = on || st.lbState !== "active"; n.l.set(st.lbState === "failed" ? "bad" : st.lbState === "provisioning" ? (Math.sin(st.clock * 8) > 0 ? "accent" : "off") : on ? "good" : "off"); });
  S.setLabel("lb", st.lbState === "failed" ? `${st.lb.toUpperCase()} · not built` : `${st.lb === "alb" ? "ALB · HTTP:80" : "NLB · TCP:80"}${st.lbState === "provisioning" ? " · provisioning" : ""}`, { bad: st.lbState === "failed" });
  S.setLabel("obj", st.lb === "alb" ? "Ingress web" : "Service web (LoadBalancer)");
  S.PARTS.lb.kind = st.lb === "alb" ? "Application Load Balancer" : "Network Load Balancer"; S.PARTS.obj.kind = st.lb === "alb" ? "Ingress" : "Service";
  tagVis.forEach((v, i) => { v.tag.visible = st.tags[i]; v.l.set(st.tags[i] ? "good" : "off"); S.setLabel("subnet-" + i, st.tags[i] ? "role/elb=1" : "no tag", { bad: !st.tags[i] }); });
  nodeVis.forEach((v, k) => {
    v.hit = Math.max(0, (v.hit || 0) - dt);
    const t = tg.get("node-" + k);
    v.np.visible = v.npl.mesh.visible = st.tt === "instance";
    v.npl.set(v.hit > 0 ? "accent" : t && t.state === "healthy" ? "good" : t ? "on" : "off");
    v.slots.forEach((sv, s) => {
      const p = podAt(k, s);
      sv.c.visible = sv.l.mesh.visible = !!p;
      if (!p) { S.setLabel(sv.id, "", { show: false }); return; }
      p.hit = Math.max(0, (p.hit || 0) - dt);
      const pt = tg.get(p.name);
      sv.l.set(p.hit > 0 ? "accent" : p.term ? "bad" : !p.cReady ? "off" : st.tt === "ip" ? (pt && pt.state === "healthy" ? "good" : pt && pt.state === "draining" ? "bad" : Math.sin(st.clock * 6) > 0 ? "on" : "off") : p.ready ? "good" : "on");
      sv.c.position.y = TOP + (p.term ? -2 : !p.cReady ? -1 : 0);
      S.setLabel(sv.id, `${p.ver} · ${p.term ? "terminating" : !p.cReady ? "starting" : p.ready ? (st.tt === "ip" ? (pt ? pt.state : "ready") : "ready") : "gate: waiting"}`, { show: true, bad: p.term });
    });
  });
  const keys = [...tg.keys()];
  tgLamps.forEach((l, j) => { const t = tg.get(keys[j]); l.set(!t ? "off" : t.state === "healthy" ? "good" : t.state === "draining" ? "bad" : Math.sin(st.clock * 6) > 0 ? "accent" : "on"); });
  S.setLabel("tg", `target group · ${st.tt} · ${keys.filter((k) => tg.get(k).state === "healthy").length}/${keys.length} healthy`);
  const n = st.results.length, hops = st.results.filter((r) => r.hop).length;
  S.say(`${st.lb.toUpperCase()} · ${st.tt} targets · ${okCount()}/${n} OK · ${hops} hopped nodes${st.rolling ? " · rolling out " + st.ver : ""}`);
  syncUi();
});

// ---- controls ----
S.overview = () => `<h2>Which way do requests go?</h2><p class="muted">Switch the target type and follow the dots: blue ones took an extra hop from one node to another. Then roll out a new version with and without readiness gates. Pick a part:</p>`;
const ui = { status: document.getElementById("lb-status"), lb: [...document.querySelectorAll("[data-lb]")], tt: [...document.querySelectorAll("[data-tt]")], gate: document.getElementById("lb-gate"), untag: document.getElementById("lb-untag"), untagall: document.getElementById("lb-untagall") };
const echo = (c) => S.shellEcho?.(c, "button");
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "lb") { echo(b.dataset.lb === "nlb" ? "kubectl delete ingress web && kubectl apply -f web-nlb-service.yaml" : "kubectl apply -f web-ingress.yaml && kubectl patch service web -p '{\"spec\":{\"type\":\"ClusterIP\"}}'"); setLb(b.dataset.lb); }
  if (a === "tt") { echo(st.lb === "alb" ? `kubectl annotate ingress web alb.ingress.kubernetes.io/target-type=${b.dataset.tt} --overwrite` : `kubectl annotate service web service.beta.kubernetes.io/aws-load-balancer-nlb-target-type=${b.dataset.tt} --overwrite`); setTT(b.dataset.tt); }
  if (a === "gate") { echo(st.gate ? "kubectl label namespace shop elbv2.k8s.aws/pod-readiness-gate-inject-" : "kubectl label namespace shop elbv2.k8s.aws/pod-readiness-gate-inject=enabled"); setGate(!st.gate); }
  if (a === "roll") { echo("kubectl rollout restart deployment web"); const r = rollout(); if (r.err) msg = r.err; }
  if (a === "untag") { echo(`aws ec2 ${st.tags[2] ? "delete-tags" : "create-tags"} --resources ${SUBNETS[2]} --tags Key=kubernetes.io/role/elb${st.tags[2] ? "" : ",Value=1"}`); setTags([st.tags[0], st.tags[1], !st.tags[2]]); }
  if (a === "untagall") { const any = st.tags.some(Boolean); echo(`aws ec2 ${any ? "delete-tags" : "create-tags"} --resources ${SUBNETS.join(" ")} --tags Key=kubernetes.io/role/elb${any ? "" : ",Value=1"}`); setTags([!any, !any, !any]); }
  S.renderPanel();
}));
function syncUi() {
  const set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  ui.lb.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lb === st.lb)));
  ui.tt.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tt === st.tt)));
  ui.gate.setAttribute("aria-pressed", String(st.gate));
  set(ui.untag, st.tags[2] ? "Untag us-east-1c's subnet" : "Tag us-east-1c's subnet again");
  set(ui.untagall, st.tags.some(Boolean) ? "Untag every subnet" : "Tag every subnet again");
  set(ui.status, msg || "An ALB with target type ip sends requests straight to the four web pods. Two run in us-east-1a, two in us-east-1b, none in us-east-1c.");
  ui.status.dataset.tone = /can't|fail|Failed|503/.test(msg) && !/no failed/.test(msg) ? "bad" : /no failed requests/.test(msg) ? "good" : "";
}

// ---- what the inspector shows ----
const tgbName = () => `k8s-shop-web-${st.tt === "ip" ? "8c41e0d27f" : "2b9f7a3c16"}`;
const ingY = () => `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
  namespace: shop
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing   # ← subnets tagged kubernetes.io/role/elb=1
    alb.ingress.kubernetes.io/target-type: ${st.tt}   # ← ${st.tt === "ip" ? "pod IPs as targets" : "nodes on the Service's NodePort as targets"}
    alb.ingress.kubernetes.io/healthcheck-path: /healthz
spec:
  ingressClassName: alb   # ← handled by the AWS Load Balancer Controller
  rules:
  - http:
      paths:
      - { path: /, pathType: Prefix, backend: { service: { name: web, port: { number: 80 } } } }
status:
  loadBalancer:
    ingress: [${st.lbState === "active" ? `{ hostname: ${DNSNAME.alb} }` : ""}]`;
const svcY = () => st.lb === "alb" ? `apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: shop
spec:
  type: ${st.tt === "instance" ? "NodePort   # ← instance targets need a NodePort on every node" : "ClusterIP   # ← ip targets only use it to find the pods"}
  selector: { app: web }
  ports: [{ port: 80, targetPort: 8080${st.tt === "instance" ? ", nodePort: 30080" : ""} }]` : `apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: shop
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: external   # ← the AWS Load Balancer Controller builds an NLB (without it: a Classic LB from the legacy provider)
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: ${st.tt}   # ← ${st.tt === "ip" ? "pod IPs as targets" : "nodes on the NodePort as targets"}
    service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
spec:
  type: LoadBalancer
  selector: { app: web }
  ports: [{ port: 80, targetPort: 8080, nodePort: 30080 }]
status:
  loadBalancer:
    ingress: [${st.lbState === "active" ? `{ hostname: ${DNSNAME.nlb} }` : ""}]`;
const nsY = () => `apiVersion: v1
kind: Namespace
metadata:
  name: shop
  labels:
    kubernetes.io/metadata.name: shop
${st.gate ? "    elbv2.k8s.aws/pod-readiness-gate-inject: enabled   # ← new pods get a readiness gate per ip target group\n" : "    # add elbv2.k8s.aws/pod-readiness-gate-inject: enabled for readiness gates\n"}`;
const tgbY = () => `apiVersion: elbv2.k8s.aws/v1beta1
kind: TargetGroupBinding
metadata:
  name: ${tgbName()}
  namespace: shop
spec:
  serviceRef: { name: web, port: 80 }
  targetGroupARN: arn:aws:elasticloadbalancing:us-east-1:111122223333:targetgroup/${tgbName()}/6e1c0a9f3b2d7e45
  targetType: ${st.tt}   # ← fixed when the target group is made: changing it means a new target group
---
# aws elbv2 describe-target-health (now)
${[...tg].map(([k, t]) => `# ${targetLabel(k).padEnd(28)}${AZ[targetAz(k)].name.padEnd(12)}${t.state}`).join("\n") || "# no targets"}`;
const deployY = () => `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: shop
spec:
  replicas: ${REPLICAS}
  strategy: { type: RollingUpdate, rollingUpdate: { maxSurge: 1, maxUnavailable: 0 } }
  selector: { matchLabels: { app: web } }
  template:
    metadata: { labels: { app: web } }
    spec:
      containers:
      - name: web
        image: shop/web:${st.ver}   # ← change it to roll out
        ports: [{ containerPort: 8080 }]
        readinessProbe: { httpGet: { path: /healthz, port: 8080 } }   # ← Kubernetes's idea of ready, not the load balancer's
status:
  replicas: ${livePods().length}
  updatedReplicas: ${livePods().filter((p) => p.ver === st.ver).length}
  readyReplicas: ${livePods().filter((p) => p.ready).length}
  availableReplicas: ${livePods().filter((p) => p.ready).length}`;
const podY = (p) => `apiVersion: v1
kind: Pod
metadata:
  name: ${p.name}
  namespace: shop
  labels: { app: web }
spec:
  nodeName: ${NODE_NAMES[p.node]}.ec2.internal
  containers: [{ name: web, image: shop/web:${p.ver} }]
${p.gated ? `  readinessGates:   # ← injected by the controller's webhook
  - conditionType: target-health.elbv2.k8s.aws/${tgbName()}
` : ""}status:
  podIP: ${p.ip}
  conditions:
  - { type: ContainersReady, status: "${p.cReady ? "True" : "False"}" }
${p.gated ? `  - { type: target-health.elbv2.k8s.aws/${tgbName()}, status: "${tg.get(p.name)?.state === "healthy" ? "True" : "False"}" }   # ← set by the controller from the target's health\n` : ""}  - { type: Ready, status: "${p.ready ? "True" : "False"}" }`;
const TT = { check: (v) => (v === "instance" || v === "ip" ? "" : 'must be "instance" or "ip"'), set: (v) => setTT(v) };
const GATE = { optional: true, check: (v) => (v === undefined || v === "enabled" ? "" : 'use "enabled", or remove the label'), set: (v) => setGate(v === "enabled") };
Object.assign(S.PARTS.obj, {
  manifest: () => (st.lb === "alb" ? ingY() + "\n---\n" + svcY() : svcY()) + "\n---\n" + nsY(),
  fields: (kind) => (kind === "Ingress" ? { "metadata.annotations.alb.ingress.kubernetes.io/target-type": TT } : kind === "Service" ? (st.lb === "nlb" ? { "metadata.annotations.service.beta.kubernetes.io/aws-load-balancer-nlb-target-type": TT } : {}) : kind === "Namespace" ? { "metadata.labels.elbv2.k8s.aws/pod-readiness-gate-inject": GATE } : null),
});
Object.assign(S.PARTS.tg, { manifest: tgbY });
Object.assign(S.PARTS.web, { manifest: deployY, fields: { "spec.template.spec.containers[0].image": { check: (v) => (!/^shop\/web:\S+$/.test(String(v)) ? "use shop/web:<tag>" : st.rolling ? "a rollout is already in progress" : ""), set: (v) => { if (String(v) !== "shop/web:" + st.ver) rollout(); } } } });
Object.assign(S.PARTS.lb, { manifest: () => `# aws elbv2 describe-load-balancers --names ${LBNAME[st.lb]}
LoadBalancers:
- LoadBalancerName: ${LBNAME[st.lb]}
  DNSName: ${DNSNAME[st.lb]}
  Type: ${st.lb === "alb" ? "application   # ← HTTP/HTTPS, rules by host and path" : "network   # ← TCP/UDP/TLS, a static IP per AZ"}
  Scheme: internet-facing
  State: { Code: ${st.lbState === "active" ? "active" : st.lbState === "provisioning" ? "provisioning" : "failed"} }
  AvailabilityZones:   # ← one node per tagged public subnet
${st.lbAzs.map((i) => `  - { ZoneName: ${AZ[i].name}, SubnetId: ${SUBNETS[i]} }`).join("\n") || "  []"}
Listeners:
- { Port: 80, Protocol: ${st.lb === "alb" ? "HTTP" : "TCP"}, DefaultActions: [{ Type: forward, TargetGroupArn: …/${tgbName()} }] }` });
AZ.forEach((a, i) => Object.assign(S.PARTS["subnet-" + i], { manifest: () => `# aws ec2 describe-subnets --subnet-ids ${SUBNETS[i]}
Subnets:
- SubnetId: ${SUBNETS[i]}
  AvailabilityZone: ${a.name}
  CidrBlock: 10.0.${101 + i}.0/24
  MapPublicIpOnLaunch: true
  Tags:
  - { Key: Name, Value: shop-public-${a.name.slice(-2)} }
${st.tags[i] ? "  - { Key: kubernetes.io/role/elb, Value: \"1\" }   # ← how the controller finds it" : "  # no kubernetes.io/role/elb tag: the controller won't use this subnet"}` }));
AZ.forEach((a, k) => Object.assign(S.PARTS["node-" + k], { manifest: () => (st.tt === "instance" ? `# iptables -t nat -S | grep 30080   (kube-proxy's rules on ${NODE_NAMES[k]})
-A KUBE-NODEPORTS -p tcp --dport 30080 -j KUBE-EXT-WEB
-A KUBE-EXT-WEB -j KUBE-MARK-MASQ   # ← SNAT: the pod sees this node's IP, not the client's
-A KUBE-EXT-WEB -j KUBE-SVC-WEB
${livePods().filter((p) => p.ready).map((p, j, all) => `-A KUBE-SVC-WEB${j < all.length - 1 ? ` -m statistic --mode random --probability ${(1 / (all.length - j)).toFixed(5)}` : ""} -j KUBE-SEP-${p.ip.replace(/\./g, "")}   # ${p.ip} on ${NODE_NAMES[p.node]}${p.node === k ? " (this node)" : " (another node)"}`).join("\n")}` : `# target type ip: the load balancer sends to pod IPs directly,
# so nothing on ${NODE_NAMES[k]} forwards web traffic. Pods here:
${livePods().filter((p) => p.node === k).map((p) => `# ${p.name}  ${p.ip}`).join("\n") || "# (none)"}`) }));
for (let k = 0; k < 3; k++) for (let s = 0; s < 3; s++) Object.assign(S.PARTS[`slot-${k}-${s}`], { manifest: () => { const p = podAt(k, s); return p ? podY(p) : ""; } });
Object.assign(S.PARTS.lbc, { manifest: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: aws-load-balancer-controller
  namespace: kube-system
spec:
  replicas: 2
  template:
    spec:
      serviceAccountName: aws-load-balancer-controller   # ← its IAM role comes from Pod Identity or IRSA
      containers:
      - name: controller
        image: public.ecr.aws/eks/aws-load-balancer-controller:v2.9.2
        args: [--cluster-name=shop, --ingress-class=alb, --enable-service-mutator-webhook=false]` });

// ---- kubectl and the YAML editor ----
const podRow = (p) => ({ kind: "Pod", name: p.name, part: `slot-${p.node}-${p.slot}`, manifest: () => podY(p), labels: { app: "web" }, row: { READY: p.ready ? "1/1" : "0/1", STATUS: p.term ? "Terminating" : p.cReady ? "Running" : "ContainerCreating", RESTARTS: 0 }, wide: { IP: p.ip, NODE: NODE_NAMES[p.node] + ".ec2.internal", "READINESS GATES": p.gated ? `${tg.get(p.name)?.state === "healthy" ? 1 : 0}/1` : "<none>" },
  describe: () => [["IP:", p.ip], ["Node:", NODE_NAMES[p.node]], ...(p.gated ? [["Readiness Gates:"], ["  Type", "Status"], [`  target-health.elbv2.k8s.aws/${tgbName()}`, tg.get(p.name)?.state === "healthy" ? "True" : "False"]] : []), ["Conditions:"], ["  ContainersReady", p.cReady ? "True" : "False"], ["  Ready", p.ready ? "True" : "False"]] });
S.kube({
  ns: "shop",
  help: ["kubectl get ingress,svc,targetgroupbindings   ·   kubectl get pods -o wide   (see READINESS GATES)", "kubectl annotate ingress web alb.ingress.kubernetes.io/target-type=instance --overwrite   (or =ip)", "kubectl label namespace shop elbv2.k8s.aws/pod-readiness-gate-inject=enabled   ·   kubectl rollout restart deployment web", "aws elbv2 describe-load-balancers   ·   aws elbv2 describe-target-health --target-group-arn web", "aws ec2 describe-subnets   ·   aws ec2 delete-tags --resources <subnet> --tags Key=kubernetes.io/role/elb   (create-tags to add it back)", "kubectl describe ingress web   (the controller's events)   ·   kubectl edit deployment web"],
  examples: ["kubectl get ingress,svc", "aws elbv2 describe-target-health --target-group-arn web", "kubectl annotate ingress web alb.ingress.kubernetes.io/target-type=instance --overwrite", "kubectl get pods -o wide", "kubectl rollout restart deployment web", "kubectl label namespace shop elbv2.k8s.aws/pod-readiness-gate-inject=enabled", "aws ec2 describe-subnets", `aws ec2 delete-tags --resources ${SUBNETS[2]} --tags Key=kubernetes.io/role/elb`, "kubectl describe ingress web"],
  objects: () => [
    ...pods.map(podRow),
    ...AZ.map((a, k) => ({ kind: "Node", name: NODE_NAMES[k] + ".ec2.internal", part: "node-" + k, labels: { "topology.kubernetes.io/zone": a.name }, row: { STATUS: "Ready", ROLES: "<none>", VERSION: "v1.32.0-eks-5e2a7c1" }, wide: { "INTERNAL-IP": `10.0.${k + 1}.${[17, 41, 88][k]}`, ZONE: a.name } })),
    ...(st.lb === "alb" ? [{ kind: "Ingress", name: "web", part: "obj", manifest: ingY, labels: {}, row: { CLASS: "alb", HOSTS: "*", ADDRESS: st.lbState === "active" ? DNSNAME.alb : "", PORTS: "80" } }] : []),
    { kind: "Service", name: "web", part: "obj", manifest: svcY, labels: {}, row: { TYPE: st.lb === "nlb" ? "LoadBalancer" : st.tt === "instance" ? "NodePort" : "ClusterIP", "CLUSTER-IP": "172.20.88.14", "EXTERNAL-IP": st.lb === "nlb" ? (st.lbState === "active" ? DNSNAME.nlb : "<pending>") : "<none>", "PORT(S)": st.lb === "nlb" || st.tt === "instance" ? "80:30080/TCP" : "80/TCP" } },
    { kind: "Namespace", name: "shop", part: "obj", manifest: nsY, labels: { "kubernetes.io/metadata.name": "shop", ...(st.gate ? { "elbv2.k8s.aws/pod-readiness-gate-inject": "enabled" } : {}) }, row: { STATUS: "Active" } },
  ],
  verbs: {
    rollout({ pos }) {
      const [sub, a, b] = pos, target = a && a.includes("/") ? a.split("/")[1] : b;
      if (!/^deploy/.test(a || "") || target !== "web") return { err: 'error: this lesson rolls out deployment web: kubectl rollout restart deployment web' };
      if (sub === "restart") { S.stopTour(); const r = rollout(); return r.err ? r : ["deployment.apps/web restarted"]; }
      if (sub === "status") { const live = livePods(), upd = live.filter((p) => p.ver === st.ver && p.ready).length; return st.rolling ? [`Waiting for deployment "web" rollout to finish: ${upd} of ${REPLICAS} updated replicas are available...`] : [`deployment "web" successfully rolled out`]; }
      return { err: "error: try kubectl rollout restart deployment web, or kubectl rollout status deployment web" };
    },
    annotate({ pos, f }) {
      let [what, name, ...rest] = pos;
      if (what && what.includes("/")) { rest = [name, ...rest].filter(Boolean); [what, name] = what.split("/"); }
      const pair = rest.find((x) => x.includes("=")) || "";
      const [k, v] = pair.split("=");
      const want = /^ing/.test(what || "") ? "alb.ingress.kubernetes.io/target-type" : /^(svc|service)/.test(what || "") ? "service.beta.kubernetes.io/aws-load-balancer-nlb-target-type" : null;
      if (!want || name !== "web") return { err: "error: this lesson can annotate ingress web or service web" };
      if (/^ing/.test(what) && st.lb !== "alb") return { err: 'Error from server (NotFound): ingresses.networking.k8s.io "web" not found   # the app uses an NLB Service right now' };
      if (/^(svc|service)/.test(what) && st.lb !== "nlb") return { err: "# service web is the ALB's backend here; its target type comes from the Ingress: annotate ingress web" };
      if (k !== want) return { err: `# this lesson models ${want} on ${what}/web` };
      if (v !== "instance" && v !== "ip") return { err: `The ${/^ing/.test(what) ? "Ingress" : "Service"} "web" is invalid: ${want}: must be "instance" or "ip"` };
      if (v !== st.tt && !f["--overwrite"]) return { err: `error: --overwrite is false but found the following declared annotation(s): '${want}' already has a value (${st.tt})` };
      S.stopTour(); setTT(v);
      return [`${/^ing/.test(what) ? "ingress.networking.k8s.io" : "service"}/web annotated`];
    },
  },
  tools: {
    aws({ pos, f }) {
      const [svc, op] = pos;
      if (svc === "elbv2" && op === "describe-load-balancers") return st.lbState === "failed" ? { err: `An error occurred (LoadBalancerNotFound) when calling the DescribeLoadBalancers operation: Load balancers '[${LBNAME[st.lb]}]' not found` } : { yaml: S.PARTS.lb.manifest() };
      if (svc === "elbv2" && op === "describe-target-groups") return ["TargetGroupName             TargetType   Protocol   Port", `${tgbName().padEnd(28)}${st.tt.padEnd(13)}${(st.lb === "alb" ? "HTTP" : "TCP").padEnd(11)}${st.tt === "ip" ? 8080 : 30080}`];
      if (svc === "elbv2" && op === "describe-target-health") { if (!f["--target-group-arn"]) return { err: "aws: error: the following arguments are required: --target-group-arn" }; const list = [...tg]; return ["TARGET                         AZ           STATE      REASON", ...list.map(([k, t]) => `${targetLabel(k).padEnd(31)}${AZ[targetAz(k)].name.padEnd(13)}${t.state.padEnd(11)}${t.state === "initial" ? "Elb.RegistrationInProgress" : t.state === "draining" ? "Target.DeregistrationInProgress" : ""}`), ...(list.length ? [] : ["(no targets)"])]; }
      if (svc === "ec2" && op === "describe-subnets") return ["SubnetId                   AZ           CIDR             kubernetes.io/role/elb", ...SUBNETS.map((s, i) => `${s.padEnd(27)}${AZ[i].name.padEnd(13)}${`10.0.${101 + i}.0/24`.padEnd(17)}${st.tags[i] ? "1" : "(none)"}`)];
      if (svc === "ec2" && (op === "create-tags" || op === "delete-tags")) {
        const ids = pos.filter((x) => /^subnet-/.test(x)), idx = ids.map((x) => SUBNETS.indexOf(x));
        if (!ids.length) return { err: "aws: error: the following arguments are required: --resources (a subnet id; see aws ec2 describe-subnets)" };
        if (idx.includes(-1)) return { err: `An error occurred (InvalidSubnetID.NotFound) when calling the ${op === "create-tags" ? "CreateTags" : "DeleteTags"} operation: The subnet ID '${ids[idx.indexOf(-1)]}' does not exist` };
        if (!pos.some((x) => /kubernetes\.io\/role\/elb/.test(x))) return { err: "# this lesson models the tag Key=kubernetes.io/role/elb" };
        S.stopTour(); setTags(st.tags.map((t, i) => (idx.includes(i) ? op === "create-tags" : t)));
        return ["# (no output on success)   the controller picks the change up on its next reconcile"];
      }
      return { err: "this lesson simulates aws elbv2 describe-load-balancers | describe-target-groups | describe-target-health, aws ec2 describe-subnets | create-tags | delete-tags" };
    },
  },
});
// ---- end kubectl ----

const waitRoll = () => !st.rolling && !st.settling;
S.setTour([
  { home: true, say: "Four web pods: two in us-east-1a, two in us-east-1b, none in us-east-1c. In front, an ALB built by the AWS Load Balancer Controller from an Ingress.", hold: 6 },
  { focus: "lbc", zoom: 2, say: "The controller reads the Ingress, finds public subnets tagged kubernetes.io/role/elb=1, and builds the ALB, its listener and a target group.", hold: 7 },
  { home: true, say: "Target type instance: the targets are the nodes. A request lands on any node's NodePort, then kube-proxy picks a pod, often on another node or in another AZ (the blue dots).", run: () => setTT("instance"), hold: 10 },
  { home: true, say: "Target type ip: the VPC CNI gives pods VPC addresses, so the load balancer sends straight to them. One hop, and health checks test the pods themselves.", run: () => setTT("ip"), hold: 9 },
  { home: true, say: "Roll out a new version without readiness gates. Pods are Ready to Kubernetes before the ALB has health-checked them, so the old ones leave too early: red dots are failed requests.", run: () => { setGate(false); rollout(); }, until: waitRoll, hold: 10 },
  { home: true, say: "Now label the namespace for readiness gates and roll again. Each new pod waits until its target is healthy before it counts as Ready. Slower, and no failures.", run: () => { setGate(true); rollout(); }, until: waitRoll, hold: 10 },
  { focus: "subnet-2", zoom: 2.2, say: "Untag us-east-1c's subnet: the controller moves the ALB to the two tagged AZs. An ALB needs at least two.", run: () => setTags([true, true, false]), hold: 7 },
  { focus: "lbc", zoom: 2, say: "Untag them all and the controller can't reconcile: 'couldn't auto-discover subnets'. The existing ALB stays as it was.", run: () => setTags([false, false, false]), hold: 7 },
  { home: true, say: "Tag them again, then expose the app with a Service of type LoadBalancer instead: the controller builds a layer-4 NLB, with the same target types.", run: () => { setTags([true, true, true]); setTimeout(() => setLb("nlb"), 1200); }, hold: 9 },
  { home: true, say: "Prefer ip targets, use readiness gates, and tag your subnets. Back to the ALB.", run: () => setLb("alb"), hold: 6 },
]);
S.start();
