// Lesson 18 in 3D: edge plumbing. You apply a Gateway, an HTTPRoute and a Certificate; three controllers turn
// them into a load balancer (Gateway controller), DNS records (external-dns) and a TLS certificate (cert-manager
// with an ACME DNS-01 challenge against Let's Encrypt). Then traffic flows, split by the HTTPRoute.
const S = createStage({ home: { target: [14, 10, 4], dir: [0.9, 1.1, 1.15], zoom: 1 }, viewH: 285 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const FY = 1.9;
const NODE = {
  kubectl: { x: -180, z: -92 }, extdns: { x: -180, z: -40 }, cm: { x: -180, z: 6 }, gwc: { x: -180, z: 52 },
  board: { x: -70, z: 0 }, r53: { x: 70, z: -92 }, le: { x: 170, z: -92 }, alb: { x: 96, z: 20 }, users: { x: 196, z: 20 },
};
const CARDS = ["class", "gateway", "route", "cert", "secret"];
const CARD_Z = [-58, -29, 0, 29, 58];
const PODS = [{ x: -118, v: "v1" }, { x: -80, v: "v1" }, { x: -30, v: "v2" }, { x: 8, v: "v2" }];
const POD_Z = 104;

part("plate", { kind: "Edge plumbing", title: "From YAML to a working HTTPS site", noFrame: true, zoom: 1, anchor: V(0, 30, 0),
  desc: "On the left, three controllers in kube-system. In the middle, the objects you apply. At the back, the outside systems they drive: Route 53 and Let's Encrypt. On the right, the load balancer users reach, and at the front the pods behind it." });
own("plate", S.plate({ x: 6, z: 4, w: 440, d: 270 }));
own("plate", track([[[-180, -92], [-180, 52]], [[-180, 0], [-100, 0]], [[-40, 0], [NODE.alb.x - 14, 0]], [[NODE.alb.x - 14, 0], [NODE.alb.x - 14, 20]], [[-40, -92], [NODE.le.x, -92]], [[-40, -92], [-40, 0]], [[NODE.alb.x + 14, 20], [NODE.users.x, 20]], [[NODE.alb.x, 34], [NODE.alb.x, POD_Z - 20]], [[PODS[0].x, POD_Z - 20], [NODE.alb.x, POD_Z - 20]]], { width: 4.4 }));
S.label("plate", "kube-system", { small: true, anchor: V(-180, 2, 88), lod: 1.2 });

// ---- you, the controllers ----
part("kubectl", { kind: "You", title: "kubectl apply", zoom: 2.6, anchor: V(NODE.kubectl.x, 22, NODE.kubectl.z), desc: "Where the YAML comes from: you, or a CI pipeline. You only describe what you want; the controllers do the rest.", actions: () => [{ label: st.route ? "Delete the route" : "Apply the route", danger: st.route, run: () => (st.route ? deleteRoute() : applyRoute()) }] });
own("kubectl", housing({ x: NODE.kubectl.x, z: NODE.kubectl.z, w: 24, d: 18, h: 6 }), box(2, 12, 16, { x: NODE.kubectl.x - 10, y0: 6, z: NODE.kubectl.z, tone: "hi", r: 0.4 }));
label("kubectl", "you · kubectl");
const ctrl = (id, title, kind, desc, at) => { part(id, { kind, title, zoom: 2.6, anchor: V(at.x, 26, at.z), desc }); const c = crate({ w: 28, h: 13, d: 22, ribs: 4 }); c.position.set(at.x, 0, at.z); const l = lamp(at.x + 10, 13, at.z + 6, { r: 1.3, state: "off" }); own(id, c, l.mesh); label(id, title); return l; };
const extLamp = ctrl("extdns", "external-dns", "Controller", "Watches Gateways, HTTPRoutes and Ingresses for hostnames and points DNS at the load balancer's address. With policy sync it also deletes records it owns, recorded in a TXT 'owner' record.", NODE.extdns);
const cmLamp = ctrl("cm", "cert-manager", "Controller", () => `Turns a Certificate into a real TLS certificate: it opens an ACME order with Let's Encrypt, proves you control the domain with a DNS-01 challenge (a TXT record in Route 53), stores the result in a Secret, and renews it before it expires. Certificate age: <b>${Math.round(st.certAge)} of 90 days</b>.`, NODE.cm);
const gwcLamp = ctrl("gwc", "Gateway controller", "Controller", () => `Implements the GatewayClass (here the AWS Load Balancer Controller): for each Gateway it builds and configures a load balancer, and turns HTTPRoute rules into its routing. ${st.mode === "ingress" ? "In Ingress mode it reads the Ingress instead." : ""}`, NODE.gwc);

// ---- the objects you apply: five cards on a board ----
part("board", { kind: "API objects", title: "What you applied", zoom: 1.8, anchor: V(NODE.board.x, 20, 0), desc: "The objects in the API server. Each lamp shows whether the object is ready." });
own("board", housing({ x: NODE.board.x, z: 0, w: 62, d: 152, h: 6 }));
label("board", "your YAML", { anchor: V(NODE.board.x, 8, -84) });
const CARD_INFO = {
  class: { kind: "GatewayClass", title: () => (st.mode === "gateway" ? "GatewayClass alb" : "IngressClass alb"), desc: "Owned by the infrastructure team: which controller implements Gateways of this class." },
  gateway: { kind: "Gateway", title: () => (st.mode === "gateway" ? "Gateway shop-gw" : "(no Gateway in Ingress mode)"), desc: "Owned by the platform team: listeners (port, hostname, TLS certificate). One Gateway becomes one load balancer, shared by many routes." },
  route: { kind: "HTTPRoute", title: () => (st.mode === "gateway" ? "HTTPRoute shop" : "Ingress shop"), desc: () => `Owned by the app team: which host and paths go to which Service, here split <b>v1 ${100 - st.weight}% · v2 ${st.weight}%</b>, and requests with header <b>x-canary: true</b> always to v2. ${st.mode === "ingress" ? "An Ingress can't split by weight or match headers without controller-specific annotations; that's a reason Gateway API exists." : ""}` },
  cert: { kind: "Certificate", title: "Certificate shop-tls", desc: () => `Asks cert-manager for a certificate for <b>${st.sans.join(", ")}</b> from the ClusterIssuer letsencrypt. State: <b>${st.cert}</b>.` },
  secret: { kind: "Secret", title: "Secret shop-tls", desc: () => (st.cert === "ready" || st.certAge > 0 ? "The issued certificate and its private key (type kubernetes.io/tls). The Gateway's listener reads it." : "Not created yet: cert-manager writes it once the certificate is issued.") },
};
const cardLamps = CARDS.map((c, i) => { const id = part("card-" + c, { ...CARD_INFO[c], zoom: 3.2, anchor: V(NODE.board.x, 14, CARD_Z[i]) }); const b = box(46, 1.6, 22, { x: NODE.board.x - 4, y0: 6, z: CARD_Z[i], tone: "hi", r: 0.4 }); const l = lamp(NODE.board.x + 24, 6, CARD_Z[i], { r: 1.3, state: "off" }); own(id, b, l.mesh); label(id, "", { small: true }); return { id, b, l }; });

// ---- outside: Route 53 and Let's Encrypt ----
part("r53", { kind: "DNS", title: "Route 53 zone example.com", zoom: 2.4, anchor: V(NODE.r53.x, 26, NODE.r53.z), desc: "The DNS zone. external-dns writes the A (alias) record for the site and a TXT record saying it owns it; cert-manager writes a temporary _acme-challenge TXT record to prove control of the domain." });
own("r53", housing({ x: NODE.r53.x, z: NODE.r53.z, w: 56, d: 26, h: 12 }));
const RECORDS = ["A shop → ALB", "TXT owner", "TXT _acme-challenge"];
const recLamps = RECORDS.map((r, k) => { const z = NODE.r53.z - 8 + k * 8; const l = lamp(NODE.r53.x - 22, 12, z, { r: 1.1, state: "off" }); own("r53", l.mesh); S.label("r53", r, { small: true, anchor: V(NODE.r53.x + 2, 14, z), lod: 1.7 }); return l; });
label("r53", "Route 53");
part("le", { kind: "Certificate authority", title: "Let's Encrypt (ACME)", zoom: 2.4, anchor: V(NODE.le.x, 30, NODE.le.z), desc: "A free, automated certificate authority speaking ACME. It issues a 90-day certificate once a challenge proves you control the name; DNS-01 means it looks up a TXT record you were asked to publish." });
own("le", housing({ x: NODE.le.x, z: NODE.le.z, w: 36, d: 26, h: 20 }));
const leLamp = lamp(NODE.le.x + 12, 20, NODE.le.z, { r: 1.3, state: "off" });
own("le", leLamp.mesh);
label("le", "Let's Encrypt");

// ---- the load balancer, users, pods ----
part("alb", { kind: "Load balancer", title: "ALB for Gateway shop-gw", zoom: 2.2, anchor: V(NODE.alb.x, 30, NODE.alb.z), desc: () => `Built by the Gateway controller. State: <b>${st.alb}</b>. Its HTTPS listener ${st.listenerCert ? "serves the certificate from Secret shop-tls" : "<b>has no certificate yet</b>, so browsers can't connect"}.` });
own("alb", housing({ x: NODE.alb.x, z: NODE.alb.z, w: 28, d: 56, h: 18 }), cyl(4, 1.8, { x: NODE.alb.x + 14, y0: 10, z: NODE.alb.z, axis: "x" }));
const albLamp = lamp(NODE.alb.x - 6, 18, NODE.alb.z - 14, { r: 1.4, state: "off" }), tlsLamp = lamp(NODE.alb.x + 6, 18, NODE.alb.z - 14, { r: 1.4, state: "off" });
own("alb", albLamp.mesh, tlsLamp.mesh);
label("alb", "load balancer");
part("users", { kind: "Clients", title: "Users", zoom: 2.6, anchor: V(NODE.users.x, 24, NODE.users.z), desc: "Browsers asking for https://shop.example.com. Some send x-canary: true." });
own("users", housing({ x: NODE.users.x, z: NODE.users.z, w: 22, d: 30, h: 6 }), box(2, 12, 26, { x: NODE.users.x - 10, y0: 6, z: NODE.users.z, tone: "hi", r: 0.4 }));
const userLamp = lamp(NODE.users.x + 5, 6, NODE.users.z, { r: 1.5 });
own("users", userLamp.mesh);
label("users", "users");
const pods = PODS.map((p, i) => { const id = part("pod-" + i, { kind: "Pod", title: `web-${p.v}-${["a", "b", "c", "d"][i]}`, zoom: 3.2, anchor: V(p.x, 26, POD_Z), desc: `Serves version <b>${p.v}</b>, behind Service web-${p.v}.` }); const c = crate({ w: 26, h: 13, d: 20, ribs: 4 }); c.position.set(p.x, 0, POD_Z); const l = lamp(p.x + 9, 13, POD_Z - 5, { r: 1.3 }); own(id, c, l.mesh); label(id, "web-" + p.v, { small: true }); return { l, f: 0 }; });

// ---- the model ----
const st = { mode: "gateway", route: false, alb: "none", albT: 0, record: false, owner: false, txt: false, cert: "none", certAge: 0, listenerCert: false, iamBroken: false, weight: 20, sans: ["shop.example.com"], clock: 0 };
let queue = [], current = null, wait = 0, pending = 0, msg = "";
const P = (x, z) => V(x, FY, z);
// paths run along the floor: leave a node, take the corridor, arrive
function path(a, b) {
  const A = NODE[a], B = NODE[b];
  if (A.x === -180 && B.x === -180) return [P(A.x, A.z), P(B.x, B.z)];
  const midX = A.x === -180 || B.x === -180 ? -130 : -40;
  return [P(A.x, A.z), P(A.x === -180 ? -150 : A.x, A.z), P(midX, A.z), P(midX, B.z), P(B.x === -180 ? -150 : B.x, B.z), P(B.x, B.z)];
}
const net = S.packets({ speed: 260, onArrive: (d) => { if (d.flow) pending--; else traffic(d); } });
const blink = {};
function hop(a, b, opts = {}) { blink[a] = blink[b] = 0.5; pending++; net.add(path(a, b), { flow: true, ...opts }); }
const St = (say, hops, effect, until) => ({ say, hops, effect, until });
function run(steps) { queue = steps.slice(); current = null; }
function stepFlow(dt) {
  if (wait > 0) { wait -= dt; return; }
  if (current && pending <= 0) { if (current.until && !current.until()) return; current.effect?.(); current = null; wait = 0.3; return; }
  if (!current && queue.length) { current = queue.shift(); msg = current.say; for (const [a, b, o] of current.hops) hop(a, b, o); }
}
const issueSteps = (renew) => [
  St(renew ? `The certificate is ${Math.round(st.certAge)} days old: cert-manager renews it at two thirds of its life, well before it expires.` : "cert-manager sees the Certificate and opens an ACME order with Let's Encrypt.", [["board", "cm"], ["cm", "le"]], () => { st.cert = renew ? "renewing" : "issuing"; S.event("Normal", "OrderCreated", "certificate/shop-tls", "Created Order resource shop-tls-1-2187264971", "cert-manager-certificates-issuing"); }),
  St("DNS-01 challenge: cert-manager writes a TXT record at _acme-challenge.shop.example.com to prove you control the domain.", [["cm", "r53", { alt: true }]], () => { if (st.iamBroken) { st.cert = renew ? "renew failed" : "failed"; queue = []; msg = "The TXT record write was denied (AccessDenied: route53:ChangeResourceRecordSets). The challenge stays pending and no certificate is issued. Fix the IAM role, and cert-manager retries on its own."; S.event("Warning", "PresentError", "challenge/shop-tls-1-2187264971-1", "Error presenting challenge: AccessDenied: User is not authorized to perform: route53:ChangeResourceRecordSets", "cert-manager-challenges"); return; } st.txt = true; }),
  St("Let's Encrypt looks the TXT record up in DNS.", [["le", "r53", { alt: true }]]),
  St("It matches: the certificate is issued, and cert-manager stores it, with its key, in the Secret shop-tls. The TXT record is removed.", [["le", "cm"], ["cm", "board"]], () => { st.cert = "ready"; st.certAge = 0; st.txt = false; S.event("Normal", "Issuing", "certificate/shop-tls", "The certificate has been successfully issued", "cert-manager-certificates-issuing"); }),
  St("The Gateway's listener reads the Secret: HTTPS works with a trusted certificate.", [["board", "gwc"], ["gwc", "alb"]], () => { st.listenerCert = true; }),
];
function applyRoute() {
  if (queue.length || current) return;
  run([
    St(`kubectl apply: the ${st.mode === "gateway" ? "Gateway, HTTPRoute" : "Ingress"} and Certificate are stored in the API server.`, [["kubectl", "board"]], () => { st.route = true; }),
    St("The Gateway controller sees the new Gateway and starts building a load balancer. That takes a while.", [["board", "gwc"], ["gwc", "alb"]], () => { st.alb = "provisioning"; st.albT = 0; S.event("Normal", "SuccessfullyReconciled", "gateway/shop-gw", "Provisioning load balancer k8s-shopgw-4f2a9c", "gateway-controller"); }),
    St("external-dns waits for the load balancer's address, then writes shop.example.com → that address, plus a TXT record saying it owns the name.", [["board", "extdns"], ["extdns", "r53"]], () => { st.record = true; st.owner = true; S.event("Normal", "RecordCreated", "httproute/shop", "Desired change: CREATE shop.example.com A [alias to k8s-shopgw-4f2a9c.us-east-1.elb.amazonaws.com]", "external-dns"); }, () => st.alb === "active"),
    ...issueSteps(false),
  ]);
}
function deleteRoute() {
  if (queue.length || current) return;
  run([
    St("kubectl delete: the route, Gateway and Certificate are gone from the API server.", [["kubectl", "board"]], () => { st.route = false; }),
    St("external-dns (policy sync) deletes the records it owns: it checks the TXT owner record first, so it never touches records it didn't create.", [["board", "extdns"], ["extdns", "r53"]], () => { st.record = false; st.owner = false; }),
    St("The Gateway controller deletes the load balancer.", [["board", "gwc"], ["gwc", "alb"]], () => { st.alb = "none"; st.listenerCert = false; st.cert = "none"; st.certAge = 0; }),
  ]);
}
function fastForward() { if (st.cert !== "ready") { msg = "There's no issued certificate to age yet."; return; } st.certAge += 30; msg = `${Math.round(st.certAge)} days later.` + (st.certAge >= 60 ? "" : " cert-manager renews at 60 days (two thirds of 90)."); }
function setIam(b) { st.iamBroken = b; msg = b ? "cert-manager's IAM role can no longer write to Route 53. Nothing breaks today; the next issuance or renewal will." : "IAM fixed: cert-manager can write challenge records again."; if (!b && /failed/.test(st.cert)) run(issueSteps(st.cert === "renew failed")); }
function setWeight(w) { st.weight = Math.max(0, Math.min(100, w)); msg = `HTTPRoute now sends ${100 - st.weight}% to web-v1 and ${st.weight}% to web-v2, plus every x-canary request to v2.`; }
function setMode(m) { if (st.route && m !== st.mode) { msg = "Delete the route first, then apply it again in the other style."; return; } st.mode = m; msg = m === "ingress" ? "Ingress mode: one object holds host, paths and TLS; cert-manager and external-dns read its annotations. No weights or header matches without controller annotations." : "Gateway API: GatewayClass (infra), Gateway (platform) and HTTPRoute (app team) split the job, and routes can split by weight and match headers."; }

// steady traffic once DNS and the load balancer exist
let spawnIn = 0, reqN = 0, acc = 0;
function traffic(d) {
  if (d.stage === "lb") {
    if (!st.listenerCert) { userFlash(false); note = "TLS: the listener has no certificate"; net.add([P(NODE.alb.x + 14, NODE.alb.z), V(NODE.alb.x + 20, 9, NODE.alb.z)], { stage: "x", bad: true, speed: 20, fade: 8 }); return; }
    const canary = d.canary, v2 = canary || ((acc += st.weight / 100), acc >= 1 ? ((acc -= 1), true) : false);
    const choices = PODS.map((p, i) => i).filter((i) => PODS[i].v === (v2 && st.mode === "gateway" ? "v2" : "v1")); // plain Ingress can only send to v1
    const i = choices[reqN % choices.length];
    net.add([P(NODE.alb.x, NODE.alb.z + 28), P(NODE.alb.x, POD_Z - 20), P(PODS[i].x, POD_Z - 20), P(PODS[i].x, POD_Z - 10)], { stage: "pod", i, ring: false, alt: canary });
  } else if (d.stage === "pod") { pods[d.i].f = 0.3; userFlash(true); }
}
let note = "", uf = { t: 0, ok: true };
const userFlash = (ok) => (uf = { t: 0.35, ok });
function spawn(dt) {
  if (reduced()) return;
  spawnIn -= dt;
  if (spawnIn > 0) return;
  spawnIn = 0.5;
  const canary = reqN++ % 6 === 4;
  if (!st.record || st.alb !== "active") { userFlash(false); return; } // NXDOMAIN or nothing there yet
  net.add([P(NODE.users.x - 11, NODE.users.z), P(NODE.alb.x + 16, NODE.alb.z)], { stage: "lb", canary, ring: true, alt: canary });
}

S.onTick((dt) => {
  st.clock += dt;
  stepFlow(dt); spawn(dt); net.step(dt);
  if (st.alb === "provisioning") { st.albT += dt; if (st.albT > 2.5) st.alb = "active"; }
  if (st.cert === "ready" && st.certAge >= 60 && !queue.length && !current) run(issueSteps(true));
  for (const k in blink) blink[k] = Math.max(0, blink[k] - dt);
  extLamp.set(blink.extdns > 0 ? "accent" : "on"); cmLamp.set(blink.cm > 0 ? "accent" : /failed/.test(st.cert) ? "bad" : "on"); gwcLamp.set(blink.gwc > 0 ? "accent" : "on");
  leLamp.set(blink.le > 0 ? "accent" : "off");
  recLamps[0].set(st.record ? "on" : "off"); recLamps[1].set(st.owner ? "on" : "off"); recLamps[2].set(st.txt ? "accent" : "off");
  albLamp.set(st.alb === "active" ? "on" : st.alb === "provisioning" ? (Math.sin(st.clock * 10) > 0 ? "on" : "off") : "off");
  tlsLamp.set(st.listenerCert ? "good" : st.alb === "active" ? "bad" : "off");
  const ready = { class: true, gateway: st.route && st.mode === "gateway" && st.alb === "active", route: st.route, cert: st.cert === "ready" || st.cert === "renewing", secret: st.cert === "ready" || st.cert === "renewing" || (st.cert === "renew failed") };
  cardLamps.forEach((c, i) => {
    const k = CARDS[i], exists = k === "class" || (st.route && !(k === "gateway" && st.mode === "ingress")) || (k === "secret" && ready.secret);
    c.b.visible = exists; c.l.mesh.visible = exists;
    c.l.set(ready[k] ? "on" : (k === "cert" && /failed/.test(st.cert)) ? "bad" : "off");
    const t = typeof CARD_INFO[k].title === "function" ? CARD_INFO[k].title() : CARD_INFO[k].title;
    S.setLabel(c.id, t, { show: exists, bad: k === "cert" && /failed/.test(st.cert) });
  });
  pods.forEach((p) => { p.f = Math.max(0, p.f - dt); p.l.set(p.f > 0 ? "accent" : "on"); });
  uf.t = Math.max(0, uf.t - dt); userLamp.set(uf.t > 0 ? (uf.ok ? "good" : "bad") : "on");
  S.say(!st.route ? "nothing applied yet" : `DNS ${st.record ? "✓" : "…"} · LB ${st.alb} · cert ${st.cert}${st.cert === "ready" ? ` (${Math.round(st.certAge)}d)` : ""} · v2 ${st.weight}%`);
  syncUi();
});

// ---- controls ----
S.overview = () => `<h2>From YAML to HTTPS</h2><p class="muted">Apply the route and follow the dots: three controllers each turn part of your YAML into something outside the cluster. Pick a part:</p>`;
const ui = { apply: document.getElementById("ed-apply"), status: document.getElementById("ed-status"), w: document.getElementById("ed-w"), iam: document.getElementById("ed-iam"), mode: [...document.querySelectorAll("[data-mode]")] };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "apply") { S.shellEcho?.(st.route ? "kubectl delete -f shop.yaml" : "kubectl apply -f shop.yaml", "button"); st.route ? deleteRoute() : applyRoute(); }
  if (a === "ff") fastForward(); if (a === "iam") setIam(!st.iamBroken);
  if (a === "w-") setWeight(st.weight - 10); if (a === "w+") setWeight(st.weight + 10);
  if (a === "mode") setMode(b.dataset.mode);
  S.renderPanel();
}));
function syncUi() {
  const set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  set(ui.apply, st.route ? "Delete the route" : "Apply the route");
  ui.apply.disabled = !!(queue.length || current);
  set(ui.w, `v2 weight ${st.weight}%`);
  set(ui.iam, st.iamBroken ? "Fix cert-manager's IAM" : "Break cert-manager's IAM");
  ui.mode.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === st.mode)));
  set(ui.status, msg || "Nothing is applied yet. Apply the route and watch the controllers build DNS, a load balancer and a certificate.");
  ui.status.dataset.tone = /failed|denied|AccessDenied/.test(msg) ? "bad" : st.cert === "ready" ? "good" : "";
}

