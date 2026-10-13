import { k, scene, RUNTIME, writeLesson } from "../shared.mjs";

const PLATE = { x: -170, y: -84, w: 360, d: 156, r: 9 };
const ROW_Y = -26;
const PODS = [
  { id: "web-1", x: 70, svc: "web" },
  { id: "web-2", x: 34, svc: "web" },
  { id: "api", x: -10, svc: "api" },
  { id: "admin", x: -56, svc: "admin" },
  { id: "db", x: -120, svc: "db" },
];
const CR = (x) => ({ x: x - 15, y: ROW_Y - 12, w: 30, d: 24, r: 0.8 });
const CRATE_H = 14;
const FRONT = ROW_Y + 12, BACK = ROW_Y - 12;
const LANE = 40, BACKLANE = -58;
const ING = { x: 116, y: 6, w: 52, d: 44, r: 3 };
const ING_H = 22;
const BOARD = { x: -168 + 10, y: 18, w: 70, d: 40, r: 3 };
const BOARD_H = 8;
const FZ = 1.9;

const C = scene({ width: 660, height: 390, elevation: 34, pad: 14, fit: [...k.boxCorners(PLATE, -17, 0), [210, 28, 10]] });
const { P, at, S, L, D, byDepth, plate, housing, crate, lampSvg, topText, frontText, faceRect, inlay } = C;

function lanes() {
  const out = [];
  out.push(inlay({ x: PODS[3].x - 2.4, y: LANE - 2.4, w: ING.x - PODS[3].x + 4, d: 4.8, r: 0.8 }, { groove: false }));
  for (const p of PODS) if (p.svc !== "db") out.push(inlay({ x: p.x - 2.4, y: FRONT + 1.8, w: 4.8, d: LANE - FRONT, r: 0.8 }, { groove: false }));
  out.push(inlay({ x: PODS[4].x - 2.4, y: BACKLANE - 2.4, w: PODS[0].x - PODS[4].x + 4.8, d: 4.8, r: 0.8 }, { groove: false }));
  for (const p of PODS) out.push(inlay({ x: p.x - 2.4, y: BACKLANE, w: 4.8, d: BACK - BACKLANE, r: 0.8 }, { groove: false }));
  return out.join("");
}
function pod(p, i) {
  const pl = CR(p.x);
  const out = [crate(pl, 0, CRATE_H, { ribs: 4, doors: false })];
  out.push(topText(pl.x + 2, pl.y + 9, CRATE_H, p.id, { size: 3.6, tone: "hi" }));
  out.push(topText(pl.x + 2, pl.y + 15, CRATE_H, `app=${p.svc}`, { size: 2.8, tone: "mid" }));
  // the pod's door: lit when traffic is let in, red when a policy drops it
  out.push(lampSvg(pl.x + pl.w - 5, pl.y + 5, CRATE_H, { r: 1.3, attr: `data-door="${i}"`, cls: "ig-door" }));
  return `<g data-pod="${i}">${out.join("")}</g>`;
}
function ingress() {
  const out = [housing(ING, 0, ING_H, { seam: 0.35 })];
  const fx = ING.x + ING.w;
  out.push(S(k.slabOf({ x: fx, y: 22, w: 1.8, d: 12, r: 1 }, 6, 12, P, 2, 0.3), { tone: "mid" }));
  out.push(L(k.sideRing([fx + 1.8, 28, 12], 4, "x", P, 26), { tone: "mid" }));
  out.push(L(k.sideRing([fx + 1.8, 28, 12], 2.4, "x", P, 20), { tone: "lo" }));
  const card = { x: ING.x + 3, y: ING.y + 3, w: ING.w - 6, d: 30, r: 1 };
  out.push(S(k.slabOf(card, ING_H, 0.6, P, 2), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(card, 1), ING_H + 0.6, P, 2), { tone: "faint" }));
  [["shop.example.com /", "→ web"], ["shop.example.com /api", "→ api"], ["admin.example.com /", "→ admin"], ["anything else", "→ 404"]].forEach(([r, t], n) => {
    const y = card.y + 6.5 + n * 6.6;
    out.push(lampSvg(card.x + 3, y - 1.2, ING_H + 0.6, { r: 0.9, attr: `data-rule="${n}"` }));
    out.push(topText(card.x + 6, y, ING_H + 0.6, r, { size: 2.4, tone: "hi" }));
    out.push(topText(card.x + 34, y, ING_H + 0.6, t, { size: 2.4, tone: "mid" }));
  });
  out.push(topText(ING.x + 3, ING.y + ING.d - 4, ING_H, "ingress-nginx · TLS shop-cert", { size: 2.6, tone: "mid" }));
  out.push(frontText(ING.x + 3, ING.y + ING.d, 5, "Ingress controller", { size: 3, tone: "hi" }));
  return out.join("");
}
function board() {
  const out = [housing(BOARD, 0, BOARD_H, { seam: 0.5 })];
  out.push(topText(BOARD.x + 3, BOARD.y + 7, BOARD_H, "NetworkPolicy (ns shop)", { size: 3, tone: "hi" }));
  ["default-deny ingress", "allow ingress-nginx → web, api, admin", "allow web → api", "allow api → db"].forEach((r, n) => {
    const y = BOARD.y + 14 + n * 6.6;
    out.push(lampSvg(BOARD.x + 4, y - 1.2, BOARD_H, { r: 1, attr: `data-np="${n}"` }));
    out.push(topText(BOARD.x + 7.5, y, BOARD_H, r, { size: 2.6, tone: "mid" }));
  });
  return out.join("");
}

