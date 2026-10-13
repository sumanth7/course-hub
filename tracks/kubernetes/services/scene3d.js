// Lesson 06 in 3D: two nodes on a pod network, CoreDNS, kube-proxy switches and a Service's EndpointSlice.
const S = createStage({ home: { target: [-8, 20, -6], dir: [1, 0.9, 1.1], zoom: 1 }, viewH: 300 });
const { box, cyl, lamp, crate, tray, housing, track, part, own, label } = S;

const TOP = 12, Y = TOP + 1.6, FY = 1.9;
const NODES = [{ name: "node-a", cidr: "10.244.1", x0: -146 }, { name: "node-b", cidr: "10.244.2", x0: 6 }].map((n) => ({ ...n, cx: n.x0 + 61 }));
const SLOT_X = (n, s) => NODES[n].x0 + 21 + s * 40;
const CRATE_Z = -12, FRONT_Z = 3, PROXY_Z = 18, FACE_Z = 32;
const PORT_X = (n) => NODES[n].cx + 34;
const BRIDGE = { x0: -24, x1: 6, z0: 10, z1: 24 };
const LEDGER = { x: -6, z: -67, w: 112, d: 22, h: 16 };
const LB = { x: 136, z: 53, w: 32, d: 22, h: 14 }, LB_LANE = 53;
const FIXED = [{ name: "frontend", node: 0, slot: 0, ip: "10.244.1.4" }, { name: "coredns", node: 0, slot: 1, ip: "10.244.1.3" }];
const BACK_SLOTS = [[0, 2], [1, 0], [1, 1], [1, 2]];

part("cluster", { kind: "Cluster network", title: "The pod network", noFrame: true, zoom: 1, anchor: V(-8, 30, -6), desc: "Every pod gets its own IP from its node's range, and any pod can reach any other directly. The bridge between the nodes stands for that flat network.", yaml: "kubectl get pods -o wide   # the IP column" });
own("cluster", S.plate({ x: 0, z: -2, w: 328, d: 158 }));
own("cluster", box(BRIDGE.x1 - BRIDGE.x0, TOP - 5, BRIDGE.z1 - BRIDGE.z0, { x: (BRIDGE.x0 + BRIDGE.x1) / 2, y0: 5, z: (BRIDGE.z0 + BRIDGE.z1) / 2, tone: "lo", r: 0.6 }));
label("cluster", "pod network", { anchor: V(-9, TOP + 6, 17) });

const proxies = NODES.map((N, n) => {
  const id = part("node-" + n, { kind: "Node", title: `${N.name} · ${N.cidr}.0/24`, zoom: 2, anchor: V(N.cx, TOP + 4, 30), desc: `Pods on ${N.name} get IPs from ${N.cidr}.0/24. It also opens NodePort 30080 when the Service type asks for it.`, yaml: `kubectl describe node ${N.name}` });
  own(id, tray({ x: N.cx, z: -3, w: 122, d: 70, top: TOP, slots: [0, 1, 2].map((s) => [SLOT_X(n, s), CRATE_Z]), slotSize: [29, 33] }));
  own(id, box(7, 5, 1.8, { x: PORT_X(n), y0: 4.8, z: FACE_Z + 0.9, r: 0.3 }));
  label(id, N.name);
  const pid = part("proxy-" + n, { kind: "kube-proxy", title: "kube-proxy on " + N.name, zoom: 3.4, anchor: V(N.cx, TOP + 10, PROXY_Z),
    desc: "Runs on every node and watches every Service's endpoints. Traffic sent to a Service's virtual IP is rewritten here to one real pod IP, picked at random (iptables mode). The flap points the way it just sent a request.",
    yaml: "kubectl -n kube-system get ds kube-proxy\n# on the node: iptables -t nat -L KUBE-SERVICES" });
  const disc = cyl(6, 2, { x: N.cx, y0: TOP + 1, z: PROXY_Z, seg: 32 });
  const flapMat = new THREE.MeshBasicMaterial();
  S.onTheme((p) => flapMat.color.set(p.lit));
  const flap = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 1.1), flapMat);
  const pivot = new THREE.Group();
  pivot.position.set(N.cx, TOP + 3.3, PROXY_Z);
  flap.position.x = 2.5;
  pivot.add(flap);
  const sync = lamp(N.cx + 10, TOP, PROXY_Z - 3, { r: 1.1 });
  own(pid, cyl(7.4, 1, { x: N.cx, y0: TOP, z: PROXY_Z, tone: "lo", seg: 32 }), disc, pivot, sync.mesh);
  S.label(pid, "kube-proxy", { small: true, anchor: V(N.cx, TOP + 8, PROXY_Z + 8), lod: 1.3 });
  return { pivot, sync, ang: Math.PI, want: Math.PI };
});