// ---- what the inspector shows ----
const ALB_HOST = "k8s-shopgw-4f2a9c.us-east-1.elb.amazonaws.com";
const gatewayClassY = () => (st.mode === "gateway" ? `apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: alb
spec:
  controllerName: gateway.k8s.aws/alb   # ← which controller builds Gateways of this class
status:
  conditions: [{ type: Accepted, status: "True" }]` : `apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: alb
spec:
  controller: ingress.k8s.aws/alb`);
const gatewayY = () => `apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shop-gw
  namespace: shop
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt   # ← cert-manager makes the Certificate for this listener
spec:
  gatewayClassName: alb
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    hostname: shop.example.com
    tls:
      certificateRefs: [{ name: shop-tls }]   # ← the Secret cert-manager fills
    allowedRoutes: { namespaces: { from: Same } }
status:
  addresses: [{ type: Hostname, value: ${st.alb === "active" ? ALB_HOST : '""'} }]   # ← external-dns points DNS here
  conditions: [{ type: Programmed, status: "${st.alb === "active" ? "True" : "False"}" }]`;
const routeY = () => (st.mode === "gateway" ? `apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: shop
  namespace: shop
spec:
  parentRefs: [{ name: shop-gw }]   # ← attaches to the Gateway
  hostnames: [shop.example.com]   # ← external-dns reads this
  rules:
  - matches: [{ headers: [{ name: x-canary, value: "true" }] }]   # ← testers opt in to v2
    backendRefs: [{ name: web-v2, port: 80 }]
  - backendRefs:   # ← everyone else: a weighted split
    - { name: web-v1, port: 80, weight: ${100 - st.weight} }
    - { name: web-v2, port: 80, weight: ${st.weight} }` : `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
  namespace: shop
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt   # ← cert-manager makes the Certificate from spec.tls
    external-dns.alpha.kubernetes.io/hostname: shop.example.com
    alb.ingress.kubernetes.io/target-type: ip
spec:
  ingressClassName: alb
  tls: [{ hosts: [shop.example.com], secretName: shop-tls }]
  rules:
  - host: shop.example.com
    http:
      paths:
      - { path: /, pathType: Prefix, backend: { service: { name: web-v1, port: { number: 80 } } } }   # ← no weights or header matches in plain Ingress`);
