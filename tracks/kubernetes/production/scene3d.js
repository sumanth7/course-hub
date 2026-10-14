// Lesson 17 in 3D: one request path in production. Users → DNS → CDN edge (WAF, cache) → ALB across three
// Availability Zones → pods by IP (AWS Load Balancer Controller, VPC CNI) → autoscaling and failures.
const S = createStage({ home: { target: [10, 10, -4], dir: [0.9, 1.15, 1.15], zoom: 1 }, viewH: 300, minW: 560, phoneMinW: 420 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const FY = 1.9, TOP = 11;
const AZ = [{ name: "us-east-1a", z: -82, subnet: 1 }, { name: "us-east-1b", z: 0, subnet: 2 }, { name: "us-east-1c", z: 82, subnet: 3 }];
const NODE_X = -46, SLOT_DX = [-34, 0, 34], SLOT_DZ = [-12, 12];
const laneZ = (a) => AZ[a].z + 34;
const NODE_NAMES = ["ip-10-0-1-17.ec2.internal", "ip-10-0-2-41.ec2.internal", "ip-10-0-3-88.ec2.internal"];
const REGION = { x0: -252, x1: 128, z0: -138, z1: 128 };
const ALB = { x: 98, z: 0, w: 20, d: 176, h: 22 };
const EDGE = { x: 176, z: 0, w: 34, d: 96, h: 26 };
const S3B = { x: 152, z: -118, w: 34, d: 24, h: 13 };
const DNS = { x: 262, z: -112, w: 34, d: 22, h: 13 };
const USERS = [-34, 14, 62].map((z) => ({ x: 268, z }));
const ATTACKER = { x: 268, z: 110 };
const CP = { x: -196, z: 0, w: 36, d: 84, h: 24 };
const LBC = { x: -196, z: -104 };
const ING = { x: 98, z: -116, w: 24, d: 16, h: 10 };
const HPA = { x: -150, z: 104 };
const ASSETS = ["/static/app.js", "/static/app.css", "/static/logo.png", "/static/font.woff2"];

// ---- the floor: one plate, the region and VPC drawn on it, three AZ lanes ----
part("plate", { kind: "Production", title: "shop.example.com in production", noFrame: true, zoom: 1, anchor: V(10, 30, -4),
  desc: "A user's request crosses the internet to the nearest CDN edge, which answers from its cache or forwards to an origin: an S3 bucket for static files, or the ALB in front of the Kubernetes cluster. The ALB spreads requests over pods in three Availability Zones." });
own("plate", S.plate({ x: 22, z: -5, w: 570, d: 300 }));
S.world.add(S.rect(REGION.x0, REGION.z0, REGION.x1, REGION.z1, 0.08, "edgeMid"));
S.world.add(S.lines([[V(REGION.x0, 0.08, -41), V(REGION.x1 - 52, 0.08, -41)], [V(REGION.x0, 0.08, 41), V(REGION.x1 - 52, 0.08, 41)]], "edgeLo"));
label("plate", "AWS us-east-1 · VPC 10.0.0.0/16", { anchor: V(REGION.x0 + 70, 2, REGION.z0 + 8) });
AZ.forEach((a, i) => S.label("plate", a.name, { small: true, anchor: V(NODE_X - 78, 2, a.z), lod: 1.2 }));
S.label("plate", "internet", { small: true, anchor: V(240, 2, REGION.z0 + 8), lod: 1.2 });
// tracks: users → edge, edge → ALB, ALB → the three AZ lanes
own("plate", track([[[250, -34], [250, 62]], [[250, 14], [EDGE.x + EDGE.w / 2, 14]], [[EDGE.x - EDGE.w / 2, 0], [ALB.x + ALB.w / 2, 0]], [[EDGE.x, -EDGE.d / 2], [EDGE.x, S3B.z]], [[EDGE.x, S3B.z], [S3B.x + S3B.w / 2, S3B.z]], [[ALB.x - ALB.w / 2, 0], [70, 0]], [[70, laneZ(0)], [70, laneZ(2)]], ...AZ.map((_, a) => [[70, laneZ(a)], [NODE_X - 40, laneZ(a)]])], { width: 4.6 }));

// ---- users, DNS, an attacker ----
part("users", { kind: "Clients", title: "Users", zoom: 2, anchor: V(268, 24, 14), desc: () => `Browsers and apps asking for https://shop.example.com. Each one looks the name up in DNS first, then talks TLS to the nearest CDN edge. Load now: <b>${M.load} requests/s</b>.` });
const userLamps = USERS.map((u) => { own("users", housing({ x: u.x, z: u.z, w: 20, d: 16, h: 6 }), box(2, 11, 14, { x: u.x - 9, y0: 6, z: u.z, tone: "hi", r: 0.4 })); const l = lamp(u.x + 5, 6, u.z, { r: 1.4 }); own("users", l.mesh); return l; });
label("users", "users");
part("attacker", { kind: "Client", title: "An attacker", zoom: 2.4, anchor: V(ATTACKER.x, 22, ATTACKER.z), desc: "Sends SQL-injection probes and floods of requests. The WAF at the edge blocks them before they reach the cache or the origin.", actions: () => [{ label: "Send an attack", danger: true, run: attack }] });
own("attacker", housing({ x: ATTACKER.x, z: ATTACKER.z, w: 20, d: 16, h: 6 }), box(2, 11, 14, { x: ATTACKER.x - 9, y0: 6, z: ATTACKER.z, tone: "hi", r: 0.4 }));
const attackLamp = lamp(ATTACKER.x + 5, 6, ATTACKER.z, { r: 1.4, state: "off" });
own("attacker", attackLamp.mesh);
label("attacker", "attacker");
part("dns", { kind: "DNS", title: "Route 53", zoom: 2.6, anchor: V(DNS.x, DNS.h + 14, DNS.z), desc: () => `The authoritative DNS for example.com. shop.example.com is a CNAME to the CDN (<b>${cdnHost()}</b>), so users land on an edge server near them, never on the ALB directly. Answers are cached for the record's TTL.` });
own("dns", housing({ x: DNS.x, z: DNS.z, w: DNS.w, d: DNS.d, h: DNS.h }));
const dnsLamp = lamp(DNS.x + 10, DNS.h, DNS.z, { r: 1.3, state: "off" });
own("dns", dnsLamp.mesh);
label("dns", "Route 53 · DNS");

// ---- the CDN edge: TLS port, WAF turnstile, cache drawers ----
part("edge", { kind: "CDN edge", title: () => (M.provider === "cloudfront" ? "CloudFront edge (IAD89)" : "Akamai edge server"), zoom: 2.2, anchor: V(EDGE.x, EDGE.h + 16, EDGE.z),
  desc: () => `Ends the user's TLS with the shop.example.com certificate, runs the WAF, then follows the cache behaviors: <b>/static/*</b> is cached for ${M.ttl}s and fetched from S3 on a miss; <b>/api/*</b> and pages are never cached and go to the ALB over a new TLS connection. Hit ratio now: <b>${hitRatio()}%</b>.`,
  actions: () => [{ label: "Invalidate /static/*", run: invalidate }, { label: M.provider === "cloudfront" ? "Switch to Akamai" : "Switch to CloudFront", run: () => setProvider(M.provider === "cloudfront" ? "akamai" : "cloudfront") }] });
own("edge", housing({ x: EDGE.x, z: EDGE.z, w: EDGE.w, d: EDGE.d, h: EDGE.h }), cyl(4.2, 1.8, { x: EDGE.x + EDGE.w / 2, y0: 12, z: 14, axis: "x" }));
const drawers = ASSETS.map((a, k) => { const z = -33 + k * 22; const d = box(22, 4, 14, { x: EDGE.x - 2, y0: EDGE.h, z, tone: "hi", r: 0.4 }); const l = lamp(EDGE.x + 11, EDGE.h + 4, z, { r: 1.2, state: "off" }); own("edge", d, l.mesh); S.label("edge", a.replace("/static/", ""), { small: true, anchor: V(EDGE.x - 2, EDGE.h + 6, z), lod: 2 }); return l; });
label("edge", "CloudFront edge · cache");
part("waf", { kind: "WAF", title: () => (M.provider === "cloudfront" ? "AWS WAF web ACL" : "Akamai App & API Protector"), zoom: 3, anchor: V(EDGE.x + EDGE.w / 2 + 8, 26, 34),
  desc: () => `Checks every request at the edge before the cache: managed rules for SQL injection and XSS, and a rate limit per client IP. Blocked requests get a 403 from the edge and never reach your origin. Blocked in the last 10 s: <b>${count("blocked")}</b>.` });
const arms = new THREE.Group();
for (let k = 0; k < 3; k++) { const h = new THREE.Group(); h.add(box(9, 1.2, 1.2, { x: 4.5, y0: 0, z: 0, tone: "hi", r: 0 })); h.rotation.y = (k * 2 * Math.PI) / 3; arms.add(h); }
arms.position.set(EDGE.x + EDGE.w / 2 + 8, 9, 34);
const wafLamp = lamp(EDGE.x + EDGE.w / 2 + 8, 0, 46, { r: 1.4, state: "off" });
own("waf", cyl(5, 6, { x: EDGE.x + EDGE.w / 2 + 8, y0: 0, z: 34, tone: "lo", seg: 28 }), cyl(2, 4, { x: EDGE.x + EDGE.w / 2 + 8, y0: 6, z: 34 }), arms, wafLamp.mesh);
label("waf", "WAF");
part("s3", { kind: "Origin", title: "S3 bucket shop-assets", zoom: 2.6, anchor: V(S3B.x, S3B.h + 14, S3B.z), desc: "The origin for /static/*. Only the CDN may read it (origin access control), so it never serves users directly. Every cache miss costs a trip here." });
own("s3", S.openBox({ x: S3B.x, z: S3B.z, w: S3B.w, d: S3B.d, h: S3B.h }));
const s3Lamp = lamp(S3B.x + 12, S3B.h, S3B.z + 8, { r: 1.2, state: "off" });
own("s3", s3Lamp.mesh);
label("s3", "S3 · static origin");

// ---- the ALB, its Ingress, the controller that builds it ----
part("alb", { kind: "Application Load Balancer", title: "ALB k8s-shop-shop-4f2a9c", zoom: 1.8, anchor: V(ALB.x, ALB.h + 16, ALB.z),
  desc: () => `One load balancer with a node in each AZ. Its HTTPS:443 listener sends <b>/api/*</b> to target group <b>api</b> and everything else to <b>web</b>. The targets are pod IPs (target type ip), checked every second on <b>${M.hcPath}</b>: healthy after ${M.hcHealthy} passes, unhealthy after ${M.hcUnhealthy} failures. Targets: ${tgSummary()}.` });
own("alb", housing({ x: ALB.x, z: ALB.z, w: ALB.w, d: ALB.d, h: ALB.h }), cyl(4.2, 1.8, { x: ALB.x + ALB.w / 2, y0: 12, z: 0, axis: "x" }));
const albNodes = AZ.map((a) => { const b = box(14, 3, 30, { x: ALB.x, y0: ALB.h, z: a.z, tone: "hi", r: 0.5 }); const l = lamp(ALB.x + 4, ALB.h + 3, a.z + 10, { r: 1.2 }); own("alb", b, l.mesh); return l; });
label("alb", "ALB · HTTPS:443");
part("ingress", { kind: "Ingress", title: "Ingress shop (class alb)", zoom: 3, anchor: V(ING.x, ING.h + 12, ING.z), desc: "The Kubernetes object behind the ALB. Its rules become listener rules, its backends become target groups, and its annotations set the health checks. Edit them and the controller reconfigures the ALB." });
own("ingress", housing({ x: ING.x, z: ING.z, w: ING.w, d: ING.d, h: ING.h, plinth: false }));
label("ingress", "Ingress shop");
part("lbc", { kind: "Controller", title: "aws-load-balancer-controller", zoom: 2.6, anchor: V(LBC.x, 30, LBC.z), desc: "Runs in kube-system and watches Ingress, Service and pod objects. It creates the ALB, its listener rules and target groups (recorded as TargetGroupBinding objects), and registers each ready pod's IP as a target." });
const lbcCrate = crate({ w: 24, h: 13, d: 18, ribs: 4 });
lbcCrate.position.set(LBC.x, 0, LBC.z);
const lbcLamp = lamp(LBC.x + 8, 13, LBC.z + 5, { r: 1.2, state: "off" });
own("lbc", lbcCrate, lbcLamp.mesh);
label("lbc", "aws-load-balancer-controller");
const ctlMat = new THREE.LineBasicMaterial();
S.onTheme((p) => ctlMat.color.set(p.edgeMid));
S.world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(LBC.x + 12, 0.3, LBC.z), V(LBC.x + 12, 0.3, REGION.z0 + 14), V(ING.x, 0.3, REGION.z0 + 14), V(ING.x, 0.3, ING.z - ING.d / 2)]), ctlMat));
S.world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(ING.x, 0.3, ING.z + ING.d / 2), V(ING.x, 0.3, -ALB.d / 2)]), ctlMat));