// fixed pods and backend slots
const crateAt = (x) => { const g = crate({ w: 26, h: 15, d: 30 }); g.position.set(x, TOP, CRATE_Z); return g; };
FIXED.forEach((f) => {
  const id = part(f.name, { kind: "Pod", title: `${f.name} · ${f.ip}`, zoom: 3, anchor: V(SLOT_X(f.node, f.slot), TOP + 24, CRATE_Z),
    desc: f.name === "frontend" ? "The client. It calls the backend by name, http://backend, never by IP: it asks cluster DNS, then sends to the Service's virtual IP." : "CoreDNS, the cluster's DNS server, itself a pod behind a Service. It answers 'backend' with the ClusterIP 10.96.0.20.",
    yaml: f.name === "frontend" ? "curl http://backend.default.svc.cluster.local" : "kubectl -n kube-system get svc kube-dns" });
  own(id, crateAt(SLOT_X(f.node, f.slot)));
  label(id, `${f.name} · ${f.ip}`, { small: true });
});
const bPods = BACK_SLOTS.map(([n, s], i) => {
  const id = part("b-" + i, { kind: "Pod", dynamic: true, zoom: 3, anchor: V(SLOT_X(n, s), TOP + 24, CRATE_Z),
    title: () => { const b = backends.find((x) => x.slot === i && !x.gone); return b ? `backend-${b.id} · ${b.ip}` : "empty slot"; },
    desc: () => { const b = backends.find((x) => x.slot === i && !x.gone); return b ? `A backend pod on ${NODES[n].name} with IP ${b.ip}. ${b.ready ? "It is Ready, so it is listed in the Service's EndpointSlice." : "It is starting; it joins the EndpointSlice once Ready."} Delete it and its replacement gets a new IP, while the Service's IP never changes.` : "No pod here."; },
    actions: () => { const b = backends.find((x) => x.slot === i && !x.gone); return b ? [{ label: "Delete this pod", danger: true, run: () => { b.gone = true; b.ready = false; changed(); } }] : []; } });
  const g = crateAt(SLOT_X(n, s));
  const l = lamp(8, 15, -9, { r: 1.4 });
  g.add(l.mesh);
  own(id, g);
  g.visible = false;
  label(id, "", { small: true });
  return { g, l, id };
});

// the Service's EndpointSlice ledger
part("ledger", { kind: "Service + EndpointSlice", title: "svc/backend · ClusterIP 10.96.0.20", zoom: 2.4, anchor: V(LEDGER.x, LEDGER.h + 14, LEDGER.z),
  desc: () => `The Service has a stable name, <b>backend</b>, and a stable virtual IP, <b>10.96.0.20</b>. It selects pods labelled app=backend and lists the ready ones here: <b>${endpoints().map((b) => b.ip).join(", ") || "none"}</b>. Type: <b>${svc.type}</b>.`,
  yaml: () => `kind: Service\nmetadata: { name: backend }\nspec:\n  type: ${svc.type}\n  selector: { app: backend }\n  ports: [{ port: 80, targetPort: 8080${svc.type !== "ClusterIP" ? ", nodePort: 30080" : ""} }]`,
  actions: () => ["ClusterIP", "NodePort", "LoadBalancer"].filter((t) => t !== svc.type).map((t) => ({ label: "Make it " + t, run: () => { svc.type = t; } })) });