const certY = () => `apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: shop-tls
  namespace: shop
spec:
  secretName: shop-tls   # ← where the certificate and key end up
  dnsNames:
${st.sans.map((n) => `  - ${n}`).join("\n")}
  issuerRef: { kind: ClusterIssuer, name: letsencrypt }
  duration: 2160h   # ← 90 days, Let's Encrypt's lifetime
  renewBefore: 720h   # ← renew 30 days early
status:
  conditions: [{ type: Ready, status: "${st.cert === "ready" || st.cert === "renewing" || st.cert === "renew failed" ? "True" : "False"}", reason: ${st.cert === "ready" ? "Ready" : /failed/.test(st.cert) ? "Failed" : "Issuing"} }]
  notAfter: "${st.cert === "none" ? "" : `2027-01-${String(12 - Math.min(11, Math.floor(st.certAge / 10))).padStart(2, "0")}T10:00:00Z`}"`;
const secretY = () => `apiVersion: v1
kind: Secret
metadata:
  name: shop-tls
  namespace: shop
  annotations: { cert-manager.io/certificate-name: shop-tls, cert-manager.io/issuer-name: letsencrypt }
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t…   # ← issued by Let's Encrypt (R11), valid 90 days
  tls.key: LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t…   # ← never leaves the cluster`;