// ---- the cluster: control plane, HPA, a node per AZ with six pod slots ----
part("cp", { kind: "EKS control plane", title: "EKS control plane (managed)", zoom: 2, anchor: V(CP.x, CP.h + 14, CP.z), desc: "API server, etcd, scheduler and controllers, run by AWS across three AZs. You never see its machines; you talk to its API." });
own("cp", housing({ x: CP.x, z: CP.z, w: CP.w, d: CP.d, h: CP.h }));
label("cp", "EKS control plane");
part("hpa", { kind: "HorizontalPodAutoscaler", title: "HPA api", zoom: 2.8, anchor: V(HPA.x, 34, HPA.z), desc: () => `Keeps api's CPU near 60% by changing replicas between ${M.min} and ${M.max}. API traffic now: <b>${Math.round(apiRate())} req/s</b> → <b>${M.apiReplicas}</b> replicas.` });
const hpaMeter = S.meter({ x: HPA.x, z: HPA.z, y0: 0, h: 26, w: 5, d: 5 });
own("hpa", hpaMeter, box(12, 2, 12, { x: HPA.x, y0: 0, z: HPA.z, tone: "lo", r: 0.6 }));
label("hpa", "HPA api");
const trays = AZ.map((a, i) => {
  const id = part("node-" + i, { kind: "Node", title: NODE_NAMES[i], zoom: 1.8, anchor: V(NODE_X, TOP + 22, a.z), desc: () => `An m6i.large worker in ${a.name}. Pods here get IPs from the ${a.name} subnet (10.0.${a.subnet}.0/24) through the VPC CNI, which is why the ALB can send traffic straight to them. ${M.azDown[i] ? "<b>The zone is down.</b>" : ""}`,
    actions: () => [{ label: M.azDown[i] ? `Restore ${a.name}` : `Fail ${a.name}`, danger: !M.azDown[i], run: () => setAz(i, !M.azDown[i]) }] });
  const t = S.tray({ x: NODE_X, z: a.z, w: 108, d: 56, top: TOP, slots: SLOT_DZ.flatMap((dz) => SLOT_DX.map((dx) => [NODE_X + dx, a.z + dz])), slotSize: [22, 22] });
  own(id, t);
  label(id, NODE_NAMES[i].split(".")[0]);
  return t;
});
const slotPos = (a, k) => ({ x: NODE_X + SLOT_DX[k % 3], z: AZ[a].z + SLOT_DZ[Math.floor(k / 3)] });
const podObjs = AZ.flatMap((_, a) => [0, 1, 2, 3, 4, 5].map((k) => {
  const id = part(`pod-${a}-${k}`, { kind: "Pod", dynamic: true, zoom: 3.4, anchor: V(slotPos(a, k).x, TOP + 24, slotPos(a, k).z),
    title: () => { const p = podAt(a, k); return p ? p.name : "empty slot"; },
    desc: () => { const p = podAt(a, k); if (!p) return "No pod here right now."; return `A <b>${p.app}</b> pod in ${AZ[a].name} with VPC IP <b>${p.ip}</b>. ALB target state: <b>${p.tg || "not registered"}</b>. ${p.state === "starting" ? "Starting: not ready, so not yet registered." : ""}`; },
    actions: () => (podAt(a, k) ? [{ label: "Delete this pod", danger: true, run: () => delPod(podAt(a, k)) }] : []) });
  const p = slotPos(a, k);
  const g = crate({ w: 18, h: 12, d: 18, ribs: 3 });
  g.position.set(p.x, TOP, p.z);
  const l = lamp(6, 12, -5, { r: 1.3 });
  g.add(l.mesh);
  own(id, g);
  g.visible = false;
  label(id, "", { small: true, lod: 2.2 });
  return { id, a, k, g, l };
}));

