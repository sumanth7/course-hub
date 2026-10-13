import { k, scene, RUNTIME, writeLesson } from "../shared.mjs";

const PLATE = { x: -170, y: -96, w: 340, d: 176, r: 9 };
const GATE = { x: -22, y: -6, w: 44, d: 26, r: 3 };
const GATE_H = 18;
const RES = [
  { id: "pods", x: -96 },
  { id: "deployments", x: -40 },
  { id: "secrets", x: 16 },
  { id: "nodes", x: 72 },
];
const RES_PL = (x) => ({ x: x - 24, y: -48, w: 48, d: 20, r: 2 });
const RES_H = 10;
const ROLES = [
  { id: "pod-reader", kind: "Role · dev", rules: ["pods: get, list, watch"], x: -142 },
  { id: "deployer", kind: "Role · dev", rules: ["deployments: get, list, create,", "  update, delete", "pods: get, list"], x: -46 },
  { id: "cluster-viewer", kind: "ClusterRole", rules: ["nodes, pods: get, list", "(all namespaces)"], x: 50 },
];
const CARD = (x) => ({ x, y: -88, w: 88, d: 30, r: 1.5 });
const BOARD = { x: -150, y: -92, w: 300, d: 38, r: 3 };
const BOARD_H = 8;
const SUBJ = [
  { id: "alice", what: "User", x: -112 },
  { id: "ci-bot", what: "ServiceAccount", x: -16 },
  { id: "monitor", what: "ServiceAccount", x: 84 },
];
const SUBJ_PL = (x) => ({ x: x - 22, y: 40, w: 44, d: 26, r: 1.5 });
const SUBJ_H = 12;
const LANE = 32, FZ = 1.9;

const C = scene({ width: 660, height: 420, elevation: 36, pad: 12, fit: [...k.boxCorners(PLATE, -17, 0)] });
const { P, at, S, L, D, byDepth, plate, housing, crate, lampSvg, topText, frontText, faceRect, inlay } = C;