const WFIELDS = {
  "spec.rules[1].backendRefs[0].weight": { check: (v) => (!Number.isInteger(v) || v < 0 || v > 100 ? "weights are whole numbers 0–100 here" : ""), set: () => {} },
  "spec.rules[1].backendRefs[1].weight": { check: (v, all) => (!Number.isInteger(v) || v < 0 || v > 100 ? "weights are whole numbers 0–100 here" : v + all["spec.rules[1].backendRefs[0].weight"] === 0 ? "at least one backend needs weight > 0" : ""), set: (v, all) => setWeight(Math.round((100 * v) / (v + all["spec.rules[1].backendRefs[0].weight"]))) },
};
Object.assign(S.PARTS["card-class"], { manifest: gatewayClassY });
Object.assign(S.PARTS["card-gateway"], { manifest: () => (st.route && st.mode === "gateway" ? gatewayY() : "") });
Object.assign(S.PARTS["card-route"], { manifest: () => (st.route ? routeY() : ""), fields: (kind) => (kind === "HTTPRoute" ? WFIELDS : kind === "Ingress" ? {} : null) });
Object.assign(S.PARTS["card-cert"], { manifest: () => (st.route ? certY() : ""), fields: (kind) => (kind === "Certificate" ? { "spec.dnsNames*": { optional: true, check: (v) => (v !== undefined && !/^[a-z0-9.-]+\.example\.com$/.test(String(v)) ? "this lesson's zone is example.com" : ""), set: () => {} } } : null),
  applied: (all) => { const names = Object.entries(all).filter(([k]) => /^spec\.dnsNames\[\d+\]$/.test(k)).map(([, v]) => String(v)); if (names.length && names.join() !== st.sans.join()) { st.sans = names; if (!queue.length && !current) run(issueSteps(false)); msg = `New names on the Certificate: cert-manager orders a new certificate covering ${names.join(", ")}, with a DNS-01 challenge for each.`; } } });
