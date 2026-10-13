// Lesson 07 in 3D: an Ingress controller routing by host and path, and NetworkPolicy fences around pods.
const S = createStage({ home: { target: [10, 14, -6], dir: [0.95, 1.05, 1.1], zoom: 1 }, viewH: 250 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const ROW_Z = -26, CR = { w: 30, h: 14, d: 24 };
const PODS = [{ id: "web-1", x: 70, svc: "web" }, { id: "web-2", x: 34, svc: "web" }, { id: "api", x: -10, svc: "api" }, { id: "admin", x: -56, svc: "admin" }, { id: "db", x: -120, svc: "db" }];
const FRONT = ROW_Z + 12, BACK = ROW_Z - 12, LANE = 40, BACKLANE = -58, FY = 1.9;
const ING = { x: 142, z: 28, w: 52, d: 44, h: 22 };
const BOARD = { x: -123, z: 38, w: 70, d: 40, h: 8 };

part("plate", { kind: "Cluster", title: "Five pods in one namespace", noFrame: true, zoom: 1, anchor: V(10, 26, -6), desc: "Outside traffic arrives through the Ingress on the right and reaches pods along the front lane. Pods also call each other along the back lane.", yaml: "kubectl get ingress,networkpolicy -n shop" });
own("plate", S.plate({ x: 10, z: -6, w: 360, d: 156 }), track([[[PODS[3].x, LANE], [ING.x - 20, LANE]], ...PODS.filter((p) => p.svc !== "db").map((p) => [[p.x, FRONT + 2], [p.x, LANE]]), [[PODS[4].x, BACKLANE], [PODS[0].x, BACKLANE]], ...PODS.map((p) => [[p.x, BACKLANE], [p.x, BACK - 1]])], { width: 4.8 }));

const fenceMat = new THREE.LineBasicMaterial();
S.onTheme((p) => fenceMat.color.set(p.accent));
const pods = PODS.map((p, i) => {
  const id = part("pod-" + i, { kind: "Pod", title: `${p.id} · app=${p.svc}`, zoom: 3, anchor: V(p.x, CR.h + 14, ROW_Z),
    desc: () => { const allowed = [...ALLOW].filter((e) => e.endsWith(">" + p.svc)).map((e) => e.split(">")[0]); return mode === "off" ? "No NetworkPolicy selects this pod, so it accepts traffic from anyone." : mode === "deny" ? "A default-deny policy selects every pod, and nothing allows anything in: this pod accepts no traffic at all." : `Accepts traffic only from: <b>${allowed.join(", ") || "nobody"}</b>. Anything else is dropped at its door.`; },
    yaml: p.svc === "db" ? "kind: NetworkPolicy\nmetadata: { name: db-allow-api }\nspec:\n  podSelector: { matchLabels: { app: db } }\n  policyTypes: [Ingress]\n  ingress: [{ from: [{ podSelector: { matchLabels: { app: api } } }] }]" : "" });
  const g = crate({ w: CR.w, h: CR.h, d: CR.d, ribs: 4 });
  g.position.set(p.x, 0, ROW_Z);
  const door = lamp(10, CR.h, -7, { r: 1.4, state: "off" });
  g.add(door.mesh);
  own(id, g);
  const fence = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(-20, 0.5, -16), V(20, 0.5, -16), V(20, 0.5, 16), V(-20, 0.5, 16), V(-20, 0.5, -16)]), fenceMat);
  fence.position.set(p.x, 0, ROW_Z);
  S.world.add(fence);
  label(id, p.id);
  return { door, fence, ok: 0, bad: 0 };
});

part("ingress", { kind: "Ingress controller", title: "ingress-nginx", zoom: 2.4, anchor: V(ING.x, ING.h + 14, ING.z),
  desc: "Terminates TLS with the certificate in Secret shop-cert, then routes each request by host and path, following the Ingress rules on its top card. A host it has no rule for gets a 404 from the default backend.",
  yaml: "kind: Ingress\nspec:\n  tls: [{ hosts: [shop.example.com], secretName: shop-cert }]\n  rules:\n  - host: shop.example.com\n    http: { paths: [{ path: /, backend: web }, { path: /api, backend: api }] }\n  - host: admin.example.com\n    http: { paths: [{ path: /, backend: admin }] }" });
own("ingress", housing({ x: ING.x, z: ING.z, w: ING.w, d: ING.d, h: ING.h }), cyl(4, 1.8, { x: ING.x + ING.w / 2, y0: 12, z: ING.z, axis: "x" }), box(ING.w - 6, 0.6, 30, { x: ING.x, y0: ING.h, z: ING.z - 4, tone: "lo", r: 0.4 }));
const RULES = ["shop.example.com / → web", "shop.example.com /api → api", "admin.example.com / → admin", "anything else → 404"];
label("ingress", "Ingress");
const ruleLamps = RULES.map((r, n) => { const l = lamp(ING.x - 21, ING.h + 0.6, ING.z - 15 + n * 7, { r: 1, state: "off" }); own("ingress", l.mesh); S.label("ingress", r, { small: true, anchor: V(ING.x - 2, ING.h + 2, ING.z - 15 + n * 7), lod: 1.7 }); return l; });