const body = [
  plate(PLATE, { ruler: false }),
  lanes(),
  `<g data-lane="back"></g>`,
  PODS.map(pod).join(""),
  board(),
  `<g data-lane="front"></g>`,
  ingress(),
  `<g data-lane="out"></g>`,
].join("");

const live = `
const P = ${JSON.stringify(P)};
${RUNTIME}
const PODS = ${JSON.stringify(PODS)}, FRONT = ${FRONT}, BACK = ${BACK}, LANE = ${LANE}, BACKLANE = ${BACKLANE}, ING = ${JSON.stringify(ING)}, FZ = ${FZ};
const ui = { status: document.getElementById("ig-status"), mode: [...document.querySelectorAll("[data-mode]")], log: document.getElementById("ig-log") };
const lanes = { back: $('[data-lane="back"]'), front: $('[data-lane="front"]'), out: $('[data-lane="out"]') };
const inIng = ([x, y]) => x > ING.x && x < ING.x + ING.w && y > ING.y && y < ING.y + ING.d;
const laneOf = ([x, y]) => (x > ING.x + ING.w - 0.5 ? lanes.out : y < BACK + 1 ? lanes.back : lanes.front);
const idx = (id) => PODS.findIndex((p) => p.id === id);

// ---- policy ----
let mode = "off"; // off | deny | allow
const ALLOW = new Set(["ingress>web", "ingress>api", "ingress>admin", "web>api", "api>db"]);
const permitted = (from, toSvc) => mode === "off" || (mode === "allow" && ALLOW.has(from + ">" + toSvc));

// ---- traffic ----
const doors = PODS.map(() => ({ ok: 0, bad: 0 }));
const rules = [0, 0, 0, 0];
const log = [];
const note = (t) => { log.unshift(t); log.length = Math.min(log.length, 6); };
const net = packets({ speed: 120, layer: laneOf, onArrive: arrive });
let rr = 0, extT = 0, intT = 0.4, extN = 0, intN = 0;
const ext = [
  { host: "shop.example.com", path: "/", svc: "web", rule: 0 },
  { host: "shop.example.com", path: "/api/cart", svc: "api", rule: 1 },
  { host: "admin.example.com", path: "/", svc: "admin", rule: 2 },
  { host: "shop.example.com", path: "/", svc: "web", rule: 0 },
  { host: "evil.example", path: "/", svc: null, rule: 3 },
];
const internal = [["web", "api"], ["api", "db"], ["web", "db"]];
function sendExternal() {
  const r = ext[extN++ % ext.length];
  const entry = [[214, 28, 12], [ING.x + ING.w / 2, 28, 12]];
  net.add(entry, { step: "edge", r, hide: inIng }, "is-alt");
}
function arrive(d) {
  if (d.step === "edge") {
    rules[d.r.rule] = 1;
    if (!d.r.svc) { note("404  " + d.r.host + d.r.path + "  (no rule matches; default backend)"); return; }
    const target = d.r.svc === "web" ? PODS.filter((p) => p.svc === "web")[rr++ % 2] : PODS.find((p) => p.svc === d.r.svc);
    const pts = [[ING.x + 6, LANE, FZ], [target.x, LANE, FZ], [target.x, FRONT + 1.8, FZ]];
    net.add(pts, { step: "deliver", from: "ingress", to: target, label: d.r.host + d.r.path });
  } else if (d.step === "deliver") {
    const i = idx(d.to.id);
    if (permitted(d.from, d.to.svc)) { doors[i].ok = 1; note("200  " + d.from + " → " + d.to.id + (d.label ? "  " + d.label : "")); }
    else { doors[i].bad = 1; note("DROP " + d.from + " → " + d.to.id + "  (no policy allows it)"); }
  }
}
function sendInternal() {
  const [a, b] = internal[intN++ % internal.length];
  const src = PODS.filter((p) => p.svc === a)[intN % (a === "web" ? 2 : 1)];
  const dst = PODS.find((p) => p.svc === b);
  const pts = [[src.x, BACK - 1.8, FZ], [src.x, BACKLANE, FZ], [dst.x, BACKLANE, FZ], [dst.x, BACK - 1.8, FZ]];
  net.add(pts, { step: "deliver", from: a, to: dst }, a === "web" && b === "db" ? "is-bad" : "");
}

function step(dt) {
  if (still.matches) return;
  extT -= dt; intT -= dt;
  if (extT <= 0) { extT = 0.7; sendExternal(); }
  if (intT <= 0) { intT = 1.3; sendInternal(); }
  net.step(dt);
}
function draw(dt) {
  net.draw();
  doors.forEach((d, i) => {
    d.ok = Math.max(0, d.ok - dt * 2); d.bad = Math.max(0, d.bad - dt * 1.2);
    const el = $('[data-door="' + i + '"]');
    el.classList.toggle("is-bad", d.bad > 0);
    el.style.opacity = Math.max(0.15, d.ok, d.bad).toFixed(2);
  });
  rules.forEach((v, n) => { rules[n] = Math.max(0, v - dt * 2); $('[data-rule="' + n + '"]').style.opacity = Math.max(0.15, rules[n]).toFixed(2); });
  [0, 1, 2, 3].forEach((n) => { $('[data-np="' + n + '"]').style.opacity = mode === "off" ? 0.12 : mode === "deny" ? (n === 0 ? 1 : 0.12) : 1; });
  ui.mode.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  const text = {
    off: "No NetworkPolicy: every pod accepts traffic from anywhere, including web → db, which a compromised web pod could abuse.",
    deny: "Default deny only: no pod accepts any incoming traffic, not even from the Ingress controller. The site is down. Policies are allow-lists, so you must add what is allowed.",
    allow: "Default deny plus allow rules: the Ingress controller reaches web, api and admin; web reaches api; api reaches db. web → db is dropped at db's door.",
  }[mode];
  setText(ui.status, text);
  ui.status.dataset.tone = mode === "deny" ? "bad" : mode === "allow" ? "good" : "";
  setText(ui.log, log.join("\\n"));
  say("policy: " + (mode === "off" ? "none" : mode === "deny" ? "deny all" : "allow-list"));
}

const A = animate({
  tick(dt) { step(dt); draw(dt); },
  tour: [{ hold: 8 }, { mode: "deny" }, { hold: 7 }, { mode: "allow" }, { hold: 10 }, { mode: "off" }],
  act(s) { if (s.mode) mode = s.mode; },
});
controls({ mode: (b) => { mode = b.dataset.mode; } }, A.takeOver);
draw(0);
`;

