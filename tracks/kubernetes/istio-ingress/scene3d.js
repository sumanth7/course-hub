// Lesson 16 in 3D: Istio ingress as a sorting station. Gateway (TLS) → VirtualService turntable → subsets with mTLS → sidecars.
const S = createStage({ home: { target: [20, 14, -4], dir: [0.95, 1.05, 1.1], zoom: 1 }, viewH: 250 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const TOP = 9, FY = 1.9, DECKZ = 9.6;
const PODS = [{ cx: -70, cy: -46, sub: "v1" }, { cx: -6, cy: -46, sub: "v1" }, { cx: -70, cy: 30, sub: "v2" }, { cx: -6, cy: 30, sub: "v2" }];
const V1_Z = -26.5, V2_Z = 49.5;
const TURN = { x: 86, z: 0, r: 10 };
const GW = { x: 132, z: 0, w: 40, d: 36, h: 30 };
const DECK = { x: 89.5, z: 0, w: 47, d: 32, h: 6 };
const ISTIOD = { x: 130, z: -65, w: 36, d: 26, h: 34 };
const PORT_Y = 15;

part("plate", { kind: "Service mesh", title: "Istio ingress", noFrame: true, zoom: 1, anchor: V(20, 26, -4), desc: "Requests come in on the right, are routed on the gateway's deck, and travel to v1 or v2 pods along two tracks. istiod at the back configures the gateway.", yaml: "kubectl get gateway,virtualservice,destinationrule" });
own("plate", S.plate({ x: 33, z: -11, w: 278, d: 150 }), track([[[TURN.x, -16], [TURN.x, V1_Z]], [[TURN.x, V1_Z], [-78, V1_Z]], [[TURN.x, 16], [TURN.x, V2_Z]], [[TURN.x, V2_Z], [-78, V2_Z]]], { width: 5 }));
label("plate", "v1 subset", { anchor: V(30, 4, V1_Z) });
S.label("plate", "v2 subset", { anchor: V(30, 4, V2_Z) });

const pods = PODS.map((p, i) => {
  const id = part("pod-" + i, { kind: "Pod + Envoy sidecar", title: `reviews-${p.sub} (${i % 2 ? "b" : "a"})`, zoom: 2.8, anchor: V(p.cx, TOP + 26, p.cy),
    desc: () => `Runs reviews <b>${p.sub}</b>. Its Envoy sidecar (the small box in front) ends the mTLS hop and hands requests to the app over localhost. ${mesh.down[i] ? "<b>The app is returning errors.</b> " : ""}${inPool(i) ? "It is in the load-balancing pool." : "<b>Ejected</b> by outlier detection for a while."}`,
    yaml: "kind: DestinationRule\nspec:\n  host: reviews\n  trafficPolicy:\n    tls: { mode: ISTIO_MUTUAL }\n    outlierDetection: { consecutive5xxErrors: 2, baseEjectionTime: 30s }\n  subsets:\n  - { name: v1, labels: { version: v1 } }\n  - { name: v2, labels: { version: v2 } }",
    actions: () => [mesh.down[i] ? { label: "Fix this pod", run: () => (mesh.down[i] = false) } : { label: "Break this pod", danger: true, run: () => (mesh.down[i] = true) }] });
  own(id, S.tray({ x: p.cx, z: p.cy, w: 44, d: 30, top: TOP }));
  const app = crate({ w: 26, h: 14, d: 14, ribs: 3 });
  app.position.set(p.cx, TOP, p.cy - 5);
  const car = box(12, 10, 8.5, { x: p.cx, y0: TOP, z: p.cy + 8.25, tone: "mid", r: 0.8 });
  const l = lamp(p.cx + 17.5, TOP, p.cy + 10.5, { r: 1.5 });
  own(id, app, car, l.mesh);
  label(id, `reviews-${p.sub}`);
  return { app, l };
});

// gateway with its TLS port and Secret cartridge; deck with the turntable and weight slide
part("gateway", { kind: "Gateway · istio-ingressgateway", title: "Gateway :443", zoom: 2.4, anchor: V(GW.x, GW.h + 14, GW.z),
  desc: "The ingress gateway is an Envoy proxy at the edge. The Gateway resource opens port 443 for bookinfo.io; the cartridge on top is the TLS Secret it uses to end the client's TLS (the ring comes off the dot).",
  yaml: "kind: Gateway\nspec:\n  selector: { istio: ingressgateway }\n  servers:\n  - port: { number: 443, name: https, protocol: HTTPS }\n    hosts: [bookinfo.io]\n    tls: { mode: SIMPLE, credentialName: bookinfo-cert }" });
own("gateway", housing({ x: GW.x, z: GW.z, w: GW.w, d: GW.d, h: GW.h }), cyl(4.4, 1.8, { x: GW.x + GW.w / 2, y0: PORT_Y, z: 0, axis: "x" }), box(7, 5, 12, { x: GW.x - 10, y0: GW.h, z: -4, tone: "hi", r: 0.5 }), cyl(2.4, 2.6, { x: GW.x - 10, y0: GW.h + 5, z: 0 }));
label("gateway", "Gateway · TLS");
part("vs", { kind: "VirtualService", title: "VirtualService reviews", zoom: 3, anchor: V(TURN.x, DECK.h + 12, TURN.z),
  desc: () => `Routes on the deck: requests with header <b>end-user: jason</b> (accent dots) always go to v2; the rest split by weight: <b>v1 ${100 - mesh.applied}% · v2 ${mesh.applied}%</b> (the slide).`,
  yaml: () => `kind: VirtualService\nspec:\n  hosts: [bookinfo.io]\n  gateways: [bookinfo-gateway]\n  http:\n  - match: [{ headers: { end-user: { exact: jason } } }]\n    route: [{ destination: { host: reviews, subset: v2 } }]\n  - route:\n    - { destination: { host: reviews, subset: v1 }, weight: ${100 - mesh.applied} }\n    - { destination: { host: reviews, subset: v2 }, weight: ${mesh.applied} }`,
  actions: () => [{ label: "v2 weight −10", run: () => setWeight(mesh.weight - 10) }, { label: "v2 weight +10", run: () => setWeight(mesh.weight + 10) }] });
own("vs", box(DECK.w, DECK.h, DECK.d, { x: DECK.x, z: DECK.z, tone: "mid", r: 1 }), cyl(11.4, 0.8, { x: TURN.x, y0: DECK.h, z: 0, tone: "lo", seg: 40 }), cyl(TURN.r, 1.6, { x: TURN.x, y0: DECK.h + 0.8, z: 0, seg: 40 }), box(4, 0.4, 24, { x: 104, y0: DECK.h, z: 0, tone: "lo", r: 0.3 }));
const flapMat = new THREE.MeshBasicMaterial();
S.onTheme((p) => flapMat.color.set(p.lit));
const flap = new THREE.Group();
const fb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 8.4), flapMat);
fb.position.z = -4.2;
flap.add(fb);
flap.position.set(TURN.x, DECK.h + 2.7, 0);
const slideMat = new THREE.MeshBasicMaterial();
S.onTheme((p) => slideMat.color.set(p.accent));
const slide = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 4), slideMat);
slide.position.set(104, DECK.h + 1.4, 0);
own("vs", flap, slide);
label("vs", "VirtualService");