function board() {
  const out = [housing(BOARD, 0, BOARD_H, { seam: 0.5 })];
  ROLES.forEach((r, i) => {
    const c = CARD(r.x);
    out.push(S(k.slabOf(c, BOARD_H, 0.8, P, 2), { tone: "hi", crease: "lo" }));
    out.push(topText(c.x + 3, c.y + 6, BOARD_H + 0.8, r.id, { size: 3.4, tone: "hi" }));
    out.push(topText(c.x + 50, c.y + 6, BOARD_H + 0.8, r.kind, { size: 2.4, tone: "mid" }));
    r.rules.forEach((t, n) => out.push(topText(c.x + 3, c.y + 12 + n * 4.4, BOARD_H + 0.8, t, { size: 2.5, tone: "mid" })));
    // badge hooks along the card's front edge: one per subject
    SUBJ.forEach((s, n) => {
      const bx = c.x + 8 + n * 26;
      out.push(S(k.cylinder(bx, c.y + c.d - 4, 0.9, BOARD_H + 0.8, 1, P, 10), { tone: "lo" }));
      out.push(`<g data-badge="${i}-${n}" style="opacity:0">${S(k.slabOf({ x: bx - 9, y: c.y + c.d - 3, w: 18, d: 9, r: 1 }, BOARD_H + 0.8, 1.4, P, 2, 0.3), { tone: "hi", lit: true })}${topText(bx - 7.6, c.y + c.d + 3.4, BOARD_H + 2.2, s.id, { size: 2.6, tone: "hi" })}</g>`);
    });
  });
  out.push(frontText(BOARD.x + 4, BOARD.y + BOARD.d, 2, "RBAC: Roles, with RoleBindings shown as badges", { size: 2.8, tone: "mid" }));
  return out.join("");
}
function resources() {
  return RES.map((r) => {
    const pl = RES_PL(r.x);
    return housing(pl, 0, RES_H, { seam: 0.5, plinth: false }) + topText(pl.x + 3, pl.y + 12, RES_H, r.id, { size: 3.4, tone: "hi" }) + lampSvg(pl.x + pl.w - 4, pl.y + 4, RES_H, { r: 1.1, attr: `data-res="${r.id}"` });
  }).join("");
}
function gate() {
  const out = [housing(GATE, 0, GATE_H, { seam: 0.45 })];
  const c = [GATE.x + 14, GATE.y + 13];
  out.push(S(k.cylinder(c[0], c[1], 6, GATE_H, 2, P, 32), { tone: "lo" }));
  out.push(S(k.cylinder(c[0], c[1], 2.2, GATE_H + 2, 4, P, 20), { tone: "mid" }));
  out.push(`<path data-arms class="iso-line" data-tone="hi" data-free="end" d="" style="stroke-width:1.3"/>`);
  out.push(lampSvg(GATE.x + 32, GATE.y + 7, GATE_H, { r: 1.4, attr: "data-allow" }));
  out.push(lampSvg(GATE.x + 32, GATE.y + 17, GATE_H, { r: 1.4, attr: "data-deny", cls: "sc-red" }));
  out.push(frontText(GATE.x + 3, GATE.y + GATE.d, 4, "API server: authn → RBAC → admission", { size: 2.6, tone: "hi" }));
  return out.join("");
}
const arms = (a) => {
  const c = [GATE.x + 14, GATE.y + 13];
  return [0, 1, 2].map((n) => k.lineOnTop([c[0] + Math.cos(a + (n * 2 * Math.PI) / 3) * 2.2, c[1] + Math.sin(a + (n * 2 * Math.PI) / 3) * 2.2], [c[0] + Math.cos(a + (n * 2 * Math.PI) / 3) * 9, c[1] + Math.sin(a + (n * 2 * Math.PI) / 3) * 9], GATE_H + 5, P)).join("");
};
function subjects() {
  return SUBJ.map((s, n) => {
    const pl = SUBJ_PL(s.x);
    const out = [s.id === "alice" ? housing(pl, 0, SUBJ_H, { seam: 0.5 }) : crate(pl, 0, SUBJ_H, { ribs: 4, doors: false })];
    out.push(topText(pl.x + 3, pl.y + 9, SUBJ_H, s.id, { size: 3.8, tone: "hi" }));
    out.push(topText(pl.x + 3, pl.y + 15, SUBJ_H, s.what, { size: 2.6, tone: "mid" }));
    if (s.id !== "alice") out.push(topText(pl.x + 3, pl.y + 20.5, SUBJ_H, "token mounted", { size: 2.4, tone: "lo" }));
    out.push(lampSvg(pl.x + pl.w - 4.5, pl.y + 4.5, SUBJ_H, { r: 1.1, attr: `data-subj="${n}"` }));
    return out.join("");
  }).join("");
}

const body = [
  plate(PLATE, { ruler: false }),
  board(),
  inlay({ x: RES[0].x - 2.4, y: -16.4, w: RES[3].x - RES[0].x + 4.8, d: 4.8, r: 0.8 }, { groove: false }),
  ...RES.map((r) => inlay({ x: r.x - 2.4, y: -28, w: 4.8, d: 14, r: 0.8 }, { groove: false })),
  inlay({ x: SUBJ[0].x - 2.4, y: LANE - 2.4, w: SUBJ[2].x - SUBJ[0].x + 4.8, d: 4.8, r: 0.8 }, { groove: false }),
  ...SUBJ.map((s) => inlay({ x: s.x - 2.4, y: 22, w: 4.8, d: 18, r: 0.8 }, { groove: false })),
  `<g data-lane="back"></g>`,
  resources(),
  gate(),
  `<g data-lane="front"></g>`,
  subjects(),
].join("");