const controls = `<div class="lx-controls" role="group" aria-label="NetworkPolicy mode">
  <button type="button" data-do="mode" data-mode="off" aria-pressed="true">No policies</button>
  <button type="button" data-do="mode" data-mode="deny" aria-pressed="false" class="is-danger">Default deny</button>
  <button type="button" data-do="mode" data-mode="allow" aria-pressed="false">Default deny + allow rules</button>
  <p class="lx-status" id="ig-status" aria-live="polite"></p>
</div>
<pre class="lx-yaml" id="ig-log" aria-live="polite"></pre>
<pre class="lx-yaml"><b>kind:</b> Ingress
<b>spec:</b>
  <b>tls:</b> [{ hosts: [shop.example.com], secretName: shop-cert }]
  <b>rules:</b>
  - host: shop.example.com
    http: { paths: [{ path: /, backend: web:80 }, { path: /api, backend: api:80 }] }
  - host: admin.example.com
    http: { paths: [{ path: /, backend: admin:80 }] }
---
<b>kind:</b> NetworkPolicy        # allow api → db (plus a default-deny policy)
<b>spec:</b> { <b>podSelector:</b> { matchLabels: { app: db } }, <b>policyTypes:</b> [Ingress],
        <b>ingress:</b> [{ from: [{ podSelector: { matchLabels: { app: api } } }] }] }</pre>`;

writeLesson({
  slug: "ingress",
  pageTitle: "Ingress & NetworkPolicy",
  fig: "Fig 7",
  title: "Ingress & NetworkPolicy",
  hint: "Switch the policy mode below",
  readout: "policy: none",
  width: 660,
  height: 390,
  label:
    "Ingress and NetworkPolicy drawn as a row of five pod crates, web-1, web-2, api, admin and db, with an Ingress controller at the right edge. Outside requests arrive at its TLS port and are routed by the rule card on its top, by host and path, along a front lane to the pods; requests for unknown hosts end with a 404. Pods also call each other along a back lane. A NetworkPolicy board on the left lists a default deny rule and three allow rules; each pod's lid lamp lights when traffic is let in and turns red when a policy drops it.",
  keys: [
    { mark: "edge", label: "Ringed dot: an outside HTTPS request, until the Ingress terminates TLS" },
    { mark: "lit", label: "Pod lamp: traffic let in" },
    { mark: "red", label: "Red: web → db, dropped when the allow-list does not include it" },
  ],
  caption:
    "An Ingress is a set of HTTP routing rules, by host name and path, to Services; an Ingress controller, here ingress-nginx, is the proxy that reads them, terminates TLS with a certificate from a Secret, and forwards requests into the cluster. NetworkPolicy works the other way, inside the cluster: by default every pod accepts traffic from every other pod. Once a policy selects a pod, only the traffic some policy allows gets in, so the usual pattern is a default-deny policy plus narrow allow rules, such as letting only api talk to db.",
  body,
  controls,
  css: `.ig-door.is-bad .iso-top, .ig-door.is-bad .iso-fill, .ig-door.is-bad .iso-shade { fill: var(--anatomy-red); } #ig-log { min-height: 8.5em; }`,
  live,
});