part("policy", { kind: "NetworkPolicy", title: "NetworkPolicy (namespace shop)", zoom: 2.6, anchor: V(BOARD.x, BOARD.h + 12, BOARD.z),
  desc: () => ({ off: "No policies: every pod accepts traffic from everywhere.", deny: "Default deny only: nothing gets in, not even from the Ingress. The site is down.", allow: "Default deny plus allow rules: only the arrows you listed get through." }[mode]),
  yaml: "# default deny for all pods in the namespace\nkind: NetworkPolicy\nmetadata: { name: default-deny }\nspec: { podSelector: {}, policyTypes: [Ingress] }",
  actions: () => [{ label: "No policies", run: () => (mode = "off") }, { label: "Default deny", danger: true, run: () => (mode = "deny") }, { label: "Default deny + allow rules", run: () => (mode = "allow") }] });
own("policy", housing({ x: BOARD.x, z: BOARD.z, w: BOARD.w, d: BOARD.d, h: BOARD.h }));
const NP = ["default-deny ingress", "allow ingress-nginx → web, api, admin", "allow web → api", "allow api → db"];
label("policy", "NetworkPolicy");
const npLamps = NP.map((r, n) => { const l = lamp(BOARD.x - 30, BOARD.h, BOARD.z - 12 + n * 7.5, { r: 1.1, state: "off" }); own("policy", l.mesh); S.label("policy", r, { small: true, anchor: V(BOARD.x, BOARD.h + 2, BOARD.z - 12 + n * 7.5), lod: 1.6 }); return l; });

// ---- policy and traffic ----
let mode = "off";
const ALLOW = new Set(["ingress>web", "ingress>api", "ingress>admin", "web>api", "api>db"]);
const permitted = (from, svc) => mode === "off" || (mode === "allow" && ALLOW.has(from + ">" + svc));
const log = [];
const note = (t) => { log.unshift(t); log.length = Math.min(log.length, 6); };
const inIng = (q) => Math.abs(q.x - ING.x) < ING.w / 2 && Math.abs(q.z - ING.z) < ING.d / 2;
const net = S.packets({ speed: 120, onArrive: arrive });
const EXT = [{ host: "shop.example.com", path: "/", svc: "web", rule: 0 }, { host: "shop.example.com", path: "/api/cart", svc: "api", rule: 1 }, { host: "admin.example.com", path: "/", svc: "admin", rule: 2 }, { host: "shop.example.com", path: "/", svc: "web", rule: 0 }, { host: "evil.example", path: "/", svc: null, rule: 3 }];
const INTERNAL = [["web", "api"], ["api", "db"], ["web", "db"]];
let rr = 0, extT = 0, intT = 0.4, extN = 0, intN = 0;
const ruleT = [0, 0, 0, 0];
function arrive(d) {
  if (d.step === "edge") {
    ruleT[d.r.rule] = 1;
    if (!d.r.svc) { note(`404  ${d.r.host}${d.r.path}  (no rule matches)`); return; }
    const t = d.r.svc === "web" ? PODS.filter((p) => p.svc === "web")[rr++ % 2] : PODS.find((p) => p.svc === d.r.svc);
    net.add([V(ING.x - 20, FY, LANE), V(t.x, FY, LANE), V(t.x, FY, FRONT + 1.8)], { step: "deliver", from: "ingress", to: t, label: d.r.host + d.r.path });
  } else if (d.step === "deliver") {
    const i = PODS.indexOf(d.to);
    if (permitted(d.from, d.to.svc)) { pods[i].ok = 1; note(`200  ${d.from} → ${d.to.id}${d.label ? "  " + d.label : ""}`); }
    else { pods[i].bad = 1; note(`DROP ${d.from} → ${d.to.id}  (no policy allows it)`); }
  }
}
S.onTick((dt) => {
  if (!reduced()) {
    extT -= dt; intT -= dt;
    if (extT <= 0) { extT = 0.7; const r = EXT[extN++ % EXT.length]; net.add([V(206, 12, ING.z), V(ING.x, 12, ING.z)], { step: "edge", r, ring: true, hide: inIng }); }
    if (intT <= 0) { intT = 1.3; const [a, b] = INTERNAL[intN++ % INTERNAL.length]; const src = PODS.filter((p) => p.svc === a)[intN % (a === "web" ? 2 : 1)], dst = PODS.find((p) => p.svc === b); net.add([V(src.x, FY, BACK - 1.8), V(src.x, FY, BACKLANE), V(dst.x, FY, BACKLANE), V(dst.x, FY, BACK - 1.8)], { step: "deliver", from: a, to: dst, bad: a === "web" && b === "db" }); }
  }
  net.step(dt);
  pods.forEach((p) => { p.ok = Math.max(0, p.ok - dt * 2); p.bad = Math.max(0, p.bad - dt * 1.2); p.door.set(p.bad > 0 ? "bad" : p.ok > 0 ? "on" : "off"); p.fence.visible = mode !== "off"; });
  ruleLamps.forEach((l, n) => { ruleT[n] = Math.max(0, ruleT[n] - dt * 2); l.set(ruleT[n] > 0 ? (n === 3 ? "bad" : "on") : "off"); });
  npLamps.forEach((l, n) => l.set(mode === "off" ? "off" : mode === "deny" ? (n === 0 ? "on" : "off") : "on"));
  S.say("policy: " + (mode === "off" ? "none" : mode === "deny" ? "deny all" : "allow-list"));
  syncUi();
});