Object.assign(S.PARTS["card-secret"], { manifest: () => (st.cert === "ready" || st.certAge > 0 || st.cert === "renewing" ? secretY() : "") });
Object.assign(S.PARTS.cm, { manifest: () => `apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: platform@example.com
    privateKeySecretRef: { name: letsencrypt-account }
    solvers:
    - dns01:   # ← prove control by publishing a TXT record
        route53: { region: us-east-1, hostedZoneID: Z0123456789ABC }   # ← needs IAM rights to change records
status:
  conditions: [{ type: Ready, status: "True" }]` });
Object.assign(S.PARTS.extdns, { manifest: () => K.deployment({ name: "external-dns", ns: "kube-system", replicas: 1, image: "registry.k8s.io/external-dns/external-dns:v0.15.0" }).replace("        ports: [{ containerPort: 8080 }]", "        args: [--source=gateway-httproute, --source=ingress, --provider=aws, --policy=sync, --txt-owner-id=shop-cluster]   # ← sync: it also deletes what it owns") });
Object.assign(S.PARTS.gwc, { manifest: () => K.deployment({ name: "aws-load-balancer-controller", ns: "kube-system", replicas: 2, image: "public.ecr.aws/eks/aws-load-balancer-controller:v2.13.0" }) });
Object.assign(S.PARTS.r53, { manifest: () => `# aws route53 list-resource-record-sets --hosted-zone-id Z0123456789ABC (excerpt)
${[st.record ? `- { Name: shop.example.com., Type: A, AliasTarget: { DNSName: ${ALB_HOST} } }   # ← written by external-dns` : "", st.owner ? `- { Name: a-shop.example.com., Type: TXT, Value: "heritage=external-dns,external-dns/owner=shop-cluster" }   # ← who owns the record` : "", st.txt ? `- { Name: _acme-challenge.shop.example.com., Type: TXT, Value: "gfj9Xq…Rg85nM" }   # ← cert-manager's proof, deleted after validation` : ""].filter(Boolean).join("\n") || "# no records for shop yet"}` });

// ---- kubectl and the YAML editor ----
S.kube({
  ns: "shop", groups: { Gateway: "gateway.networking.k8s.io" },
  help: ["kubectl apply -f shop.yaml   ·   kubectl delete -f shop.yaml", "kubectl get gatewayclass,gateway,httproute   ·   kubectl get certificate,order,challenge", "kubectl edit httproute shop   (weights)   ·   kubectl edit certificate shop-tls   (dnsNames)", "cmctl status certificate shop-tls   ·   cmctl renew shop-tls", "dig +short shop.example.com   ·   dig TXT _acme-challenge.shop.example.com", "curl -v https://shop.example.com [-H 'x-canary: true']", "kubectl logs deploy/external-dns -n kube-system"],
  examples: ["kubectl apply -f shop.yaml", "kubectl get gateway,httproute,certificate", "dig +short shop.example.com", "cmctl status certificate shop-tls", "curl -v https://shop.example.com", "curl -H 'x-canary: true' https://shop.example.com", "kubectl edit httproute shop", "kubectl logs deploy/external-dns -n kube-system"],
  objects: () => [
    ...(st.cert === "issuing" || st.cert === "renewing" || /failed/.test(st.cert) ? [{ kind: "Order", name: "shop-tls-1-2187264971", labels: {}, row: { STATE: /failed/.test(st.cert) ? "pending" : "pending" } }, { kind: "Challenge", name: "shop-tls-1-2187264971-1", labels: {}, row: { STATE: /failed/.test(st.cert) ? "pending" : st.txt ? "pending" : "pending", DOMAIN: st.sans[0], REASON: /failed/.test(st.cert) ? "AccessDenied: route53:ChangeResourceRecordSets" : "Waiting for DNS-01 challenge propagation" } }] : []),
    { kind: "Deployment", name: "external-dns", ns: "kube-system", part: "extdns", labels: { app: "external-dns" }, row: { READY: "1/1", "UP-TO-DATE": 1, AVAILABLE: 1 }, logs: () => ["level=info msg=\"Applying provider record filter for domains: [example.com.]\"", ...(st.record ? [`level=info msg="Desired change: CREATE shop.example.com A [Id: /hostedzone/Z0123456789ABC]"`, `level=info msg="Desired change: CREATE a-shop.example.com TXT [Id: /hostedzone/Z0123456789ABC]"`, "level=info msg=\"2 record(s) in zone example.com. were successfully updated\""] : ["level=info msg=\"All records are already up to date\""])] },
  ],
  verbs: {
    apply({ f }) { if (f["-f"] !== "shop.yaml") return f["-f"] === "-" ? undefined : { err: `error: the path "${f["-f"]}" does not exist. This lesson has shop.yaml` }; if (st.route) return [`${st.mode === "gateway" ? "gateway.gateway.networking.k8s.io/shop-gw unchanged\nhttproute.gateway.networking.k8s.io/shop unchanged" : "ingress.networking.k8s.io/shop unchanged"}`, "certificate.cert-manager.io/shop-tls unchanged"]; if (queue.length || current) return { err: "# the last change is still being reconciled; wait a moment" }; S.stopTour(); applyRoute(); return st.mode === "gateway" ? ["gateway.gateway.networking.k8s.io/shop-gw created", "httproute.gateway.networking.k8s.io/shop created", "certificate.cert-manager.io/shop-tls created"] : ["ingress.networking.k8s.io/shop created", "certificate.cert-manager.io/shop-tls created"]; },
    delete({ f }) { if (f["-f"] !== "shop.yaml") return { err: "This lesson deletes everything at once: kubectl delete -f shop.yaml" }; if (!st.route) return { err: 'Error from server (NotFound): httproutes.gateway.networking.k8s.io "shop" not found' }; S.stopTour(); deleteRoute(); return ["httproute.gateway.networking.k8s.io \"shop\" deleted", "gateway.gateway.networking.k8s.io \"shop-gw\" deleted", "certificate.cert-manager.io \"shop-tls\" deleted"]; },
  },
  tools: {
    dig({ pos }) { const txt = pos.includes("TXT") || pos.some((x) => x.startsWith("_acme")); if (txt) return st.txt ? ['"gfj9Xq…Rg85nM"'] : ["# no TXT record: cert-manager only publishes it during a challenge"]; if (!st.record) return ["# NXDOMAIN: no record yet (external-dns hasn't written one)"]; return [ALB_HOST + ".", "3.214.18.77", "54.85.140.12"]; },
    curl({ pos, f }) {
      if (!pos.some((x) => /shop\.example\.com/.test(x))) return { err: "curl: (6) Could not resolve host" };
      if (!st.record) return { err: "curl: (6) Could not resolve host: shop.example.com" };
      if (st.alb !== "active") return { err: "curl: (7) Failed to connect to shop.example.com port 443" };
      if (!st.listenerCert) return { err: "curl: (35) TLS connect error: the server presented no certificate for shop.example.com" };
      const canary = /x-canary:\s*true/i.test(String(f["-H"] || "")), v = canary || (st.mode === "gateway" && Math.random() * 100 < st.weight) ? "v2" : "v1";
      return [...(f["-v"] ? ["* Connected to shop.example.com (3.214.18.77) port 443", "* Server certificate:", `*  subject: CN=${st.sans[0]}`, `*  expire date: Jan ${12 - Math.min(11, Math.floor(st.certAge / 10))} 10:00:00 2027 GMT`, "*  issuer: C=US; O=Let's Encrypt; CN=R11", "*  SSL certificate verify ok."] : []), "HTTP/1.1 200 OK", `x-version: ${v}   # ← ${canary ? "header match: always v2" : `weighted: v2 gets ${st.weight}%`}`];
    },
    cmctl({ pos }) {
      if (pos[0] === "renew") { if (st.cert !== "ready") return { err: "error: certificate shop-tls is not Ready; nothing to renew yet" }; S.stopTour(); run(issueSteps(true)); return ["Manually triggered issuance of Certificate shop/shop-tls"]; }
      if (pos[0] === "status") return [`Name: shop-tls`, `Namespace: shop`, `Conditions:`, `  Ready: ${st.cert === "ready" || st.cert === "renewing" ? "True, Reason: Ready, Message: Certificate is up to date and has not expired" : st.cert === "renew failed" ? "True, Reason: Ready   # the old certificate still works until it expires" : `False, Reason: ${/failed/.test(st.cert) ? "Failed" : "DoesNotExist"}`}`, ...(st.cert === "renew failed" ? ["  Issuing: False, Reason: Failed   # renewal is stuck: fix it before day 90"] : []), `DNS Names: ${st.sans.join(", ")}`, ...(st.cert === "ready" ? [`Not After: 2027-01-${String(12 - Math.min(11, Math.floor(st.certAge / 10))).padStart(2, "0")}T10:00:00Z`, `Renewal Time: in ${Math.max(0, 60 - Math.round(st.certAge))} days`] : []), ...(/failed|issuing|renewing/.test(st.cert) ? ["Order: shop-tls-1-2187264971 (pending)", `Challenge: DNS-01 for ${st.sans[0]}: ${/failed/.test(st.cert) ? "AccessDenied: route53:ChangeResourceRecordSets" : "waiting for propagation"}`] : [])];
      return { err: "this lesson simulates cmctl status certificate shop-tls and cmctl renew shop-tls" };
    },
  },
});
// ---- end kubectl ----

S.setTour([
  { home: true, say: "Nothing exists yet: no DNS name, no load balancer, no certificate. Three controllers wait on the left.", hold: 5 },
  { focus: "board", zoom: 1.7, say: "Apply three objects: a Gateway, an HTTPRoute and a Certificate.", run: () => { if (!st.route) applyRoute(); }, hold: 4 },
  { focus: "alb", zoom: 2, say: "The Gateway controller builds a load balancer for the Gateway.", hold: 4, until: () => st.alb === "active" },
  { focus: "r53", zoom: 2.2, say: "external-dns points shop.example.com at the load balancer, and adds a TXT record saying it owns that name.", hold: 4, until: () => st.record },
  { focus: "le", zoom: 1.8, say: "cert-manager asks Let's Encrypt for a certificate and proves control of the domain with a DNS-01 TXT record...", hold: 4, until: () => st.cert === "ready" },
  { focus: "card-secret", zoom: 2.6, say: "...and stores it in the Secret shop-tls. The listener picks it up: HTTPS works.", hold: 6 },
  { focus: "card-route", zoom: 2.6, say: "The HTTPRoute splits traffic: 80% v1, 20% v2, and testers with x-canary: true always get v2.", hold: 7 },
  { focus: "cm", zoom: 2.4, say: "60 days later cert-manager renews the certificate on its own, a month before it expires.", run: () => { fastForward(); fastForward(); }, hold: 10 },
  { home: true, say: "You wrote YAML. Controllers made DNS records, a load balancer and a certificate, and keep them right.", hold: 6 },
]);
S.start();