// istiod and the xDS cable
part("istiod", { kind: "istiod", title: "istiod", zoom: 2.4, anchor: V(ISTIOD.x, ISTIOD.h + 14, ISTIOD.z),
  desc: () => `The control plane of the mesh. It turns your Gateway, VirtualService and DestinationRule into Envoy configuration and pushes it over xDS (the cable). The knob is the v2 weight you set: <b>${mesh.weight}%</b>. ${mesh.push > 0 ? "<b>Pushing now</b>: traffic still uses the old split until the gateway has it." : ""}`,
  actions: () => [{ label: "v2 weight −10", run: () => setWeight(mesh.weight - 10) }, { label: "v2 weight +10", run: () => setWeight(mesh.weight + 10) }] });
own("istiod", housing({ x: ISTIOD.x, z: ISTIOD.z, w: ISTIOD.w, d: ISTIOD.d, h: ISTIOD.h }));
const knob = cyl(5.5, 4.6, { x: ISTIOD.x - 6, y0: ISTIOD.h, z: ISTIOD.z, seg: 32 });
const kp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 4.5), flapMat);
kp.position.set(0, 2.6, -2.2);
knob.add(kp);
const xdsLamp = lamp(ISTIOD.x + 10, ISTIOD.h, ISTIOD.z, { r: 1.3, state: "off" });
own("istiod", knob, xdsLamp.mesh);
label("istiod", "istiod");
const xdsMat = new THREE.LineBasicMaterial();
const xds = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(130, 5, -52), V(130, 0.3, -48), V(160, 0.3, -48), V(160, 0.3, -12), V(GW.x + GW.w / 2 + 2, 0.3, -12), V(GW.x + GW.w / 2, 5, -12)]), xdsMat);
S.world.add(xds);
S.onTheme(() => (xdsMat.color.set(S.PAL.edgeMid)));