S.overview = () => `<h2>Ingress and NetworkPolicy</h2><p class="muted">The Ingress decides how outside traffic gets in; NetworkPolicy decides which pods may talk to which. Switch the policy mode below. Pick a part:</p>`;
const ui = { status: document.getElementById("ig-status"), mode: [...document.querySelectorAll("[data-mode]")], log: document.getElementById("ig-log") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => { S.stopTour(); mode = b.dataset.mode; S.renderPanel(); }));
function syncUi() {
  ui.mode.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  const t = { off: "No NetworkPolicy: every pod accepts traffic from anywhere, including web → db, which a compromised web pod could abuse.", deny: "Default deny only: no pod accepts anything, not even from the Ingress. Policies are allow-lists; you must add what is allowed.", allow: "Default deny plus allow rules: the Ingress reaches web, api and admin; web reaches api; api reaches db. web → db is dropped at db's door." }[mode];
  if (ui.status.textContent !== t) { ui.status.textContent = t; ui.status.dataset.tone = mode === "deny" ? "bad" : mode === "allow" ? "good" : ""; }
  const l = log.join("\n");
  if (ui.log.textContent !== l) ui.log.textContent = l;
}

// ---- what the inspector shows ----
Object.assign(S.PARTS.ingress, { manifest: () => K.ingress({ name: "shop", ns: "shop", tls: { hosts: ["shop.example.com", "admin.example.com"], secret: "shop-cert" }, rules: [{ host: "shop.example.com", paths: [{ path: "/", svc: "web" }, { path: "/api", svc: "api" }] }, { host: "admin.example.com", paths: [{ path: "/", svc: "admin" }] }] }), facts: () => [["Controller", "ingress-nginx"], ["TLS", "shop-cert"], ["Unknown hosts", "404 from the default backend"]] });
const npY = () => mode === "off" ? "# no NetworkPolicy objects in namespace shop\n$ kubectl get networkpolicy -n shop\nNo resources found in shop namespace." : K.networkpolicy({ name: "default-deny", podSelector: {}, from: null }) + (mode === "allow" ? "\n---\n" + K.networkpolicy({ name: "allow-from-ingress", podSelector: { tier: "front" }, from: ["namespaceSelector: { matchLabels: { kubernetes.io/metadata.name: ingress-nginx } }"] }) + "\n---\n" + K.networkpolicy({ name: "api-from-web", podSelector: { app: "api" }, from: ["podSelector: { matchLabels: { app: web } }"] }) + "\n---\n" + K.networkpolicy({ name: "db-from-api", podSelector: { app: "db" }, from: ["podSelector: { matchLabels: { app: api } }   # ← web → db is not listed, so it is dropped"] }) : "");
Object.assign(S.PARTS.policy, { manifest: npY, facts: () => [["Mode", { off: "no policies", deny: "default deny", allow: "deny + allow rules" }[mode]]], kubectl: "kubectl get networkpolicy -n shop\nkubectl describe networkpolicy db-from-api -n shop" });
PODS.forEach((p, i) => Object.assign(S.PARTS["pod-" + i], { manifest: () => K.pod({ name: p.id, ns: "shop", labels: { app: p.svc, ...(p.svc !== "db" ? { tier: "front" } : {}) }, node: "node-1", ip: `10.244.1.${70 + i}` }), facts: () => [["Labels", `app=${p.svc}`], ["Accepts from", mode === "off" ? "anyone" : [...ALLOW].filter((e) => e.endsWith(">" + p.svc)).map((e) => e.split(">")[0]).join(", ") || "nobody"]] }));

S.setTour([
  { home: true, say: "Five pods. Outside requests come in on the right; pods call each other along the back.", run: () => (mode = "off"), hold: 5 },
  { focus: "ingress", zoom: 2.4, say: "The Ingress controller ends TLS (the ring comes off) and routes by host and path. An unknown host gets a 404.", hold: 7 },
  { focus: "pod-4", zoom: 2.6, say: "With no NetworkPolicy, anything reaches anything: even web → db (the red dot), which only api should do.", hold: 7 },
  { focus: "policy", zoom: 2.4, say: "Turn on default deny: every pod is fenced in and nothing gets through, not even the Ingress. The site is down.", run: () => (mode = "deny"), hold: 7 },
  { focus: "policy", zoom: 2.4, say: "Add allow rules: Ingress to the front pods, web to api, api to db.", run: () => (mode = "allow"), hold: 5 },
  { focus: "pod-4", zoom: 2.6, say: "Now web → db is dropped at db's door, while the allowed traffic flows.", hold: 8 },
  { home: true, say: "Ingress: the way in. NetworkPolicy: the walls inside. Start from deny, and allow only what you need.", hold: 5 },
]);
S.start();
