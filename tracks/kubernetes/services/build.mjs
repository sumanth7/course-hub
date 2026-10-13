import { k, scene, RUNTIME, writeLesson } from "../shared.mjs";

// World layout. x along the plate, y across, z up. Two nodes joined by the pod network.
const PLATE = { x: -164, y: -84, w: 328, d: 158, r: 9 };
const TRAY_Z = 4, TOP = 12;
const NODES = [
  { name: "node-a", cidr: "10.244.1", tray: { x: -146, y: -38, w: 122, d: 70, r: 3 } },
  { name: "node-b", cidr: "10.244.2", tray: { x: 6, y: -38, w: 122, d: 70, r: 3 } },
];
const cxOf = (n) => NODES[n].tray.x + NODES[n].tray.w / 2;
const SLOT_X = (n, s) => NODES[n].tray.x + 21 + s * 40;
const CRATE_Y = -12;
const CRATE = (x) => ({ x: x - 13, y: CRATE_Y - 15, w: 26, d: 30, r: 0.8 });
const CRATE_H = 15;
const FRONT_Y = CRATE_Y + 15; // crate front face
const PROXY_Y = 18;
const PROXY_R = 6;
const FACE_Y = NODES[0].tray.y + NODES[0].tray.d; // tray front face
const PORT_X = (n) => cxOf(n) + 34;
const BRIDGE = { x: -24, y: 10, w: 30, d: 14, r: 1 };
const LEDGER = { x: -62, y: -78, w: 112, d: 22, r: 2.5 };
const LEDGER_H = 16;
const LB = { x: 120, y: 42, w: 32, d: 22, r: 2.5 };
const LB_H = 14;
const LB_LANE = 53;
const Z = TOP + 1.6; // packets ride just above the tray surface

const C = scene({
  width: 640,
  height: 400,
  fit: [...k.boxCorners(PLATE, -17, 0), [LEDGER.x, LEDGER.y, LEDGER_H + 4], [LEDGER.x + LEDGER.w, LEDGER.y, LEDGER_H + 4], [200, 50, 10]],
});
const { P, at, S, L, D, byDepth, plate, housing, crate, lampSvg, topText, frontText, faceRect } = C;

// fixed pods: frontend and CoreDNS on node-a. Backend slots: node-a slot 2, node-b slots 0..2.
const FIXED = [
  { name: "frontend", node: 0, slot: 0, ip: "10.244.1.4" },
  { name: "coredns", node: 0, slot: 1, ip: "10.244.1.3" },
];
const BACK_SLOTS = [[0, 2], [1, 0], [1, 1], [1, 2]];