own("ledger", housing({ x: LEDGER.x, z: LEDGER.z, w: LEDGER.w, d: LEDGER.d, h: LEDGER.h }));
const epLamps = [0, 1, 2, 3].map((i) => { const l = lamp(LEDGER.x - 44 + i * 28, LEDGER.h, LEDGER.z, { r: 1.4 }); own("ledger", l.mesh); S.label("ledger", "", { small: true, anchor: V(LEDGER.x - 44 + i * 28, LEDGER.h + 6, LEDGER.z + 4) }); return { l, L: S.labels.ledger }; });
label("ledger", "svc/backend · 10.96.0.20");

part("lb", { kind: "Cloud load balancer", title: "LoadBalancer 203.0.113.7", zoom: 2.6, anchor: V(LB.x, LB.h + 10, LB.z), desc: "With type LoadBalancer, the cloud provider puts a load balancer with a public address in front of the NodePorts on every node.", yaml: "kubectl get svc backend   # EXTERNAL-IP" });
own("lb", housing({ x: LB.x, z: LB.z, w: LB.w, d: LB.d, h: LB.h }), track([[[PORT_X(0), LB_LANE], [LB.x, LB_LANE]], [[PORT_X(0), FACE_Z + 2], [PORT_X(0), LB_LANE]], [[PORT_X(1), FACE_Z + 2], [PORT_X(1), LB_LANE]]], { width: 4.8 }));
label("lb", "cloud LB");