const live = `
const P = ${JSON.stringify(P)};
${RUNTIME}
const GATE = ${JSON.stringify(GATE)}, GATE_H = ${GATE_H}, RES = ${JSON.stringify(RES)}, SUBJ = ${JSON.stringify(SUBJ)}, LANE = ${LANE}, FZ = ${FZ};
const arms = ${arms.toString().replace(/k\./g, "")};
const ui = { status: document.getElementById("rb-status"), log: document.getElementById("rb-log"), bind: document.getElementById("rb-bind"), pss: document.getElementById("rb-pss"), who: [...document.querySelectorAll("[data-who]")] };
const lanes = { back: $('[data-lane="back"]'), front: $('[data-lane="front"]') };
const inGate = ([x, y]) => x > GATE.x && x < GATE.x + GATE.w && y > GATE.y && y < GATE.y + GATE.d;
const laneOf = ([x, y]) => (y < GATE.y ? lanes.back : lanes.front);

// ---- RBAC ----
const RULES = {
  "pod-reader": [{ res: "pods", verbs: ["get", "list", "watch"], ns: "dev" }],
  deployer: [{ res: "deployments", verbs: ["get", "list", "create", "update", "delete"], ns: "dev" }, { res: "pods", verbs: ["get", "list"], ns: "dev" }],
  "cluster-viewer": [{ res: "nodes", verbs: ["get", "list"], ns: "*" }, { res: "pods", verbs: ["get", "list"], ns: "*" }],
};
const ROLE_IDS = ["pod-reader", "deployer", "cluster-viewer"];
const bindings = { alice: new Set(["deployer"]), "ci-bot": new Set(), monitor: new Set(["cluster-viewer"]) };
let pss = false, who = "alice", busy = 0, verdict = null, verdictT = 0, armA = 0, msg = "";
const log = [];
function can(subject, verb, res, ns) {
  for (const role of bindings[subject]) for (const r of RULES[role]) if (r.res === res && r.verbs.includes(verb) && (r.ns === "*" || r.ns === ns)) return role;
  return null;
}
const net = packets({ speed: 120, layer: laneOf, onArrive: arrive });
function request(subject, verb, res, ns = "dev", extra = null) {
  const s = SUBJ.find((q) => q.id === subject);
  net.add([[s.x, 40 - 1.8, FZ], [s.x, LANE, FZ], [GATE.x + 22, LANE, FZ], [GATE.x + 22, 12, FZ]], { step: "gate", subject, verb, res, ns, extra, hide: inGate });
  subjFlash[SUBJ.indexOf(s)] = 1;
}
const subjFlash = [0, 0, 0];
const resFlash = {};
function arrive(d) {
  if (d.step === "gate") {
    const role = can(d.subject, d.verb, d.res, d.ns);
    const sa = d.subject === "alice" ? "" : "system:serviceaccount:dev:" ;
    let line = "";
    if (!role) {
      verdict = "deny"; verdictT = 1.2;
      line = "403 Forbidden  " + sa + d.subject + " cannot " + d.verb + " " + d.res + (d.ns === "*" ? " at the cluster scope" : " in namespace " + d.ns);
      msg = "RBAC denied it: no Role bound to " + d.subject + " allows " + d.verb + " on " + d.res + ". RBAC only ever adds permissions; anything not granted is denied.";
    } else if (d.extra === "privileged" && pss) {
      verdict = "deny"; verdictT = 1.2;
      line = "Warning: would violate PodSecurity \\"restricted\\"\\ndeployment.apps/debug created\\n  replicaset: Error creating: pods \\"debug-6f9c\\" is forbidden: violates PodSecurity \\"restricted\\": privileged";
      msg = "RBAC allowed the Deployment (via " + role + "), but its pods are rejected at admission: namespace dev enforces Pod Security 'restricted', which forbids privileged containers and running as root.";
    } else {
      verdict = "allow"; verdictT = 1.2; busy = 1;
      line = "200 OK  " + d.subject + " " + d.verb + " " + d.res + "  (granted by " + role + ")";
      msg = d.subject + " is allowed to " + d.verb + " " + d.res + " through the " + role + " role.";
      const r = RES.find((q) => q.id === d.res);
      net.add([[GATE.x + 22, GATE.y - 0.5, FZ], [GATE.x + 22, -14, FZ], [r.x, -14, FZ], [r.x, -28 + 0.5, FZ]], { step: "res", res: d.res });
    }
    log.unshift("$ kubectl " + (d.subject === "alice" ? "" : "--as=" + sa + d.subject + " ") + d.verb + " " + d.res + (d.ns === "*" ? " -A" : " -n " + d.ns) + (d.extra ? "  # privileged pod" : "") + "\\n" + line);
    log.length = Math.min(log.length, 4);
  } else if (d.step === "res") resFlash[d.res] = 1;
}
const ACTIONS = {
  "get-pods": ["get", "pods", "dev"],
  "delete-pods": ["delete", "pods", "dev"],
  "create-deploy": ["create", "deployments", "dev"],
  "get-secrets": ["get", "secrets", "dev"],
  "list-nodes": ["list", "nodes", "*"],
};
function tryAction(a) { const [v, r, ns] = ACTIONS[a]; request(who, v, r, ns); }
function privileged() { request(who, "create", "deployments", "dev", "privileged"); }
function toggleBind() { if (bindings["ci-bot"].has("deployer")) bindings["ci-bot"].delete("deployer"); else bindings["ci-bot"].add("deployer"); msg = bindings["ci-bot"].has("deployer") ? "RoleBinding ci-bot-deployer: ci-bot's ServiceAccount now holds the deployer role in dev. Its pods can deploy." : "Binding removed: ci-bot is back to no permissions."; }
function togglePss() { pss = !pss; msg = pss ? "Namespace dev now enforces Pod Security 'restricted' (label pod-security.kubernetes.io/enforce=restricted)." : "Pod Security enforcement off for dev."; }

function draw(dt) {
  net.draw();
  armA += busy * dt * 9; busy = Math.max(0, busy - dt * 1.5);
  $("[data-arms]").setAttribute("d", arms(armA));
  verdictT = Math.max(0, verdictT - dt);
  $("[data-allow]").style.opacity = verdict === "allow" && verdictT > 0 ? 1 : 0.12;
  $("[data-deny]").style.opacity = verdict === "deny" && verdictT > 0 ? 1 : 0.12;
  ROLE_IDS.forEach((role, i) => SUBJ.forEach((s, n) => { $('[data-badge="' + i + "-" + n + '"]').style.opacity = bindings[s.id].has(role) ? 1 : 0; }));
  SUBJ.forEach((s, n) => { subjFlash[n] = Math.max(0, subjFlash[n] - dt); $('[data-subj="' + n + '"]').style.opacity = s.id === who ? 1 : Math.max(0.12, subjFlash[n]); });
  RES.forEach((r) => { resFlash[r.id] = Math.max(0, (resFlash[r.id] || 0) - dt); $('[data-res="' + r.id + '"]').style.opacity = Math.max(0.12, resFlash[r.id]).toFixed(2); });
  ui.who.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.who === who)));
  setText(ui.bind, bindings["ci-bot"].has("deployer") ? "Unbind ci-bot from deployer" : "Bind ci-bot to deployer");
  setText(ui.pss, "Pod Security restricted: " + (pss ? "on" : "off"));
  ui.pss.setAttribute("aria-pressed", String(pss));
  setText(ui.status, msg || "Pick who is asking, then try an action. Each request passes authentication, then RBAC, then admission.");
  ui.status.dataset.tone = /denied|rejected/.test(msg) ? "bad" : /allowed|now holds/.test(msg) ? "good" : "";
  setText(ui.log, log.join("\\n\\n"));
  say("acting as " + who + " · " + ([...bindings[who]].join(", ") || "no roles"));
}

const A = animate({
  tick(dt) { net.step(dt); draw(dt); },
  tour: [
    { hold: 2 }, { who: "alice", a: "create-deploy" }, { hold: 3 }, { a: "get-secrets" }, { hold: 3 }, { a: "delete-pods" }, { hold: 3 },
    { who: "ci-bot", a: "create-deploy" }, { hold: 3 }, { bind: 1 }, { hold: 2 }, { a: "create-deploy" }, { hold: 3 },
    { who: "monitor", a: "list-nodes" }, { hold: 3 }, { a: "delete-pods" }, { hold: 3 },
    { who: "alice", pss: 1 }, { hold: 1 }, { priv: 1 }, { hold: 4 }, { pss: 1 }, { bind: 1 }, { hold: 2 },
  ],
  act(s) { if (s.who) who = s.who; if (s.a) tryAction(s.a); if (s.bind) toggleBind(); if (s.pss) togglePss(); if (s.priv) privileged(); },
});
controls({
  who: (b) => { who = b.dataset.who; },
  act: (b) => tryAction(b.dataset.a),
  bind: toggleBind,
  pss: togglePss,
  priv: privileged,
}, A.takeOver);
draw(0);
`;