function tray(n) {
  const T = NODES[n].tray;
  const out = [`<path class="iso-halo" d="${k.haloOf(T, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const [x, y] of byDepth(k.corners(T, 6))) out.push(S(k.cylinder(x, y, 3, 0, TRAY_Z, P, 18), { tone: "lo" }));
  out.push(S(k.slabOf(T, TRAY_Z, TOP - TRAY_Z, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(T, TRAY_Z + 2.4, P, 4), { tone: "faint" }) }));
  for (let s = 0; s < 3; s++) {
    const seat = k.insetPlan(CRATE(SLOT_X(n, s)), -1.6);
    out.push(L(k.planOutline(seat, TOP, P, 2), { tone: "faint" }));
    out.push(D(k.corners(seat, 0).map(([x, y]) => at([x, y, TOP])), { size: 0.4, tone: "lo" }));
  }
  out.push(topText(T.x + 3, T.y + 5, TOP, `${NODES[n].name} · ${NODES[n].cidr}.0/24`, { size: 2.8, tone: "lo" }));
  // NodePort on the tray front
  out.push(C.port(PORT_X(n), FACE_Y, TRAY_Z + 0.8, { w: 7, h: 5 }));
  out.push(frontText(PORT_X(n) - 6, FACE_Y, TRAY_Z + 0.9, ":30080", { size: 2.3, tone: "mid", attrs: `data-np="${n}"` }));
  // kube-proxy: a switch disc with a flap that turns toward the pod it picked
  const cx = cxOf(n);
  out.push(S(k.cylinder(cx, PROXY_Y, PROXY_R + 1.4, TOP, 1, P, 32), { tone: "lo" }));
  out.push(S(k.cylinder(cx, PROXY_Y, PROXY_R, TOP + 1, 2, P, 32, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(cx, PROXY_Y, PROXY_R, TOP + 1.1, TOP + 2.9, 30, P), { tone: "faint" }));
  out.push(topText(cx - 9, PROXY_Y + PROXY_R + 4.6, TOP, "kube-proxy", { size: 2.6, tone: "mid" }));
  out.push(S(k.cylinder(cx, PROXY_Y, 1.5, TOP + 3, 0.5, P, 14), { tone: "mid" }));
  out.push(lampSvg(cx + PROXY_R + 4, PROXY_Y - 3, TOP, { r: 1.1, attr: `data-sync="${n}"` }));
  return out.join("");
}
const crateFor = (x, name, ip, { attr = "", lampAttr = "" } = {}) =>
  `<g ${attr}>${crate(CRATE(x), TOP, CRATE_H, { ribs: 5, lamp: [x + 8, CRATE_Y - 9], lampAttr })}` +
  topText(x - 11, CRATE_Y + 6, TOP + CRATE_H, name, { size: 4.2, tone: "hi", attrs: 'data-name=""' }) +
  topText(x - 11, CRATE_Y + 11.6, TOP + CRATE_H, ip, { size: 3.3, tone: "mid", attrs: 'data-ip=""' }) +
  `</g>`;
const flap = (n, ang) => k.lineOnTop([cxOf(n), PROXY_Y], [cxOf(n) + Math.cos(ang) * (PROXY_R - 1), PROXY_Y + Math.sin(ang) * (PROXY_R - 1)], TOP + 3.1, P);

function trayGroup(n) {
  const pods = [];
  FIXED.filter((f) => f.node === n).forEach((f) => pods.push([SLOT_X(n, f.slot), crateFor(SLOT_X(n, f.slot), f.name, f.ip, { attr: `data-fixed="${f.name}"` })]));
  BACK_SLOTS.forEach(([nn, s], i) => { if (nn === n) pods.push([SLOT_X(n, s), crateFor(SLOT_X(n, s), "backend", "", { attr: `data-bslot="${i}" style="opacity:0"`, lampAttr: `data-blamp="${i}"` })]); });
  pods.sort((a, b) => a[0] - b[0]);
  return tray(n) + pods.map((p) => p[1]).join("") + `<path data-flap="${n}" class="iso-line" data-tone="lit" data-free="end" d="${flap(n, Math.PI)}" style="stroke-width:1.1"/>` + `<g data-lane="${n}"></g>`;
}

function bridge() {
  const out = [S(k.slabOf(BRIDGE, TRAY_Z + 1, TOP - TRAY_Z - 1, P, 2, 0.4), { tone: "lo" })];
  out.push(L(k.planOutline(k.insetPlan(BRIDGE, 1.4), TOP, P, 2), { tone: "faint" }));
  out.push(D([[BRIDGE.x + 3, BRIDGE.y + 3], [BRIDGE.x + BRIDGE.w - 3, BRIDGE.y + 3], [BRIDGE.x + 3, BRIDGE.y + BRIDGE.d - 3], [BRIDGE.x + BRIDGE.w - 3, BRIDGE.y + BRIDGE.d - 3]].map(([x, y]) => at([x, y, TOP])), { size: 0.45 }));
  return out.join("");
}

function ledger() {
  const out = [housing(LEDGER, 0, LEDGER_H, { seam: 0.4 })];
  const top = LEDGER_H;
  const card = { x: LEDGER.x + 3, y: LEDGER.y + 3, w: LEDGER.w - 6, d: LEDGER.d - 6, r: 1 };
  out.push(S(k.slabOf(card, top, 0.5, P, 2), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(card, 1), top + 0.5, P, 2), { tone: "faint" }));
  for (let i = 0; i < 4; i++) {
    const x = card.x + 4 + i * 26;
    out.push(lampSvg(x + 1, card.y + 5, top + 0.5, { r: 1.1, attr: `data-ep="${i}" style="opacity:.15"` }));
    out.push(topText(x - 1, card.y + 12.4, top + 0.5, "", { size: 2.8, tone: "hi", attrs: `data-epip="${i}"` }));
  }
  out.push(frontText(LEDGER.x + 4, LEDGER.y + LEDGER.d, 6, "svc/backend  ClusterIP 10.96.0.20:80  →  EndpointSlice", { size: 2.6, tone: "mid" }));
  return out.join("");
}

function lb() {
  const out = [housing(LB, 0, LB_H, { seam: 0.5 })];
  const fx = LB.x + LB.w;
  out.push(S(k.slabOf({ x: fx, y: LB_LANE - 4, w: 1.6, d: 8, r: 1 }, 3, 8, P, 2), { tone: "mid", crease: "none" }));
  out.push(L(k.sideRing([fx + 1.6, LB_LANE, 7], 2.4, "x", P, 18), { tone: "lo" }));
  out.push(topText(LB.x + 3, LB.y + 9, LB_H, "cloud LB", { size: 3, tone: "mid" }));
  out.push(topText(LB.x + 3, LB.y + 14, LB_H, "203.0.113.7", { size: 2.6, tone: "lo" }));
  return `<g data-part="lb">${out.join("")}</g>`;
}

const body = [
  plate(PLATE, { ruler: false }),
  // LB lanes to each node's NodePort, inlaid in the plate
  `<g data-part="lanes">${[0, 1].map((n) => C.inlay({ x: PORT_X(n) - 2.4, y: FACE_Y + 1.8, w: 4.8, d: LB_LANE - FACE_Y + 0.6, r: 0.8 })).join("")}${C.inlay({ x: PORT_X(0) - 2.4, y: LB_LANE - 2.4, w: LB.x - PORT_X(0) + 3, d: 4.8, r: 0.8 })}</g>`,
  ledger(),
  trayGroup(0),
  bridge(),
  `<g data-lane="bridge"></g>`,
  trayGroup(1),
  `<g data-lane="front"></g>`,
  lb(),
  `<g data-lane="out"></g>`,
].join("");

const live = `
const P = ${JSON.stringify(P)};
${RUNTIME}
const TOP = ${TOP}, Z = ${Z}, CRATE_Y = ${CRATE_Y}, FRONT_Y = ${FRONT_Y}, PROXY_Y = ${PROXY_Y}, PROXY_R = ${PROXY_R}, FACE_Y = ${FACE_Y};
const NODES = ${JSON.stringify(NODES)}, BACK_SLOTS = ${JSON.stringify(BACK_SLOTS)}, FIXED = ${JSON.stringify(FIXED)};
const LB = ${JSON.stringify(LB)}, LB_LANE = ${LB_LANE}, BRIDGE = ${JSON.stringify(BRIDGE)};
const cxOf = (n) => NODES[n].tray.x + NODES[n].tray.w / 2;
const SLOT_X = (n, s) => NODES[n].tray.x + 21 + s * 40;
const PORT_X = (n) => cxOf(n) + 34;
const flap = ${flap.toString().replace(/k\./g, "")};
const lanes = { 0: $('[data-lane="0"]'), 1: $('[data-lane="1"]'), bridge: $('[data-lane="bridge"]'), front: $('[data-lane="front"]'), out: $('[data-lane="out"]') };
const bEls = BACK_SLOTS.map((_, i) => $('[data-bslot="' + i + '"]'));
const ui = { status: document.getElementById("sv-status"), rows: document.getElementById("sv-rows"), type: [...document.querySelectorAll("[data-type]")], scale: document.getElementById("sv-scale") };

// ---- model ----
const svc = { type: "ClusterIP", replicas: 3, ip: "10.96.0.20" };
const nextIp = { 0: 10, 1: 5 };
const backends = []; // { id, slot, node, ip, ready, t }
let seq = 0;
function addBackend(slot) {
  const [node] = BACK_SLOTS[slot];
  const ip = NODES[node].cidr + "." + nextIp[node]++;
  backends.push({ id: ++seq, slot, node, ip, ready: false, t: 0, gone: false });
  const g = bEls[slot];
  setText(g.querySelector("[data-name]"), "backend-" + seq);
  setText(g.querySelector("[data-ip]"), ip);
}
[0, 1, 2].forEach((s) => { addBackend(s); backends[backends.length - 1].ready = true; backends[backends.length - 1].t = 9; });
const freeSlot = () => [0, 1, 2, 3].find((s) => !backends.some((b) => b.slot === s));
let replaceIn = 0, sync = [0, 0], cacheLeft = 0;
const endpoints = () => backends.filter((b) => b.ready && !b.gone);
function reconcile(dt) {
  const live = backends.filter((b) => !b.gone);
  if (live.length < svc.replicas) { replaceIn -= dt; if (replaceIn <= 0) { const s = freeSlot(); if (s !== undefined) addBackend(s); replaceIn = 1.2; } }
  else replaceIn = Math.max(replaceIn, 0.8);
  if (live.length > svc.replicas) { const v = live.sort((a, b) => b.id - a.id)[0]; v.gone = true; v.ready = false; endpointsChanged(); }
  for (const b of backends) {
    b.t += dt;
    if (!b.ready && !b.gone && b.t > 1.4) { b.ready = true; endpointsChanged(); }
  }
  for (let i = backends.length - 1; i >= 0; i--) if (backends[i].gone && backends[i].fade <= 0) backends.splice(i, 1);
}
function endpointsChanged() { sync = [1, 1]; }
function deleteOne() {
  const live = backends.filter((b) => !b.gone);
  if (!live.length) return;
  const v = live.sort((a, b) => a.id - b.id)[0];
  v.gone = true; v.ready = false; endpointsChanged();
}

// ---- traffic ----
const laneOf = ([x, y, z]) => {
  if (z < TOP) return y > FACE_Y + 1 || x > LB.x ? (x > LB.x - 0.5 ? lanes.out : lanes.front) : lanes.front;
  if (x < BRIDGE.x + 2) return lanes[0];
  if (x < BRIDGE.x + BRIDGE.w - 2) return lanes.bridge;
  return lanes[1];
};
const hideIn = ([x, y, z]) => x > LB.x && x < LB.x + LB.w && y > LB.y && y < LB.y + LB.d;
const net = packets({ speed: 110, layer: laneOf, onArrive: arrive });
const flapWant = [Math.PI, Math.PI], flapAng = [Math.PI, Math.PI];
let stats = { ok: 0, dropped: 0 };
const frontOf = (n, s) => [SLOT_X(n, s), FRONT_Y + 1.5, Z];
const clientPt = frontOf(0, 0), dnsPt = frontOf(0, 1);
function toProxy(from, n, data) {
  const p = [cxOf(n), PROXY_Y, Z];
  net.add([from, [from[0], PROXY_Y, Z], p], { ...data, step: "proxy", node: n, hide: hideIn }, "is-alt");
}
function routeFrom(n, data) {
  // kube-proxy rewrites the ClusterIP to one endpoint, picked at random (iptables mode)
  const eps = endpoints();
  if (!eps.length) { stats.dropped++; net.add([[cxOf(n), PROXY_Y, Z], [cxOf(n), PROXY_Y, Z + 5]], { step: "drop", speed: 12, fade: 5 }, "is-bad"); return; }
  const b = eps[Math.floor(Math.random() * eps.length)];
  const [bn, bs] = BACK_SLOTS[b.slot];
  const dest = frontOf(bn, bs);
  const start = [cxOf(n), PROXY_Y, Z];
  const pts = [start];
  flapWant[n] = Math.atan2(0.5, (bn === n ? dest[0] : (bn > n ? 1 : -1) * 999) - start[0]);
  if (bn !== n) {
    const edge = n === 0 ? [NODES[0].tray.x + NODES[0].tray.w, PROXY_Y, Z] : [NODES[1].tray.x, PROXY_Y, Z];
    const edge2 = n === 0 ? [NODES[1].tray.x, PROXY_Y, Z] : [NODES[0].tray.x + NODES[0].tray.w, PROXY_Y, Z];
    pts.push(edge, edge2);
  }
  pts.push([dest[0], PROXY_Y, Z], dest);
  flapWant[n] = Math.atan2(pts[1][1] - start[1] + (pts[1][1] === start[1] ? -0.0001 : 0), pts[1][0] - start[0]);
  net.add(pts, { step: "pod", target: b.id });
}
function arrive(d) {
  if (d.step === "dnsq") net.add([dnsPt, [dnsPt[0], dnsPt[1] + 4, Z], [clientPt[0], clientPt[1] + 4, Z], clientPt], { step: "dnsa" }, "is-alt");
  else if (d.step === "dnsa") { cacheLeft = 6; toProxy(clientPt, 0, { from: "frontend" }); }
  else if (d.step === "proxy") routeFrom(d.node, d);
  else if (d.step === "port") toProxy([PORT_X(d.node), FACE_Y - 2, Z], d.node, d);
  else if (d.step === "pod") {
    const b = backends.find((x) => x.id === d.target);
    if (b && !b.gone) { stats.ok++; const s = bEls[b.slot].querySelector(".iso-solid"); if (s) { s.setAttribute("data-flash", ""); clearTimeout(s.__t); s.__t = setTimeout(() => s.removeAttribute("data-flash"), 200); } }
    else stats.dropped++;
  }
}
let inT = 0, exT = 0.45, exNode = 0;
function sendTraffic(dt) {
  if (still.matches) return;
  inT -= dt; exT -= dt;
  if (inT <= 0) {
    inT = 1.1;
    if (cacheLeft <= 0) net.add([clientPt, [clientPt[0], clientPt[1] + 4, Z], [dnsPt[0], dnsPt[1] + 4, Z], dnsPt], { step: "dnsq" }, "is-alt");
    else { cacheLeft--; toProxy(clientPt, 0, { from: "frontend" }); }
  }
  if (svc.type !== "ClusterIP" && exT <= 0) {
    exT = 1.1;
    const n = exNode; exNode = 1 - exNode;
    const port = [PORT_X(n), FACE_Y + 2, 2];
    if (svc.type === "NodePort") net.add([[PORT_X(n), 96, 2], port], { step: "port", node: n });
    else net.add([[196, LB_LANE, 7], [LB.x + LB.w / 2, LB_LANE, 2], [PORT_X(n), LB_LANE, 2], port], { step: "port", node: n, hide: hideIn });
  }
}

// ---- drawing ----
function draw(dt) {
  net.draw();
  bEls.forEach((g, slot) => {
    const b = backends.find((x) => x.slot === slot);
    let o = 0;
    if (b) { b.fade = b.gone ? (b.fade ?? 1) - dt * 2 : 1; o = b.gone ? Math.max(0, b.fade) : Math.min(1, b.t / 0.4); }
    g.style.opacity = o.toFixed(2);
    g.style.visibility = o > 0.01 ? "" : "hidden";
    const lamp = g.querySelector("[data-blamp]");
    if (lamp) lamp.style.opacity = b && b.ready ? 1 : 0.12;
  });
  const eps = endpoints();
  for (let i = 0; i < 4; i++) {
    $('[data-ep="' + i + '"]').style.opacity = eps[i] ? 1 : 0.15;
    setText($('[data-epip="' + i + '"]'), eps[i] ? eps[i].ip : "");
  }
  for (const n of [0, 1]) {
    sync[n] = Math.max(0, sync[n] - dt * 1.5);
    $('[data-sync="' + n + '"]').style.opacity = (0.2 + 0.8 * sync[n]).toFixed(2);
    const d = Math.atan2(Math.sin(flapWant[n] - flapAng[n]), Math.cos(flapWant[n] - flapAng[n]));
    flapAng[n] += d * (1 - Math.exp(-dt / 0.08));
    $('[data-flap="' + n + '"]').setAttribute("d", flap(n, flapAng[n]));
    $('[data-np="' + n + '"]').style.opacity = svc.type === "ClusterIP" ? 0.25 : 1;
  }
  $('[data-part="lb"]').style.opacity = svc.type === "LoadBalancer" ? 1 : 0.25;
  $('[data-part="lanes"]').style.opacity = svc.type === "LoadBalancer" ? 1 : 0.3;
  say("backend → " + svc.ip + " · " + eps.length + " endpoint" + (eps.length === 1 ? "" : "s") + " · " + svc.type);
  const msg = {
    ClusterIP: "ClusterIP: the Service is reachable only from inside the cluster. frontend looks up 'backend' in CoreDNS, gets 10.96.0.20, and kube-proxy on its node rewrites that to a pod IP.",
    NodePort: "NodePort: every node also opens port 30080. Traffic from outside can hit either node; kube-proxy there sends it to any endpoint, even one on the other node.",
    LoadBalancer: "LoadBalancer: the cloud gives the Service an outside address and spreads traffic over the NodePorts it opened on every node.",
  }[svc.type];
  setText(ui.status, msg);
  ui.type.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === svc.type)));
  setText(ui.scale, "replicas " + svc.replicas);
  setText(document.getElementById("sv-type"), svc.type);
  const rows = backends.filter((b) => !b.gone).sort((a, b) => a.id - b.id).map((b) => "<tr><td>backend-" + b.id + "</td><td>" + NODES[b.node].name + "</td><td>" + b.ip + "</td><td data-tone='" + (b.ready ? "good" : "") + "'>" + (b.ready ? "in endpoints" : "starting") + "</td></tr>").join("");
  if (ui.rows.__h !== rows) { ui.rows.innerHTML = rows; ui.rows.__h = rows; }
}