// ---- the model ----
const M = { provider: "cloudfront", load: 160, attack: 0, apiBroken: false, hcPath: "/healthz", hcHealthy: 2, hcUnhealthy: 2, azDown: [false, false, false], downFor: [0, 0, 0], ttl: 20, min: 3, max: 9, apiReplicas: 3, webReplicas: 3, clock: 0, lowFor: 0 };
const cache = ASSETS.map((path) => ({ path, until: 0, flash: 0 }));
const pods = [];
const stats = [];
let podSeq = 0, msg = "";
const cdnHost = () => (M.provider === "cloudfront" ? "d1a2b3c4e5.cloudfront.net" : "shop.example.com.edgekey.net");
const apiRate = () => M.load * 0.3;
const podAt = (a, k) => pods.find((p) => p.a === a && p.k === k && !p.gone);
const live = (app) => pods.filter((p) => p.app === app && p.state !== "terminating" && !p.gone);
const registered = (app) => pods.filter((p) => p.app === app && p.tg && p.tg !== "draining" && !p.gone);
const tgSummary = () => ["web", "api"].map((app) => `${app} ${registered(app).filter((p) => p.tg === "healthy").length}/${registered(app).length} healthy`).join(" · ");
const note = (kind) => stats.push({ t: M.clock, kind });
const count = (kind) => stats.filter((s) => s.kind === kind && s.t > M.clock - 10).length;
const hitRatio = () => { const h = count("hit"), m = count("miss"); return h + m ? Math.round((100 * h) / (h + m)) : 0; };
const HASH = { web: "5f7c", api: "6c9d" };
const sfx = (n) => { let h = (n * 2654435761) >>> 0, o = ""; for (let i = 0; i < 5; i++) { o += "bcdfghjklmnpqrstvwxz2456789"[h % 27]; h = Math.floor(h / 27) + n * 7; } return o; };
function newPod(app) {
  const free = (a) => [0, 1, 2, 3, 4, 5].find((k) => !podAt(a, k));
  // topology spread: the zone with the fewest pods of this app that has room
  const zones = [0, 1, 2].filter((a) => !M.azDown[a] && free(a) !== undefined).sort((x, y) => live(app).filter((p) => p.a === x).length - live(app).filter((p) => p.a === y).length || x - y);
  if (!zones.length) return null;
  const a = zones[0], k = free(a), n = ++podSeq;
  const p = { app, a, k, n, name: `${app}-${HASH[app]}-${sfx(n)}`, ip: `10.0.${AZ[a].subnet}.${20 + ((n * 7) % 200)}`, state: "starting", t: 0, tg: null, ok: 0, fail: 0, flash: 0 };
  pods.push(p);
  S.event("Normal", "SuccessfulCreate", `replicaset/${app}-${HASH[app]}`, `Created pod: ${p.name}`, "replicaset-controller");
  S.event("Normal", "Scheduled", "pod/" + p.name, `Successfully assigned shop/${p.name} to ${NODE_NAMES[a]}`, "default-scheduler");
  return p;
}
function delPod(p) { if (!p || p.state === "terminating") return; p.state = "terminating"; p.t = 0; if (p.tg) p.tg = "draining"; S.event("Normal", "Killing", "pod/" + p.name, "Stopping container " + p.app); }
["web", "api"].forEach((app) => { for (let i = 0; i < 3; i++) { const p = newPod(app); Object.assign(p, { state: "ready", t: 9, tg: "healthy", ok: 9 }); } });

function reconcile(dt) {
  for (const app of ["web", "api"]) {
    const want = app === "web" ? M.webReplicas : M.apiReplicas;
    if (live(app).length < want) newPod(app);
    else if (live(app).length > want) { const counts = [0, 1, 2].map((a) => live(app).filter((p) => p.a === a).length); const v = live(app).filter((p) => p.a === counts.indexOf(Math.max(...counts))).sort((x, y) => y.n - x.n)[0]; delPod(v); }
  }
  for (const p of pods) {
    p.t += dt; p.flash = Math.max(0, p.flash - dt);
    if (p.state === "starting" && p.t > 1.6 && !M.azDown[p.a]) { p.state = "ready"; p.tg = "initial"; p.ok = 0; p.fail = 0; lbcBlink = 0.6; S.event("Normal", "SuccessfullyReconciled", "targetgroupbinding/" + tgName(p.app), `Registered target ${p.ip}:8080`, "targetGroupBinding"); }
    if (p.state === "terminating" && p.t > 1.5) { p.gone = true; if (p.tg) S.event("Normal", "SuccessfullyReconciled", "targetgroupbinding/" + tgName(p.app), `Deregistered target ${p.ip}:8080`, "targetGroupBinding"); }
  }
  // a dead zone's node goes NotReady; after a grace period its pods are evicted and recreated elsewhere
  M.azDown.forEach((down, a) => { M.downFor[a] = down ? M.downFor[a] + dt : 0; if (down && M.downFor[a] > 5 && M.downFor[a] - dt <= 5) { pods.filter((p) => p.a === a && !p.gone && p.state !== "terminating").forEach((p) => { delPod(p); S.event("Warning", "NodeNotReady", "pod/" + p.name, `Node ${NODE_NAMES[a]} is not ready; evicting`, "node-controller"); }); } });
  for (let i = pods.length - 1; i >= 0; i--) if (pods[i].gone) pods.splice(i, 1);
}
const tgName = (app) => `k8s-shop-${app}-${app === "api" ? "7b1d" : "3c9e"}`;
let hcIn = 0, lbcBlink = 0;
function healthChecks(dt) {
  hcIn -= dt;
  if (hcIn > 0) return;
  hcIn = 1;
  for (const p of pods) {
    if (!p.tg || p.tg === "draining") continue;
    const pass = p.state === "ready" && !M.azDown[p.a] && M.hcPath === "/healthz" && !(p.app === "api" && M.apiBroken);
    if (pass) { p.ok++; p.fail = 0; if (p.ok >= M.hcHealthy && p.tg !== "healthy") p.tg = "healthy"; }
    else { p.fail++; p.ok = 0; if (p.fail >= M.hcUnhealthy && p.tg !== "unhealthy") { p.tg = "unhealthy"; S.event("Warning", "Unhealthy", "pod/" + p.name, `ALB target ${p.ip}:8080 failed health checks on ${M.hcPath}: ${M.azDown[p.a] ? "Request timed out" : M.hcPath !== "/healthz" ? "Health checks failed with these codes: [404]" : "Health checks failed with these codes: [500]"}`, "elbv2"); } }
  }
}
function hpaStep(dt) {
  M.hpaIn = (M.hpaIn || 0) - dt;
  if (M.hpaIn > 0) return;
  M.hpaIn = 2;
  const want = Math.max(M.min, Math.min(M.max, Math.ceil(apiRate() / 20)));
  if (want > M.apiReplicas) { M.apiReplicas = want; M.lowFor = 0; S.event("Normal", "SuccessfulRescale", "horizontalpodautoscaler/api", `New size: ${want}; reason: cpu resource utilization (percentage of request) above target`, "horizontal-pod-autoscaler"); }
  else if (want < M.apiReplicas) { M.lowFor += 2; if (M.lowFor >= 8) { M.apiReplicas = want; M.lowFor = 0; S.event("Normal", "SuccessfulRescale", "horizontalpodautoscaler/api", `New size: ${want}; reason: All metrics below target`, "horizontal-pod-autoscaler"); } }
  else M.lowFor = 0;
}