const controls = `<div class="lx-controls" role="group" aria-label="Acting as">
  <button type="button" data-do="who" data-who="alice" aria-pressed="true">as alice</button>
  <button type="button" data-do="who" data-who="ci-bot" aria-pressed="false">as ci-bot (SA)</button>
  <button type="button" data-do="who" data-who="monitor" aria-pressed="false">as monitor (SA)</button>
</div>
<div class="lx-controls" role="group" aria-label="Try an action">
  <button type="button" data-do="act" data-a="get-pods">get pods</button>
  <button type="button" data-do="act" data-a="delete-pods">delete pods</button>
  <button type="button" data-do="act" data-a="create-deploy">create deployment</button>
  <button type="button" data-do="act" data-a="get-secrets">get secrets</button>
  <button type="button" data-do="act" data-a="list-nodes">list nodes</button>
  <button type="button" data-do="priv" class="is-danger">create a privileged pod</button>
</div>
<div class="lx-controls" role="group" aria-label="Change permissions">
  <button type="button" data-do="bind" id="rb-bind">Bind ci-bot to deployer</button>
  <button type="button" data-do="pss" id="rb-pss" aria-pressed="false">Pod Security restricted: off</button>
  <p class="lx-status" id="rb-status" aria-live="polite"></p>
</div>
<pre class="lx-yaml" id="rb-log" aria-live="polite"></pre>
<pre class="lx-yaml"><b>kind:</b> Role
<b>metadata:</b> { name: deployer, namespace: dev }
<b>rules:</b>
- { apiGroups: [apps], resources: [deployments], verbs: [get, list, create, update, delete] }
- { apiGroups: [""],   resources: [pods],        verbs: [get, list] }
---
<b>kind:</b> RoleBinding
<b>metadata:</b> { name: ci-bot-deployer, namespace: dev }
<b>subjects:</b> [{ kind: ServiceAccount, name: ci-bot, namespace: dev }]
<b>roleRef:</b>  { kind: Role, name: deployer }</pre>`;