// ---- model ----
const svc = { type: "ClusterIP", replicas: 3 };
const nextIp = { 0: 10, 1: 5 };
const backends = [];
let seq = 0, replaceIn = 0, cacheLeft = 0;
function addBackend(slot) { const [n] = BACK_SLOTS[slot]; backends.push({ id: ++seq, slot, node: n, ip: NODES[n].cidr + "." + nextIp[n]++, ready: false, t: 0, gone: false, fade: 1 }); }
[0, 1, 2].forEach((s) => { addBackend(s); Object.assign(backends[backends.length - 1], { ready: true, t: 9 }); });
const endpoints = () => backends.filter((b) => b.ready && !b.gone);
const freeSlot = () => [0, 1, 2, 3].find((s) => !backends.some((b) => b.slot === s));
const changed = () => proxies.forEach((p) => (p.syncT = 1));
function reconcile(dt) {
  const live = backends.filter((b) => !b.gone);
  if (live.length < svc.replicas) { replaceIn -= dt; if (replaceIn <= 0) { const s = freeSlot(); if (s !== undefined) addBackend(s); replaceIn = 1.2; } } else replaceIn = Math.max(replaceIn, 0.8);
  if (live.length > svc.replicas) { const v = live.sort((a, b) => b.id - a.id)[0]; v.gone = true; v.ready = false; changed(); }
  for (const b of backends) { b.t += dt; if (!b.ready && !b.gone && b.t > 1.4) { b.ready = true; changed(); } if (b.gone) b.fade -= dt * 2; }
  for (let i = backends.length - 1; i >= 0; i--) if (backends[i].gone && backends[i].fade <= 0) backends.splice(i, 1);
}
const front = (n, s) => V(SLOT_X(n, s), Y, FRONT_Z + 1.5);
const clientPt = front(0, 0), dnsPt = front(0, 1);
const net = S.packets({ speed: 110, onArrive: arrive });
function toProxy(from, n, d = {}) { net.add([from, V(from.x, Y, PROXY_Z), V(NODES[n].cx, Y, PROXY_Z)], { ...d, step: "proxy", node: n, ring: true }); }
function routeFrom(n) {
  const eps = endpoints();
  const start = V(NODES[n].cx, Y, PROXY_Z);
  if (!eps.length) { net.add([start, V(start.x, Y + 6, start.z)], { step: "drop", bad: true, speed: 12, fade: 5 }); return; }
  const b = eps[Math.floor(Math.random() * eps.length)];
  const [bn, bs] = BACK_SLOTS[b.slot];
  const dest = front(bn, bs);
  const pts = [start];
  if (bn !== n) { const e1 = n === 0 ? -24 : 6, e2 = n === 0 ? 6 : -24; pts.push(V(e1, Y, PROXY_Z), V(e2, Y, PROXY_Z)); }
  pts.push(V(dest.x, Y, PROXY_Z), dest);
  proxies[n].want = Math.atan2(-(pts[1].z - start.z), pts[1].x - start.x || 0.0001);
  net.add(pts, { step: "pod", target: b.id });
}
const flash = {};
function arrive(d) {
  if (d.step === "dnsq") net.add([dnsPt, V(dnsPt.x, Y, dnsPt.z + 4), V(clientPt.x, Y, clientPt.z + 4), clientPt], { step: "dnsa", alt: true });
  else if (d.step === "dnsa") { cacheLeft = 6; toProxy(clientPt, 0); }
  else if (d.step === "proxy") routeFrom(d.node);
  else if (d.step === "port") toProxy(V(PORT_X(d.node), Y, FACE_Z - 2), d.node);
  else if (d.step === "pod") flash[d.target] = 0.25;
}
let inT = 0, exT = 0.5, exNode = 0;
function traffic(dt) {
  if (reduced()) return;
  inT -= dt; exT -= dt;
  if (inT <= 0) { inT = 1.1; if (cacheLeft <= 0) net.add([clientPt, V(clientPt.x, Y, clientPt.z + 4), V(dnsPt.x, Y, dnsPt.z + 4), dnsPt], { step: "dnsq", alt: true }); else { cacheLeft--; toProxy(clientPt, 0); } }
  if (svc.type !== "ClusterIP" && exT <= 0) {
    exT = 1.1; const n = exNode; exNode = 1 - exNode;
    const port = V(PORT_X(n), FY, FACE_Z + 2);
    if (svc.type === "NodePort") net.add([V(PORT_X(n), FY, 96), port], { step: "port", node: n });
    else net.add([V(200, 7, LB_LANE), V(LB.x, FY, LB_LANE), V(PORT_X(n), FY, LB_LANE), port], { step: "port", node: n, hide: (q) => Math.abs(q.x - LB.x) < LB.w / 2 && Math.abs(q.z - LB.z) < LB.d / 2 });
  }
}

S.onTick((dt) => {
  reconcile(dt); traffic(dt); net.step(dt);
  bPods.forEach((p, slot) => {
    const b = backends.find((x) => x.slot === slot);
    p.g.visible = !!b && (!b.gone || b.fade > 0);
    if (b) { p.g.scale.y = b.gone ? Math.max(0.01, b.fade) : Math.min(1, b.t / 0.4 + 0.01); flash[b.id] = Math.max(0, (flash[b.id] || 0) - dt); p.l.set(b.ready ? (flash[b.id] > 0 ? "accent" : "on") : "off"); }
    S.setLabel(p.id, b && !b.gone ? `backend-${b.id} · ${b.ip}` : "", { show: !!b && !b.gone });
  });
  const eps = endpoints();
  epLamps.forEach((e, i) => { e.l.set(eps[i] ? "on" : "off"); const ip = eps[i] ? eps[i].ip : ""; if (e.L.el.textContent !== ip) e.L.el.textContent = ip; e.L.el.style.display = ip ? "" : "none"; });
  proxies.forEach((p, n) => {
    p.syncT = Math.max(0, (p.syncT || 0) - dt * 1.5);
    p.sync.set(p.syncT > 0 ? "accent" : "off");
    const d = Math.atan2(Math.sin(p.want - p.ang), Math.cos(p.want - p.ang));
    p.ang += d * (1 - Math.exp(-dt / 0.08));
    p.pivot.rotation.y = p.ang;
  });
  S.PARTS.lb.meshes.forEach((m) => (m.visible = svc.type === "LoadBalancer"));
  S.setLabel("lb", "cloud LB", { show: svc.type === "LoadBalancer" });
  S.say(`backend → 10.96.0.20 · ${eps.length} endpoint${eps.length === 1 ? "" : "s"} · ${svc.type}`);
  sync(eps);
});