// ---- model (same rules as the 2D lesson) ----
const mesh = { weight: 20, applied: 20, push: 0, down: [false, false, false, false], ejectedUntil: [0, 0, 0, 0], errors: [0, 0, 0, 0], acc: 0, rr: { v1: 0, v2: 0 } };
const EJECT_AFTER = 2, EJECT_FOR = 6;
let clock = 0, flapAng = Math.PI, flapWant = Math.PI, spawnIn = 0, reqNo = 0, fails = 0;
const inPool = (i) => clock >= mesh.ejectedUntil[i];
const healthy = (sub) => PODS.map((_, i) => i).filter((i) => PODS[i].sub === sub && inPool(i));
function pickSubset(jason) { if (jason) return "v2"; mesh.acc += mesh.applied / 100; if (mesh.acc >= 1 - 1e-9) { mesh.acc -= 1; return "v2"; } return "v1"; }
function pickEndpoint(sub) { const pool = healthy(sub); return pool.length ? pool[mesh.rr[sub]++ % pool.length] : -1; }
function setWeight(w) { w = Math.max(0, Math.min(100, Math.round(w / 10) * 10)); if (w === mesh.weight) return; mesh.weight = w; mesh.push = 0.9; }
const inGw = (q) => Math.abs(q.x - GW.x) < GW.w / 2 && Math.abs(q.z - GW.z) < GW.d / 2;
const net = S.packets({ speed: 120, onArrive: arrive });
function spawn() {
  const jason = reqNo++ % 5 === 2;
  net.add([V(200, PORT_Y, 0), V(GW.x + 2, PORT_Y, 0), V(GW.x + 2, DECKZ, 0), V(TURN.x, DECKZ, 0)], { stage: "in", jason, ring: true, alt: jason, hide: inGw });
}
function arrive(d) {
  if (d.stage === "in") {
    const sub = pickSubset(d.jason), i = pickEndpoint(sub);
    flapWant = sub === "v1" ? 0 : Math.PI;
    if (i < 0) { fails++; net.add([V(TURN.x, DECKZ, 0), V(TURN.x + 3, DECKZ + 6, 0)], { stage: "dead", bad: true, speed: 12, fade: 5 }); return; }
    const p = PODS[i], ez = sub === "v1" ? -16 : 16, lz = sub === "v1" ? V1_Z : V2_Z;
    net.add([V(TURN.x, DECKZ, 0), V(TURN.x, DECKZ, ez), V(TURN.x, FY, ez + Math.sign(ez) * 2), V(TURN.x, FY, lz), V(p.cx, FY, lz), V(p.cx, FY, p.cy + 16.8)], { stage: "mtls", i, ring: true, alt: d.jason });
  } else if (d.stage === "mtls") {
    const p = PODS[d.i];
    net.add([V(p.cx, TOP + 11.4, p.cy + 8.5), V(p.cx, TOP + 15.4, p.cy + 1.6)], { stage: "hop", i: d.i, speed: 45, alt: d.jason });
  } else if (d.stage === "hop") {
    const i = d.i;
    if (mesh.down[i]) { fails++; mesh.errors[i]++; if (mesh.errors[i] >= EJECT_AFTER && inPool(i)) { mesh.ejectedUntil[i] = clock + EJECT_FOR; mesh.errors[i] = 0; } net.add([V(PODS[i].cx, TOP + 15.4, PODS[i].cy + 1.6), V(PODS[i].cx, TOP + 21, PODS[i].cy + 1.6)], { stage: "dead", bad: true, speed: 30, fade: 5 }); }
    else { mesh.errors[i] = 0; flash[i] = 0.25; }
  }
}
const flash = [0, 0, 0, 0];