// ---- requests ----
const net = S.packets({ speed: 150, onArrive: arrive });
const inBox = (b) => (q) => Math.abs(q.x - b.x) < b.w / 2 && Math.abs(q.z - b.z) < b.d / 2;
const inEdge = inBox(EDGE), inAlb = inBox(ALB);
const dnsUntil = USERS.map(() => 0);
let rr = { web: 0, api: 0 }, spawnIn = 0, attackIn = 0, userN = 0;
const userPath = (u) => [V(USERS[u].x - 10, FY, USERS[u].z), V(250, FY, USERS[u].z), V(250, FY, 14), V(EDGE.x + EDGE.w / 2 + 2, FY, 14)];
function request(u, kind, asset) {
  if (M.clock > dnsUntil[u]) { dnsUntil[u] = M.clock + 30; net.add([V(USERS[u].x, FY, USERS[u].z - 9), V(USERS[u].x, FY, DNS.z + 12)], { step: "dnsq", u, kind, asset, alt: true }); return; }
  net.add(userPath(u), { step: "edge", u, kind, asset, ring: true, hide: inEdge });
}
function arrive(d) {
  if (d.step === "dnsq") { dnsLamp.blink = 0.4; net.add([V(USERS[d.u].x, FY, DNS.z + 12), V(USERS[d.u].x, FY, USERS[d.u].z - 9)], { step: "dnsa", u: d.u, kind: d.kind, asset: d.asset, alt: true }); return; }
  if (d.step === "dnsa") { net.add(userPath(d.u), { step: "edge", u: d.u, kind: d.kind, asset: d.asset, ring: true, hide: inEdge }); return; }
  if (d.step === "attack") { note("blocked"); wafLamp.blink = 0.4; armsSpin = 1; net.add([V(EDGE.x + EDGE.w / 2 + 8, FY, 40), V(EDGE.x + EDGE.w / 2 + 14, 8, 44)], { step: "x", bad: true, speed: 20, fade: 8 }); return; }
  if (d.step === "edge") {
    if (d.kind === "static") {
      const c = cache.find((x) => x.path === d.asset);
      if (M.clock < c.until) { note("hit"); c.flash = 0.35; net.add(userPath(d.u).reverse(), { step: "done", u: d.u, ok: true, alt: true, hide: inEdge }); }
      else { note("miss"); net.add([V(EDGE.x, FY, -EDGE.d / 2), V(EDGE.x, FY, S3B.z), V(S3B.x + S3B.w / 2, FY, S3B.z)], { step: "s3", u: d.u, asset: d.asset, ring: true }); }
      return;
    }
    net.add([V(EDGE.x - EDGE.w / 2, FY, 0), V(ALB.x + ALB.w / 2 + 2, FY, 0)], { step: "alb", u: d.u, kind: d.kind, ring: true });
    return;
  }
  if (d.step === "s3") { s3Lamp.blink = 0.4; net.add([V(S3B.x + S3B.w / 2, FY, S3B.z), V(EDGE.x, FY, S3B.z), V(EDGE.x, FY, -EDGE.d / 2)], { step: "fill", u: d.u, asset: d.asset, alt: true }); return; }
  if (d.step === "fill") { const c = cache.find((x) => x.path === d.asset); c.until = M.clock + M.ttl; c.flash = 0.35; net.add(userPath(d.u).reverse(), { step: "done", u: d.u, ok: true, alt: true, hide: inEdge }); return; }
  if (d.step === "alb") {
    const app = d.kind === "api" ? "api" : "web";
    const healthy = registered(app).filter((p) => p.tg === "healthy");
    // with no healthy target the ALB fails open and tries them all
    const pool = healthy.length ? healthy : registered(app);
    if (!pool.length) { note("err"); userFlash(d.u, false); net.add([V(ALB.x + ALB.w / 2 + 2, FY, 0), V(ALB.x + ALB.w / 2 + 8, 9, 0)], { step: "x", bad: true, speed: 20, fade: 8 }); S.event("Warning", "503", "ingress/shop", "ALB returned 503: no registered targets in " + tgName(app), "elbv2"); return; }
    const p = pool[rr[app]++ % pool.length];
    const lz = laneZ(p.a), sp = slotPos(p.a, p.k);
    net.add([V(ALB.x - ALB.w / 2, FY, 0), V(70, FY, 0), V(70, FY, lz), V(sp.x, FY, lz), V(sp.x, FY, sp.z + 9)], { step: "pod", u: d.u, pod: p, ring: true, hide: inAlb });
    return;
  }
  if (d.step === "pod") {
    const p = d.pod;
    if (p.gone || M.azDown[p.a]) { note("err"); userFlash(d.u, false); return; }
    if (p.app === "api" && M.apiBroken) { note("err"); userFlash(d.u, false); net.add([V(slotPos(p.a, p.k).x, TOP + 12, slotPos(p.a, p.k).z), V(slotPos(p.a, p.k).x, TOP + 20, slotPos(p.a, p.k).z)], { step: "x", bad: true, speed: 18, fade: 8 }); return; }
    note("ok"); p.flash = 0.25; userFlash(d.u, true);
    return;
  }
  if (d.step === "done") userFlash(d.u, d.ok);
}
const flashU = USERS.map(() => ({ t: 0, ok: true }));
const userFlash = (u, ok) => { flashU[u] = { t: 0.35, ok }; };
function spawn(dt) {
  if (reduced()) return;
  spawnIn -= dt;
  if (spawnIn <= 0) {
    spawnIn = 1 / Math.min(9, M.load / 22);
    const u = userN++ % 3, r = Math.random();
    if (r < 0.55) request(u, "static", ASSETS[Math.floor(Math.random() * ASSETS.length)]);
    else request(u, r < 0.85 ? "api" : "page");
  }
  if (M.attack > 0) { M.attack -= dt; attackIn -= dt; if (attackIn <= 0) { attackIn = 0.22; net.add([V(ATTACKER.x - 10, FY, ATTACKER.z), V(EDGE.x + EDGE.w / 2 + 14, FY, ATTACKER.z), V(EDGE.x + EDGE.w / 2 + 14, FY, 40), V(EDGE.x + EDGE.w / 2 + 8, FY, 40)], { step: "attack", bad: true }); } }
}

// ---- actions ----
function setLoad(v) { M.load = Math.max(40, Math.min(600, v)); msg = `Load ${M.load} req/s. Static files mostly come from the edge cache; API traffic (${Math.round(apiRate())} req/s) reaches the pods, and the HPA sizes api for it.`; }
function invalidate() { cache.forEach((c) => (c.until = 0)); msg = "Invalidated /static/* at the edge: the next requests for each file are misses and go to S3, then the cache fills again."; S.event("Normal", "Invalidation", "distribution/E2QWRUHAPOMQZL", "Invalidation I2J0I21PCUYOIK created for /static/*", "cloudfront"); }
function attack() { M.attack = 6; msg = "An attacker sends SQL injection probes. The WAF blocks them at the edge: 403, and nothing reaches the cache, S3 or the cluster."; }
function setAz(a, down) {
  M.azDown[a] = down;
  trays[a].userData.down = down; trays[a].userData.setDown(down);
  msg = down ? `${AZ[a].name} is down. Requests already sent to its pods time out (504) until the ALB's health checks mark them unhealthy (${M.hcUnhealthy} failures). Then the node is NotReady and its pods are recreated in the other zones.` : `${AZ[a].name} is back. New pods spread into it again as the Deployments scale or replace pods.`;
  S.event(down ? "Warning" : "Normal", down ? "NodeNotReady" : "NodeReady", "node/" + NODE_NAMES[a], down ? `Node ${NODE_NAMES[a]} status is now: NodeNotReady` : `Node ${NODE_NAMES[a]} status is now: NodeReady`, "node-controller");
}
function setBroken(b) { M.apiBroken = b; msg = b ? "A bad api release: /healthz returns 500. The ALB marks the api targets unhealthy; with none healthy it fails open and users see 500s. Roll back to fix it." : "api is healthy again: targets pass their health checks and return to service."; }
function setProvider(p) { M.provider = p; dnsUntil.fill(0); cache.forEach((c) => (c.until = 0)); msg = p === "akamai" ? "Now on Akamai: shop.example.com is a CNAME to shop.example.com.edgekey.net. Same ideas: TLS and the WAF at the edge, cache rules per path, origins behind." : "Now on CloudFront: shop.example.com is a CNAME to a cloudfront.net distribution. Cache behaviors per path, AWS WAF at the edge."; }