const A = animate({
  tick(dt) { reconcile(dt); sendTraffic(dt); net.step(dt); draw(dt); },
  tour: [
    { hold: 7 }, { type: "NodePort" }, { hold: 9 }, { type: "LoadBalancer" }, { hold: 9 },
    { del: true }, { hold: 6 }, { scale: 4 }, { hold: 6 }, { scale: 3 }, { type: "ClusterIP" }, { hold: 4 },
  ],
  act(s) { if (s.type) svc.type = s.type; if (s.del) deleteOne(); if (s.scale) svc.replicas = s.scale; },
});
controls({
  type: (b) => { svc.type = b.dataset.type; },
  up: () => { svc.replicas = Math.min(4, svc.replicas + 1); },
  down: () => { svc.replicas = Math.max(0, svc.replicas - 1); },
  del: () => deleteOne(),
}, A.takeOver);
draw(0);
`;

const controls = `<div class="lx-controls" role="group" aria-label="Service controls">
  <button type="button" data-do="type" data-type="ClusterIP" aria-pressed="true">ClusterIP</button>
  <button type="button" data-do="type" data-type="NodePort" aria-pressed="false">NodePort</button>
  <button type="button" data-do="type" data-type="LoadBalancer" aria-pressed="false">LoadBalancer</button>
  <span class="lx-pair"><span id="sv-scale">replicas 3</span><button type="button" data-do="down" aria-label="Scale down">−</button><button type="button" data-do="up" aria-label="Scale up">+</button></span>
  <button type="button" data-do="del" class="is-danger">Delete a backend pod</button>
  <p class="lx-status" id="sv-status" aria-live="polite"></p>