S.onTick((dt) => {
  clock += dt;
  if (mesh.push > 0) { mesh.push -= dt; if (mesh.push <= 0) { mesh.push = 0; mesh.applied = mesh.weight; } }
  spawnIn -= dt;
  if (!reduced() && spawnIn <= 0) { spawnIn = 0.34; spawn(); }
  net.step(dt);
  const dA = Math.atan2(Math.sin(flapWant - flapAng), Math.cos(flapWant - flapAng));
  flapAng += dA * (1 - Math.exp(-dt / 0.08));
  flap.rotation.y = flapAng;
  slide.position.z = -8 + (mesh.applied / 100) * 16;
  knob.rotation.y = -(-0.75 * Math.PI + (mesh.weight / 100) * 1.5 * Math.PI);
  xdsLamp.set(mesh.push > 0 ? "accent" : "off");
  xdsMat.color.set(mesh.push > 0 ? S.PAL.accent : S.PAL.edgeMid);
  pods.forEach((p, i) => { flash[i] = Math.max(0, flash[i] - dt); p.l.set(!inPool(i) ? "bad" : flash[i] > 0 ? "accent" : "on"); p.app.scale.y = mesh.down[i] ? 0.85 : 1; S.setLabel("pod-" + i, `reviews-${PODS[i].sub}` + (mesh.down[i] ? " · 5xx" : "") + (inPool(i) ? "" : " · ejected"), { bad: mesh.down[i] || !inPool(i) }); });
  const ej = PODS.filter((_, i) => !inPool(i)).length;
  S.say(`v1 ${100 - mesh.applied}% · v2 ${mesh.applied}%` + (mesh.push > 0 ? " · pushing" : "") + (ej ? ` · ${ej} ejected` : ""));
  syncUi();
});

S.overview = () => `<h2>Istio ingress</h2><p class="muted">Ringed dots are encrypted (TLS from the client, then mTLS inside the mesh); accent dots carry the header end-user: jason. Pick a part:</p>`;
const ui = { weight: document.getElementById("is-weight"), status: document.getElementById("is-status") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "w-") setWeight(mesh.weight - 10); if (a === "w+") setWeight(mesh.weight + 10);
  if (a === "break") { const i = +b.dataset.pod; mesh.down[i] = !mesh.down[i]; }
  S.renderPanel();
}));
function syncUi() {
  const t = "v2 weight " + mesh.weight + "%"; if (ui.weight.textContent !== t) ui.weight.textContent = t;
  document.querySelectorAll("[data-pod]").forEach((b) => { const i = +b.dataset.pod; const s = (mesh.down[i] ? "Fix " : "Break ") + `reviews-${PODS[i].sub} (${i % 2 ? "b" : "a"})`; if (b.textContent !== s) b.textContent = s; });
  const ej = PODS.map((_, i) => i).filter((i) => !inPool(i));
  const v2dead = !healthy("v2").length;
  const m = mesh.push > 0 ? "istiod is pushing the new route to the gateway over xDS; the old split applies until it lands." : v2dead ? "Both v2 pods are ejected: requests routed to v2 fail at the deck (no healthy upstream)." : ej.length ? `Outlier detection ejected ${ej.length} pod(s) after repeated errors; traffic goes to the rest.` : `Routing: jason → v2, everyone else v1 ${100 - mesh.applied}% / v2 ${mesh.applied}%.`;
  if (ui.status.textContent !== m) { ui.status.textContent = m; ui.status.dataset.tone = v2dead || ej.length ? "bad" : ""; }
}

S.setTour([
  { home: true, say: "Requests arrive on the right, sealed with TLS (the ring). Watch them go through the gateway to v1 and v2 pods.", hold: 5 },
  { focus: "gateway", zoom: 2.4, say: "The Gateway ends the client's TLS with the certificate in its Secret, the cartridge on top. The ring comes off.", hold: 6 },
  { focus: "vs", zoom: 3, say: "On the deck, the VirtualService routes: jason's requests (accent) always to v2; the rest by weight, 80/20 now.", hold: 7 },
  { focus: "pod-2", zoom: 2.6, say: "Each request is resealed with mutual TLS for the hop to the pod, where its Envoy sidecar ends it and hands it to the app.", hold: 6 },
  { focus: "istiod", zoom: 2.4, say: "Move the weight to 50/50 on istiod. The split changes only once istiod has pushed the new route over xDS.", run: () => setWeight(50), hold: 6 },
  { focus: "pod-3", zoom: 2.6, say: "Break a v2 pod. After two errors, outlier detection ejects it and traffic shifts to the healthy one.", run: () => (mesh.down[3] = true), hold: 8 },
  { home: true, say: "Gateway: the way in. VirtualService: where requests go. DestinationRule: how they get there, and what counts as healthy.", run: () => { mesh.down[3] = false; setWeight(20); }, hold: 6 },
]);
S.start();