// ---- every frame ----
let armsSpin = 0;
S.onTick((dt) => {
  M.clock += dt;
  while (stats.length && stats[0].t < M.clock - 12) stats.shift();
  reconcile(dt); healthChecks(dt); hpaStep(dt); spawn(dt); net.step(dt);
  cache.forEach((c, k) => { c.flash = Math.max(0, c.flash - dt); drawers[k].set(M.clock < c.until ? (c.flash > 0 ? "accent" : "on") : "off"); });
  for (const l of [dnsLamp, s3Lamp, wafLamp]) { l.blink = Math.max(0, (l.blink || 0) - dt); }
  dnsLamp.set(dnsLamp.blink > 0 ? "accent" : "off"); s3Lamp.set(s3Lamp.blink > 0 ? "accent" : "off"); wafLamp.set(wafLamp.blink > 0 ? "bad" : "off");
  attackLamp.set(M.attack > 0 ? (Math.sin(M.clock * 14) > 0 ? "bad" : "off") : "off");
  armsSpin = Math.max(0, armsSpin - dt); arms.rotation.y += dt * (0.4 + armsSpin * 6);
  lbcBlink = Math.max(0, lbcBlink - dt); lbcLamp.set(lbcBlink > 0 ? "accent" : "on");
  flashU.forEach((f, u) => { f.t = Math.max(0, f.t - dt); userLamps[u].set(f.t > 0 ? (f.ok ? "good" : "bad") : "on"); });
  albNodes.forEach((l, a) => l.set(M.azDown[a] ? "bad" : "on"));
  const util = Math.min(1.5, apiRate() / Math.max(1, live("api").filter((p) => p.state === "ready").length * 20)) * 60;
  hpaMeter.userData.meter.set(util / 120); hpaMeter.userData.meter.req(0.5); hpaMeter.userData.meter.hot(util > 75);
  podObjs.forEach((o) => {
    const p = podAt(o.a, o.k);
    if (!p) { o.g.visible = false; S.setLabel(o.id, "", { show: false }); return; }
    if (!o.g.visible || o.n !== p.n) { o.g.visible = true; o.g.scale.y = 0.02; o.n = p.n; }
    o.g.scale.y = p.state === "terminating" ? Math.max(0.02, 1 - p.t / 1.5) : Math.min(1, o.g.scale.y + dt * 3);
    o.l.set(p.flash > 0 ? "accent" : p.tg === "healthy" ? "on" : p.tg === "unhealthy" ? "bad" : p.tg === "initial" ? (Math.sin(M.clock * 10) > 0 ? "on" : "off") : "off");
    S.setLabel(o.id, `${p.app} · ${p.tg || p.state}`, { bad: p.tg === "unhealthy", show: true });
  });
  S.setLabel("edge", M.provider === "cloudfront" ? "CloudFront edge · cache" : "Akamai edge · cache");
  S.setLabel("waf", M.provider === "cloudfront" ? "AWS WAF" : "App & API Protector");
  S.setLabel("alb", `ALB · ${tgSummary()}`, { bad: registered("api").some((p) => p.tg === "unhealthy") || registered("web").some((p) => p.tg === "unhealthy") });
  S.setLabel("hpa", `HPA api · ${live("api").length}/${M.apiReplicas}`);
  const ok = count("ok") + count("hit") + count("miss"), err = count("err");
  S.say(`${M.load} req/s · cache hit ${hitRatio()}% · 5xx ${ok + err ? Math.round((100 * err) / (ok + err)) : 0}%` + (count("blocked") ? ` · WAF blocked ${count("blocked")}` : ""));
  syncUi();
});

// ---- controls ----
S.overview = () => `<h2>One request, end to end</h2><p class="muted">Ringed dots are encrypted. Pale dots are answers from the edge or S3, red ones failures. Pick a part, or run an incident with the buttons below:</p>`;
const ui = { load: document.getElementById("pr-load"), status: document.getElementById("pr-status"), prov: [...document.querySelectorAll("[data-prov]")], az: document.getElementById("pr-az"), brk: document.getElementById("pr-break") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "prov") { setProvider(b.dataset.prov); S.shellEcho?.(`dig +short shop.example.com`, "DNS now points at " + (b.dataset.prov === "cloudfront" ? "CloudFront" : "Akamai")); }
  if (a === "l-") setLoad(M.load - 80); if (a === "l+") setLoad(M.load + 80);
  if (a === "inv") { invalidate(); S.shellEcho?.(M.provider === "cloudfront" ? 'aws cloudfront create-invalidation --distribution-id E2QWRUHAPOMQZL --paths "/static/*"' : "akamai purge invalidate https://shop.example.com/static/*", "button"); }
  if (a === "atk") attack();
  if (a === "az") { setAz(1, !M.azDown[1]); S.shellEcho?.(`aws fis ${M.azDown[1] ? "start" : "stop"}-experiment --id az-outage-us-east-1b`, "button"); }
  if (a === "brk") setBroken(!M.apiBroken);
  S.renderPanel();
}));
function syncUi() {
  const set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  set(ui.load, `load ${M.load} req/s`);
  ui.prov.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.prov === M.provider)));
  set(ui.az, M.azDown[1] ? "Restore us-east-1b" : "Fail us-east-1b");
  set(ui.brk, M.apiBroken ? "Roll back api" : "Bad api release");
  const m = msg || "Traffic flows: static files from the edge cache or S3, API calls through the ALB to pods in three zones. Try an incident below.";
  set(ui.status, m);
  ui.status.dataset.tone = M.apiBroken || M.azDown.some(Boolean) ? "bad" : "";
}

// ---- what the inspector shows ----
const ACM = "arn:aws:acm:us-east-1:111122223333:certificate/9f2c-shop";
const cdnY = () => (M.provider === "cloudfront" ? `# CloudFront distribution E2QWRUHAPOMQZL (CloudFormation, excerpt)
DistributionConfig:
  Aliases: [shop.example.com]
  ViewerCertificate: { AcmCertificateArn: ${ACM}, SslSupportMethod: sni-only }   # ← the user's TLS ends at the edge
  WebACLId: arn:aws:wafv2:us-east-1:111122223333:global/webacl/shop-waf   # ← WAF runs first, before the cache
  Origins:
  - { Id: s3-assets, DomainName: shop-assets.s3.us-east-1.amazonaws.com, OriginAccessControlId: E1OAC }   # ← only CloudFront may read the bucket
  - { Id: alb, DomainName: k8s-shop-shop-4f2a9c.us-east-1.elb.amazonaws.com, CustomOriginConfig: { OriginProtocolPolicy: https-only } }   # ← a new TLS connection to the ALB
  CacheBehaviors:
  - PathPattern: /static/*
    TargetOriginId: s3-assets
    DefaultTTL: ${M.ttl}   # ← seconds an edge keeps a copy (scaled down for the demo)
  - PathPattern: /api/*
    TargetOriginId: alb
    CachePolicyId: CachingDisabled   # ← API calls always go to the origin
  DefaultCacheBehavior: { TargetOriginId: alb, CachePolicyId: CachingDisabled }` : `# Akamai property shop.example.com (Property Manager rules as YAML, excerpt)
hostnames:
- { cnameFrom: shop.example.com, cnameTo: shop.example.com.edgekey.net, certProvisioningType: CPS_MANAGED }   # ← the user's TLS ends at the edge
rules:
  behaviors:
  - { name: origin, options: { hostname: k8s-shop-shop-4f2a9c.us-east-1.elb.amazonaws.com, originSni: true } }   # ← a new TLS connection to the ALB
  - { name: webApplicationFirewall, options: { policy: shop-aap } }   # ← App & API Protector runs at the edge
  children:
  - name: Static assets
    criteria: [{ name: path, options: { values: [/static/*] } }]
    behaviors:
    - { name: origin, options: { hostname: shop-assets.s3.us-east-1.amazonaws.com } }
    - name: caching
      options: { behavior: MAX_AGE, ttl: ${M.ttl}s }   # ← how long an edge keeps a copy
  - name: API
    criteria: [{ name: path, options: { values: [/api/*] } }]
    behaviors: [{ name: caching, options: { behavior: NO_STORE } }]`);