</div>
<div class="lx-table-wrap"><table class="lx-table"><thead><tr><th>Pod</th><th>Node</th><th>Pod IP</th><th>Service</th></tr></thead><tbody id="sv-rows"></tbody></table></div>
<pre class="lx-yaml"><b>apiVersion:</b> v1
<b>kind:</b> Service
<b>metadata:</b> { name: backend }
<b>spec:</b>
  <b>type:</b> <mark id="sv-type">ClusterIP</mark>          # or NodePort, LoadBalancer
  <b>selector:</b> { app: backend }  # which pods are endpoints
  <b>ports:</b> [{ port: 80, targetPort: 8080 }]</pre>`;

writeLesson({
  slug: "services",
  pageTitle: "Pod Networking & Services",
  fig: "Fig 6",
  title: "Pod networking & Services",
  hint: "Switch the Service type below",
  readout: "backend → 10.96.0.20 · 3 endpoints · ClusterIP",
  label:
    "Pod networking and Services drawn as two node trays joined by a bridge, the pod network. Every pod crate has its own IP. The frontend asks the CoreDNS pod for 'backend' and gets the ClusterIP 10.96.0.20, then sends to it; kube-proxy, a switch on each node, rewrites that address to the IP of one ready backend pod, which may be on the other node. A ledger at the back is the Service's EndpointSlice. In NodePort and LoadBalancer modes, outside traffic enters through port 30080 on the node trays, through a cloud load balancer in the second case.",
  keys: [
    { mark: "lit", label: "Solid dot: a packet addressed to a pod IP" },
    { mark: "edge", label: "Ringed dot: addressed to the Service's ClusterIP (or a DNS query), before kube-proxy rewrites it" },
    { mark: "raised", label: "Ledger at the back: the EndpointSlice, one lamp per ready pod IP" },
  ],
  caption:
    "Every pod gets its own IP from its node's range, and any pod can reach any other directly over the pod network. Pods come and go and change IPs, so clients use a Service instead: a stable name in cluster DNS and a stable virtual IP. The Service selects pods by label and lists the ready ones in its EndpointSlice; kube-proxy on every node turns traffic for the virtual IP into traffic for one of those pod IPs. NodePort opens the same port on every node for outside traffic, and LoadBalancer puts a cloud load balancer in front of those ports.",
  body,
  controls,
  live,
});