S.overview = () => `<h2>How a request finds a pod</h2><p class="muted">frontend calls <b>backend</b> by name. Follow it: DNS lookup, the Service's virtual IP, kube-proxy's rewrite, a pod on either node. Pick a part:</p>`;
const ui = { type: [...document.querySelectorAll("[data-type]")], scale: document.getElementById("sv-scale"), rows: document.getElementById("sv-rows"), status: document.getElementById("sv-status") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "type") svc.type = b.dataset.type;
  if (a === "up") svc.replicas = Math.min(4, svc.replicas + 1);
  if (a === "down") svc.replicas = Math.max(0, svc.replicas - 1);
  if (a === "del") { const v = backends.filter((x) => !x.gone).sort((x, y) => x.id - y.id)[0]; if (v) { v.gone = true; v.ready = false; changed(); } }
  S.renderPanel();
}));
function sync(eps) {
  ui.type.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === svc.type)));
  const t = "replicas " + svc.replicas; if (ui.scale.textContent !== t) ui.scale.textContent = t;
  const html = backends.filter((b) => !b.gone).sort((a, b) => a.id - b.id).map((b) => `<tr><td>backend-${b.id}</td><td>${NODES[b.node].name}</td><td>${b.ip}</td><td data-tone="${b.ready ? "good" : ""}">${b.ready ? "in endpoints" : "starting"}</td></tr>`).join("");
  if (ui.rows.__h !== html) { ui.rows.innerHTML = html; ui.rows.__h = html; }
  const msg = { ClusterIP: "ClusterIP: reachable only inside the cluster, at 10.96.0.20 or the name backend.", NodePort: "NodePort: every node also opens port 30080; outside traffic can hit either node.", LoadBalancer: "LoadBalancer: a cloud load balancer spreads outside traffic over the NodePorts." }[svc.type];
  if (ui.status.textContent !== msg) ui.status.textContent = msg;
}

S.setTour([
  { home: true, say: "Two nodes, each giving its pods IPs from its own range. The frontend pod wants to call the backend.", hold: 5 },
  { focus: "frontend", zoom: 3, say: "It doesn't know any pod IPs. It asks cluster DNS for 'backend' (the ringed dots)...", hold: 6 },
  { focus: "coredns", zoom: 3, say: "...and CoreDNS answers with the Service's virtual IP, 10.96.0.20.", hold: 5 },
  { focus: "proxy-0", zoom: 3.2, say: "kube-proxy on the frontend's node rewrites that virtual IP to one real pod IP, often on the other node.", hold: 7 },
  { focus: "ledger", zoom: 2.4, say: "It picks from the Service's EndpointSlice: the IPs of the ready pods it selects.", hold: 6 },
  { focus: "b-1", zoom: 3, say: "Delete a backend pod. Its replacement gets a new IP; the Service's address never changes.", run: () => { const v = backends.find((x) => x.slot === 1 && !x.gone); if (v) { v.gone = true; v.ready = false; changed(); } }, hold: 7 },
  { home: true, say: "Make it a NodePort: port 30080 opens on every node for outside traffic.", run: () => { svc.type = "NodePort"; }, hold: 7 },
  { focus: "lb", zoom: 2.4, say: "Make it a LoadBalancer: the cloud adds a public load balancer in front of those ports.", run: () => { svc.type = "LoadBalancer"; }, hold: 7 },
  { home: true, say: "Name → virtual IP → a ready pod, wherever it runs. That is a Service.", run: () => { svc.type = "ClusterIP"; }, hold: 5 },
]);
S.start();