const ingressY = () => `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
  namespace: shop
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip   # ← targets are pod IPs, not nodes
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/certificate-arn: ${ACM}
    alb.ingress.kubernetes.io/healthcheck-path: ${M.hcPath}   # ← what the ALB polls on every pod
    alb.ingress.kubernetes.io/healthy-threshold-count: "${M.hcHealthy}"
    alb.ingress.kubernetes.io/unhealthy-threshold-count: "${M.hcUnhealthy}"
spec:
  ingressClassName: alb   # ← handled by the AWS Load Balancer Controller
  rules:
  - host: shop.example.com
    http:
      paths:
      - { path: /api, pathType: Prefix, backend: { service: { name: api, port: { number: 80 } } } }
      - { path: /, pathType: Prefix, backend: { service: { name: web, port: { number: 80 } } } }
status:
  loadBalancer:
    ingress:
    - hostname: k8s-shop-shop-4f2a9c.us-east-1.elb.amazonaws.com   # ← the CDN's origin`;
const tgbY = (app) => `apiVersion: elbv2.k8s.aws/v1beta1
kind: TargetGroupBinding
metadata:
  name: ${tgName(app)}
  namespace: shop
  labels: { ingress.k8s.aws/stack: shop/shop }
spec:
  serviceRef: { name: ${app}, port: 80 }
  targetGroupARN: arn:aws:elasticloadbalancing:us-east-1:111122223333:targetgroup/${tgName(app)}/73e2d6bc24d8a067
  targetType: ip   # ← the controller registers ready pod IPs here
# targets now: ${registered(app).map((p) => `${p.ip} (${p.tg})`).join(", ") || "none"}`;
const svcY = (app) => K.service({ name: app, ns: "shop", clusterIP: app === "api" ? "172.20.41.9" : "172.20.18.3", selector: { app }, endpoints: live(app).filter((p) => p.state === "ready").map((p) => p.ip + ":8080") }).replace(/# endpoints right now[\s\S]*$/, "# with target-type ip the ALB skips this ClusterIP and kube-proxy: it uses the Service only to find the pods");
const hcFields = {
  "metadata.annotations.alb.ingress.kubernetes.io/healthcheck-path": { check: (v) => (typeof v !== "string" || !v.startsWith("/") ? "must be a path starting with /" : ""), set: (v) => { M.hcPath = v; msg = v === "/healthz" ? "Health checks are back on /healthz." : `Health checks now poll ${v}, which the app doesn't serve: every target answers 404, fails ${M.hcUnhealthy} checks and goes unhealthy. The ALB fails open, but this is how a typo takes a site down.`; } },
  "metadata.annotations.alb.ingress.kubernetes.io/healthy-threshold-count": { check: (v) => (!(+v >= 2 && +v <= 10) ? "must be between 2 and 10" : ""), set: (v) => { M.hcHealthy = +v; } },
  "metadata.annotations.alb.ingress.kubernetes.io/unhealthy-threshold-count": { check: (v) => (!(+v >= 2 && +v <= 10) ? "must be between 2 and 10" : ""), set: (v) => { M.hcUnhealthy = +v; } },
};
Object.assign(S.PARTS.ingress, { manifest: () => ingressY() + "\n---\n" + svcY("web") + "\n---\n" + svcY("api"), fields: (kind) => (kind === "Ingress" ? hcFields : kind === "Service" ? {} : null),
  facts: () => [["Class", "alb"], ["Health check", M.hcPath], ["Address", "k8s-shop-shop-4f2a9c…elb.amazonaws.com"]], kubectl: "kubectl get ingress shop -n shop\nkubectl describe ingress shop -n shop   # events from the controller\nkubectl get targetgroupbindings -n shop" });
Object.assign(S.PARTS.alb, { manifest: () => tgbY("web") + "\n---\n" + tgbY("api") + `\n---\n# aws elbv2 describe-rules (created from Ingress shop)\nListener: { Port: 443, Protocol: HTTPS, Certificates: [${ACM}] }\nRules:\n- { Priority: 1, Conditions: [{ Field: path-pattern, Values: [/api, /api/*] }], Actions: [{ Type: forward, TargetGroup: ${tgName("api")} }] }\n- { Priority: default, Actions: [{ Type: forward, TargetGroup: ${tgName("web")} }] }\nAvailabilityZones: [us-east-1a, us-east-1b, us-east-1c]   # ← one ALB node per zone; cross-zone balancing on`,
  facts: () => [["web targets", registered("web").map((p) => p.tg).join(", ") || "none"], ["api targets", registered("api").map((p) => p.tg).join(", ") || "none"], ["Health check", `${M.hcPath} · ${M.hcHealthy} ok / ${M.hcUnhealthy} fail`]],
  kubectl: "aws elbv2 describe-target-health --target-group-arn <api tg>\nkubectl get targetgroupbindings -n shop" });
const edgeFields = {
  "DistributionConfig.CacheBehaviors[0].DefaultTTL": { check: (v) => (!Number.isInteger(v) || v < 0 || v > 300 ? "must be 0–300 seconds here" : ""), set: (v) => { M.ttl = v; msg = v === 0 ? "TTL 0: every static request is a miss and goes to S3. The origin takes all the load the cache used to absorb." : `Static files are now kept ${v}s at the edge.`; } },
  "rules.children[0].behaviors[1].options.ttl": { check: (v) => (!/^\d+s$/.test(String(v)) || parseInt(v) > 300 ? 'must look like "20s" (0–300s here)' : ""), set: (v) => { M.ttl = parseInt(v); msg = `Static files are now kept ${M.ttl}s at the edge.`; } },
};
Object.assign(S.PARTS.edge, { manifest: cdnY, fields: edgeFields, appliedMsg: (c) => (!c ? "# no change" : M.provider === "cloudfront" ? "# aws cloudfront update-distribution → Status: InProgress, then Deployed to every edge" : "# akamai property activate --network PRODUCTION → activation in progress"),
  facts: () => [["Provider", M.provider === "cloudfront" ? "Amazon CloudFront" : "Akamai"], ["Hit ratio", hitRatio() + "%"], ["Cached now", cache.filter((c) => M.clock < c.until).length + " of " + ASSETS.length], ["TTL", M.ttl + "s"]],
  kubectl: () => (M.provider === "cloudfront" ? 'aws cloudfront create-invalidation --distribution-id E2QWRUHAPOMQZL --paths "/static/*"\ncurl -I https://shop.example.com/static/app.js   # x-cache: Hit from cloudfront' : "akamai purge invalidate https://shop.example.com/static/app.js\ncurl -I -H 'Pragma: akamai-x-cache-on' https://shop.example.com/static/app.js") });
Object.assign(S.PARTS.waf, { manifest: () => `# ${M.provider === "cloudfront" ? "AWS WAF web ACL shop-waf (scope CLOUDFRONT)" : "Akamai App & API Protector policy shop-aap"}, excerpt
Name: shop-waf
DefaultAction: { Allow: {} }
Rules:
- { Name: AWSManagedRulesSQLiRuleSet, Priority: 1, OverrideAction: { None: {} } }   # ← blocks SQL injection
- { Name: AWSManagedRulesCommonRuleSet, Priority: 2, OverrideAction: { None: {} } }   # ← XSS, bad inputs
- Name: rate-limit
  Priority: 3
  Action: { Block: {} }
  Statement: { RateBasedStatement: { Limit: 2000, AggregateKeyType: IP } }   # ← too many requests from one IP
# blocked in the last 10 s: ${count("blocked")}`, facts: () => [["Blocked (10 s)", count("blocked")]] });
Object.assign(S.PARTS.dns, { manifest: () => `# Route 53 hosted zone example.com (aws route53 list-resource-record-sets, excerpt)
- Name: shop.example.com.
  Type: CNAME   # ← the name points at the CDN, never at the ALB
  TTL: 300
  ResourceRecords: [{ Value: ${cdnHost()} }]
- Name: _acme.shop.example.com.
  Type: CNAME
  ResourceRecords: [{ Value: _x1.acm-validations.aws. }]   # ← proves you own the name for the TLS certificate`, kubectl: "dig +short shop.example.com" });
Object.assign(S.PARTS.s3, { manifest: `# bucket policy on shop-assets: only this CloudFront distribution may read
Statement:
- Effect: Allow
  Principal: { Service: cloudfront.amazonaws.com }
  Action: s3:GetObject
  Resource: arn:aws:s3:::shop-assets/*
  Condition: { StringEquals: { "AWS:SourceArn": arn:aws:cloudfront::111122223333:distribution/E2QWRUHAPOMQZL } }` });
Object.assign(S.PARTS.lbc, { manifest: () => K.deployment({ name: "aws-load-balancer-controller", ns: "kube-system", replicas: 2, image: "public.ecr.aws/eks/aws-load-balancer-controller:v2.8.2" }) + `\n---\napiVersion: networking.k8s.io/v1\nkind: IngressClass\nmetadata:\n  name: alb\nspec:\n  controller: ingress.k8s.aws/alb   # ← Ingresses with class alb are this controller's job` });
Object.assign(S.PARTS.cp, { manifest: `# aws eks describe-cluster --name shop (excerpt)
cluster:
  name: shop
  version: "1.31"
  endpoint: https://9F2C1E.gr7.us-east-1.eks.amazonaws.com
  resourcesVpcConfig:
    subnetIds: [subnet-1a (us-east-1a), subnet-1b (us-east-1b), subnet-1c (us-east-1c)]   # ← nodes and pods live in these
    endpointPublicAccess: false   # ← the API is reachable only from inside the VPC
  kubernetesNetworkConfig: { serviceIpv4Cidr: 172.20.0.0/16 }   # ← ClusterIPs; pod IPs come from the VPC itself` });
const hpaFields = { "spec.minReplicas": { check: (v, all) => (!Number.isInteger(v) || v < 1 || v > 6 ? "1–6 here" : v > all["spec.maxReplicas"] ? "must be ≤ maxReplicas" : ""), set: (v) => { M.min = v; M.hpaIn = 0; } }, "spec.maxReplicas": { check: (v) => (!Number.isInteger(v) || v < 2 || v > 12 ? "2–12 here (18 pod slots, shared with web)" : ""), set: (v) => { M.max = v; M.hpaIn = 0; } } };
Object.assign(S.PARTS.hpa, { manifest: () => K.hpa({ target: "api", min: M.min, max: M.max, cpu: 60, current: Math.round(Math.min(1.5, apiRate() / Math.max(1, live("api").length * 20)) * 60), replicas: live("api").length, desired: M.apiReplicas }).replace("namespace: default", "namespace: shop") + "\n---\n" + K.deployment({ name: "api", ns: "shop", replicas: M.apiReplicas, image: "111122223333.dkr.ecr.us-east-1.amazonaws.com/api:3.4.1", ready: live("api").filter((p) => p.state === "ready").length }).replace("        ports: [{ containerPort: 8080 }]", "        ports: [{ containerPort: 8080 }]\n      topologySpreadConstraints:   # ← even out pods across zones\n      - { maxSkew: 1, topologyKey: topology.kubernetes.io/zone, whenUnsatisfiable: ScheduleAnyway, labelSelector: { matchLabels: { app: api } } }"),
  fields: (kind) => (kind === "HorizontalPodAutoscaler" ? hpaFields : null) });
AZ.forEach((a, i) => Object.assign(S.PARTS["node-" + i], { manifest: () => K.node({ name: NODE_NAMES[i], cidr: `10.0.${a.subnet}.0/24`, cpu: "2", mem: "8Gi", pods: 29, ready: !M.azDown[i], labels: { "topology.kubernetes.io/zone": a.name, "node.kubernetes.io/instance-type": "m6i.large" } }).replace("# ← pod IPs on this node come from here", "# ← with the VPC CNI, pods get real VPC addresses from this subnet") }));
podObjs.forEach((o) => Object.assign(S.PARTS[o.id], { manifest: () => { const p = podAt(o.a, o.k); return p ? K.pod({ name: p.name, ns: "shop", labels: { app: p.app, "pod-template-hash": HASH[p.app] }, image: `111122223333.dkr.ecr.us-east-1.amazonaws.com/${p.app}:3.4.1`, node: NODE_NAMES[o.a], ip: p.ip, ready: p.state === "ready" && !M.azDown[p.a], phase: "Running", owner: { kind: "ReplicaSet", name: `${p.app}-${HASH[p.app]}` }, probes: true }) + `\n# ALB target ${p.ip}:8080 in ${tgName(p.app)}: ${p.tg || "not registered yet"}` : ""; } }));

// ---- kubectl, aws, dig and curl ----
// ---- kubectl and the YAML editor ----
const curlHeaders = (path) => {
  const cf = M.provider === "cloudfront";
  if (path.startsWith("/static/")) {
    const c = cache.find((x) => x.path === path);
    if (!c) return { err: `HTTP/2 404\n${cf ? "x-cache: Error from cloudfront" : "X-Cache: TCP_MISS from a23-45-67-89.deploy.akamaitechnologies.com"}` };
    const hit = M.clock < c.until;
    const u = 0; request(u, "static", path);
    return [`HTTP/2 200`, `content-type: ${path.endsWith(".js") ? "application/javascript" : path.endsWith(".css") ? "text/css" : "application/octet-stream"}`, `cache-control: public, max-age=${M.ttl}`, ...(hit ? [`age: ${Math.max(1, Math.round(M.ttl - (c.until - M.clock)))}`] : []), cf ? `x-cache: ${hit ? "Hit" : "Miss"} from cloudfront` : `X-Cache: ${hit ? "TCP_MEM_HIT" : "TCP_MISS"} from a23-45-67-89.deploy.akamaitechnologies.com (AkamaiGHost/22.1.0)`, cf ? "via: 1.1 7f3e2b.cloudfront.net (CloudFront)" : "Server: AkamaiGHost", ...(cf ? ["x-amz-cf-pop: IAD89-C1"] : []), `# ${hit ? "answered by the edge: S3 never saw it" : "fetched from S3, now cached at this edge"}`];
  }
  const app = path.startsWith("/api") ? "api" : "web";
  request(0, app === "api" ? "api" : "page");
  const healthy = registered(app).filter((p) => p.tg === "healthy"), pool = healthy.length ? healthy : registered(app);
  const p = pool.length ? pool[(rr[app] + 1) % pool.length] : null;
  const code = !p ? 503 : M.azDown[p.a] ? 504 : app === "api" && M.apiBroken ? 500 : 200;
  const lines = [`HTTP/2 ${code}`, `content-type: ${code === 200 ? (app === "api" ? "application/json" : "text/html") : "text/html"}`, cf ? `x-cache: ${code === 200 ? "Miss" : "Error"} from cloudfront` : `X-Cache: TCP_MISS from a23-45-67-89.deploy.akamaitechnologies.com`, cf ? "via: 1.1 7f3e2b.cloudfront.net (CloudFront)" : "Server: AkamaiGHost", code === 200 ? `x-served-by: ${p.name} (${AZ[p.a].name})   # ← never cached: every call reached a pod` : code === 503 ? "# the ALB had no registered targets" : code === 504 ? `# ${p.name} in ${AZ[p.a].name} didn't answer: the ALB hasn't marked it unhealthy yet` : `# ${p.name} returned 500${healthy.length ? "" : "; with no healthy targets the ALB fails open and tries them all"}`];
  return code === 200 ? lines : { err: lines.join("\n") };
};
const awsTool = ({ pos, f }) => {
  const [svc, op] = pos;
  if (svc === "cloudfront" && op === "create-invalidation") { if (M.provider !== "cloudfront") return { err: "An error occurred (NoSuchDistribution): this site is on Akamai now; use akamai purge invalidate <url>" }; S.stopTour(); invalidate(); return ["{", '  "Invalidation": { "Id": "I2J0I21PCUYOIK", "Status": "InProgress",', `    "InvalidationBatch": { "Paths": { "Items": ["${String(f["--paths"] || "/static/*")}"] } } }`, "}"]; }
  if (svc === "elbv2" && op === "describe-target-health") { const app = /api/.test(String(f["--target-group-arn"] || "")) ? "api" : /web/.test(String(f["--target-group-arn"] || "")) ? "web" : null; if (!app) return { err: "aws: error: --target-group-arn is required (…api… or …web…)" }; return ["TARGET            PORT   AZ           STATE       REASON", ...pods.filter((p) => p.app === app && p.tg).map((p) => `${p.ip.padEnd(18)}8080   ${AZ[p.a].name.padEnd(13)}${p.tg.padEnd(12)}${p.tg === "unhealthy" ? (M.azDown[p.a] ? "Target.Timeout" : "Target.ResponseCodeMismatch") : p.tg === "initial" ? "Elb.RegistrationInProgress" : p.tg === "draining" ? "Target.DeregistrationInProgress" : ""}`)]; }
  if (svc === "fis" && /^(start|stop)-experiment$/.test(op || "")) { const on = op.startsWith("start"); S.stopTour(); if (M.azDown[1] !== on) setAz(1, on); return [on ? '{ "experiment": { "id": "EXP9f2c", "state": { "status": "running" }, "targets": "us-east-1b: network blackhole" } }' : '{ "experiment": { "state": { "status": "stopped" } } }']; }
  return { err: "This lesson simulates: aws cloudfront create-invalidation, aws elbv2 describe-target-health, aws fis start-experiment / stop-experiment" };
};
S.kube({
  ns: "shop",
  welcome: "# The terminal reaches everything: kubectl for the cluster, aws for CloudFront / ALB / FIS, akamai, dig and curl for the outside view.",
  help: ["dig +short shop.example.com", "curl -I https://shop.example.com/static/app.js   (x-cache hit or miss)   ·   curl https://shop.example.com/api/cart", "aws cloudfront create-invalidation --distribution-id E2QWRUHAPOMQZL --paths \"/static/*\"   ·   akamai purge invalidate <url>", "aws elbv2 describe-target-health --target-group-arn api   (or web)", "aws fis start-experiment --id az-outage-us-east-1b   (and stop-experiment)", "kubectl get ingress,tgb,svc,pods -o wide -n shop   ·   kubectl edit ingress shop   (health check path)", "kubectl edit hpa api   ·   kubectl delete pod <name>   ·   kubectl get events"],
  examples: ["dig +short shop.example.com", "curl -I https://shop.example.com/static/app.js", "curl -I https://shop.example.com/api/cart", "kubectl get ingress,targetgroupbindings", "kubectl get pods -o wide", "aws elbv2 describe-target-health --target-group-arn api", "aws fis start-experiment --id az-outage-us-east-1b", "kubectl edit ingress shop", "kubectl get events"],
  verbs: {
    scale({ pos, f }) { const t = pos.join("/"); if (/api$/.test(t)) return { err: "horizontalpodautoscaler/api owns api's replicas and would undo this. Change the HPA instead: kubectl edit hpa api" }; if (/web$/.test(t)) { const n = +f["--replicas"]; if (!Number.isInteger(n) || n < 1 || n > 6) return { err: "web: 1–6 replicas here" }; S.stopTour(); M.webReplicas = n; return "deployment.apps/web scaled"; } return undefined; },
    delete({ pos }) { let [what, name] = pos; if (what && what.includes("/")) [what, name] = what.split("/"); if (!/^(po|pods?)$/.test(what || "")) return { err: "This lesson models deleting pods: kubectl delete pod <name>" }; const p = pods.find((x) => x.name === name && !x.gone); if (!p) return { err: `Error from server (NotFound): pods "${name || ""}" not found` }; S.stopTour(); delPod(p); return [`pod "${name}" deleted   # its target drains, then the Deployment makes a new pod`]; },
  },
  tools: {
    dig({ pos }) { if (!pos.some((x) => /shop\.example\.com/.test(x))) return { err: "this lesson's name is shop.example.com" }; return M.provider === "cloudfront" ? ["d1a2b3c4e5.cloudfront.net.", "13.224.67.12", "13.224.67.48", "# the name resolves to CloudFront edges near you, not to the ALB"] : ["shop.example.com.edgekey.net.", "e1234.a.akamaiedge.net.", "23.45.67.89", "# the name resolves to an Akamai edge near you, not to the ALB"]; },
    curl({ pos }) { const url = pos.find((x) => /shop\.example\.com/.test(x)); if (!url) return { err: "curl: (6) Could not resolve host. Try https://shop.example.com/static/app.js" }; const path = (url.match(/shop\.example\.com(\/[^\s?]*)?/) || [])[1] || "/"; if (/['"]|union|select|<script/i.test(url)) { M.attack = Math.max(M.attack, 1); return { err: `HTTP/2 403\n${M.provider === "cloudfront" ? "x-cache: Error from cloudfront" : "Server: AkamaiGHost"}\n# blocked by the WAF at the edge` }; } return curlHeaders(path); },
    aws: awsTool,
    akamai({ pos }) { if (pos[0] !== "purge" || !pos[2]) return { err: "this lesson simulates: akamai purge invalidate https://shop.example.com/static/*" }; if (M.provider !== "akamai") return { err: "this site is on CloudFront now: aws cloudfront create-invalidation …" }; S.stopTour(); invalidate(); return ["Purge request accepted (estimated time 5 s): " + pos.slice(2).join(" ")]; },
  },
});
// ---- end kubectl ----

S.setTour([
  { home: true, say: "One online shop in production. Users on the right, the AWS region on the left, three Availability Zones inside it.", hold: 6 },
  { focus: "dns", zoom: 2.4, say: "First, DNS. shop.example.com is a CNAME to the CDN, so every user is sent to an edge server near them.", hold: 6 },
  { focus: "edge", zoom: 1.9, say: "The CDN edge ends the user's TLS (the ring comes off) and runs the WAF on every request.", hold: 6 },
  { focus: "edge", zoom: 1.9, say: "Static files are cached here. A hit is answered at the edge; a miss goes to S3 once, then the copy is kept for its TTL.", run: invalidate, hold: 8 },
  { focus: "waf", zoom: 2.6, say: "An attacker probes with SQL injection: the WAF blocks it at the edge. Nothing reaches the origin.", run: attack, hold: 7 },
  { focus: "alb", zoom: 1.6, say: "API calls are never cached. They go on, over a new TLS connection, to the ALB. /api goes to the api target group, the rest to web.", hold: 7 },
  { focus: "ingress", zoom: 2.6, say: "That ALB was built from this Ingress by the AWS Load Balancer Controller. Its annotations set the target type and health checks.", hold: 7 },
  { focus: "node-1", zoom: 1.5, say: "Targets are pod IPs. With the VPC CNI each pod has a real VPC address, so the ALB sends traffic straight to it, in any zone.", hold: 7 },
  { focus: "hpa", zoom: 2.4, say: "Traffic rises. The HPA adds api pods, and the scheduler spreads them across the three zones.", run: () => setLoad(480), hold: 9 },
  { home: true, say: "Now lose us-east-1b. Requests to its pods time out until the ALB's health checks mark them unhealthy...", run: () => setAz(1, true), hold: 7 },
  { home: true, say: "...then its pods are recreated in the other two zones, and every request succeeds again.", hold: 9 },
  { home: true, say: "Edge, load balancer, pods in several zones: each layer absorbs a different kind of failure.", run: () => { setAz(1, false); setLoad(160); }, hold: 6 },
]);
S.start();