writeLesson({
  slug: "security",
  pageTitle: "ServiceAccounts & RBAC",
  fig: "Fig 14",
  title: "ServiceAccounts & RBAC",
  hint: "Pick who is asking and try an action below",
  readout: "acting as alice · deployer",
  width: 660,
  height: 420,
  label:
    "RBAC drawn as a gate and a permission board. The API server is a turnstile gate in the middle; behind it stand four resource boxes, pods, deployments, secrets and nodes. At the back, a board holds three Role cards, pod-reader, deployer and cluster-viewer, each listing its rules; keycard badges hanging on a card show who is bound to it. In front stand the three subjects that send requests: the user alice, and two pods running as ServiceAccounts, ci-bot and monitor. Allowed requests pass the gate to the resource; denied ones stop with a red lamp.",
  keys: [
    { mark: "lit", label: "Badge on a Role card: a RoleBinding giving that subject the role" },
    { mark: "red", label: "Red lamp on the gate: 403 Forbidden, from RBAC or from admission" },
    { mark: "raised", label: "Resource lamp: the request reached it" },
  ],
  caption:
    "Every request to the API server says who is asking: a user like alice, or a pod using its ServiceAccount's token. RBAC then decides what they may do. A Role lists verbs on resources in one namespace; a ClusterRole does the same cluster-wide; a RoleBinding or ClusterRoleBinding grants a role to users, groups or ServiceAccounts. There are no deny rules: anything not granted is refused with 403. After RBAC, admission can still reject a request; Pod Security 'restricted' on a namespace, for example, blocks privileged pods and containers running as root even for someone allowed to create them.",
  body,
  controls,
  css: `.sc-red .iso-top, .sc-red .iso-fill, .sc-red .iso-shade { fill: var(--anatomy-red); } #rb-log { min-height: 7em; }`,
  live,
});
