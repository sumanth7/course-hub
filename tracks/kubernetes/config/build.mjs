import { k, scene, RUNTIME, writeLesson } from "../shared.mjs";

const PLATE = { x: -148, y: -64, w: 298, d: 124, r: 9 };
// API objects on the left: a cabinet carrying the ConfigMap sheet and the Secret box
const CAB = { x: -138, y: -46, w: 92, d: 64, r: 3 };
const CAB_H = 22;
const CM = { x: -134, y: -42, w: 44, d: 56, r: 1.2 };
const SEC = { x: -86, y: -42, w: 36, d: 56, r: 1.2 };
// the node on the right: a tray, the kubelet, and the pod crate with its lid off
const TRAY = { x: -8, y: -56, w: 150, d: 92, r: 3 };
const TRAY_Z = 4, TOP = 12;
const POD = { x: 22, y: -46, w: 112, d: 58, r: 1 };
const POD_H = 20;
const POD_TOP = TOP + POD_H;
const ENV = { x: 27, y: -41, w: 52, d: 48, r: 1 };
const FILES = { x: 84, y: -41, w: 45, d: 48, r: 1 };
const KUBELET = { x: 0, y: 14, w: 26, d: 16, r: 2 };
const KUBELET_H = 9;
const LANE_Y = 46;
const ROWS = ["LOG_LEVEL", "FEATURE_X", "DB_PASSWORD"];

const C = scene({ width: 640, height: 400, elevation: 38, pad: 16, fit: [...k.boxCorners(PLATE, -17, 0), [POD.x, POD.y, POD_TOP + 6], [CAB.x, CAB.y, CAB_H + 8]] });
const { P, at, S, L, D, byDepth, plate, housing, crate, lampSvg, topText, frontText, faceRect, inlay, port } = C;

function cabinet() {
  const out = [housing(CAB, 0, CAB_H, { seam: 0.4 })];
  // ConfigMap: a printed sheet on the cabinet top
  out.push(S(k.slabOf(CM, CAB_H, 0.8, P, 2), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(CM, 1.4), CAB_H + 0.8, P, 2), { tone: "faint" }));
  out.push(topText(CM.x + 3, CM.y + 8, CAB_H + 0.8, "configmap/app", { size: 3.4, tone: "hi" }));
  out.push(L(k.lineOnTop([CM.x + 3, CM.y + 11], [CM.x + CM.w - 3, CM.y + 11], CAB_H + 0.8, P), { tone: "lo", free: true }));
  out.push(topText(CM.x + 3, CM.y + 20, CAB_H + 0.8, "LOG_LEVEL: info", { size: 3.2, tone: "mid", attrs: 'data-cm="LOG_LEVEL"' }));
  out.push(topText(CM.x + 3, CM.y + 27, CAB_H + 0.8, "FEATURE_X: off", { size: 3.2, tone: "mid", attrs: 'data-cm="FEATURE_X"' }));
  out.push(`<g data-cmflash style="opacity:0">${S(k.slabOf(k.insetPlan(CM, 0.4), CAB_H + 0.8, 0.1, P, 2), { tone: "hi", lit: true, crease: "none" })}</g>`);
  // Secret: a sheet under a padlocked hasp
  out.push(S(k.slabOf(SEC, CAB_H, 0.8, P, 2), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(SEC, 1.4), CAB_H + 0.8, P, 2), { tone: "faint" }));
  out.push(topText(SEC.x + 3, SEC.y + 8, CAB_H + 0.8, "secret/db", { size: 3.4, tone: "hi" }));
  out.push(L(k.lineOnTop([SEC.x + 3, SEC.y + 11], [SEC.x + SEC.w - 3, SEC.y + 11], CAB_H + 0.8, P), { tone: "lo", free: true }));
  out.push(topText(SEC.x + 3, SEC.y + 19, CAB_H + 0.8, "password:", { size: 3, tone: "mid" }));
  out.push(topText(SEC.x + 3, SEC.y + 25.5, CAB_H + 0.8, "aHVudGVyMg==", { size: 3.2, tone: "hi", attrs: "data-secret" }));
  const lock = [SEC.x + SEC.w / 2, SEC.y + 40];
  out.push(S(k.slabOf({ x: lock[0] - 5, y: lock[1] - 3, w: 10, d: 7, r: 1.2 }, CAB_H + 0.8, 6, P, 2, 0.4), { tone: "mid" }));
  out.push(L(k.sideRing([lock[0], lock[1] + 4, CAB_H + 3.8], 1, "y", P, 12), { tone: "lo" }));
  out.push(`<g data-shackle>${S(k.slabOf({ x: lock[0] - 3.6, y: lock[1] - 1, w: 1.6, d: 2, r: 0.6 }, CAB_H + 6.8, 4, P, 2), { tone: "mid", crease: "none" })}${S(k.slabOf({ x: lock[0] + 2, y: lock[1] - 1, w: 1.6, d: 2, r: 0.6 }, CAB_H + 6.8, 4, P, 2), { tone: "mid", crease: "none" })}${S(k.slabOf({ x: lock[0] - 3.6, y: lock[1] - 1, w: 7.2, d: 2, r: 0.8 }, CAB_H + 10.8, 1.6, P, 2), { tone: "mid", crease: "none" })}</g>`);
  out.push(frontText(CAB.x + 4, CAB.y + CAB.d, 8, "API server · etcd", { size: 3, tone: "mid" }));
  out.push(port(CAB.x + CAB.w - 12, CAB.y + CAB.d, 2.6));
  return out.join("");
}

function node() {
  const out = [`<path class="iso-halo" d="${k.haloOf(TRAY, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const [x, y] of byDepth(k.corners(TRAY, 6))) out.push(S(k.cylinder(x, y, 3, 0, TRAY_Z, P, 18), { tone: "lo" }));
  out.push(S(k.slabOf(TRAY, TRAY_Z, TOP - TRAY_Z, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(TRAY, TRAY_Z + 2.4, P, 4), { tone: "faint" }) }));
  out.push(topText(TRAY.x + 30, TRAY.y + TRAY.d - 3, TOP, "node-1", { size: 2.8, tone: "lo" }));
  out.push(housing(KUBELET, TOP, KUBELET_H, { seam: 0.5 }));
  out.push(topText(KUBELET.x + 2.5, KUBELET.y + 9.5, TOP + KUBELET_H, "kubelet", { size: 3.2, tone: "mid" }));
  out.push(lampSvg(KUBELET.x + KUBELET.w - 4, KUBELET.y + 4, TOP + KUBELET_H, { r: 1, attr: "data-kl" }));
  out.push(port(KUBELET.x + KUBELET.w / 2, KUBELET.y + KUBELET.d, TOP + 1.4, { w: 5, h: 3.4 }));
  return out.join("");
}

function pod() {
  const out = [];
  // the crate with its lid off: walls, and two panels standing inside
  out.push(`<g data-pod>${crate(POD, TOP, POD_H, { ribs: 9, doors: false })}`);
  out.push(frontText(POD.x + 4, POD.y + POD.d, TOP + 6, "pod/app", { size: 3.4, tone: "hi" }));
  // env plugboard: one jack and label per variable, filled when the container starts
  out.push(S(k.slabOf(ENV, POD_TOP, 1.2, P, 2, 0.3), { tone: "mid" }));
  out.push(topText(ENV.x + 3, ENV.y + 6.5, POD_TOP + 1.2, "env (read at start)", { size: 2.8, tone: "lo" }));
  ROWS.forEach((key, i) => {
    const y = ENV.y + 15 + i * 11;
    out.push(S(k.cylinder(ENV.x + 4, y - 1.2, 1.3, POD_TOP + 1.2, 0.8, P, 12), { tone: "lo" }));
    out.push(topText(ENV.x + 7, y, POD_TOP + 1.2, "", { size: 3, tone: "hi", attrs: `data-env="${key}"` }));
    out.push(lampSvg(ENV.x + ENV.w - 4, y - 1.2, POD_TOP + 1.2, { r: 1, attr: `data-stale="${key}"`, cls: "cf-stale" }));
  });
  // mounted volume: a file tray at /etc/config, refreshed by the kubelet
  out.push(S(k.slabOf(FILES, POD_TOP, 1.2, P, 2, 0.3), { tone: "mid" }));
  out.push(topText(FILES.x + 3, FILES.y + 6.5, POD_TOP + 1.2, "/etc/config (volume)", { size: 2.8, tone: "lo" }));
  ["LOG_LEVEL", "FEATURE_X"].forEach((key, i) => {
    const card = { x: FILES.x + 3, y: FILES.y + 10 + i * 13, w: FILES.w - 6, d: 10, r: 0.6 };
    out.push(S(k.slabOf(card, POD_TOP + 1.2, 0.5, P, 2), { tone: "hi", crease: "none" }));
    out.push(topText(card.x + 2, card.y + 4.2, POD_TOP + 1.7, key.toLowerCase(), { size: 2.6, tone: "lo" }));
    out.push(topText(card.x + 2, card.y + 8.4, POD_TOP + 1.7, "", { size: 3, tone: "hi", attrs: `data-file="${key}"` }));
  });
  out.push(port(64, POD.y + POD.d, TOP + 2, { w: 6, h: 4 }));
  out.push(port(108, POD.y + POD.d, TOP + 2, { w: 6, h: 4 }));
  out.push(`</g>`);
  return out.join("");
}

const body = [
  plate(PLATE, { ruler: false }),
  inlay({ x: CAB.x + CAB.w - 14.4, y: CAB.y + CAB.d + 1.8, w: 4.8, d: LANE_Y - CAB.y - CAB.d + 0.6, r: 0.8 }),
  inlay({ x: CAB.x + CAB.w - 14.4, y: LANE_Y - 2.4, w: KUBELET.x + KUBELET.w / 2 - (CAB.x + CAB.w - 14.4) + 2.4, d: 4.8, r: 0.8 }),
  inlay({ x: KUBELET.x + KUBELET.w / 2 - 2.4, y: TRAY.y + TRAY.d, w: 4.8, d: LANE_Y - TRAY.y - TRAY.d + 2.4, r: 0.8 }),
  cabinet(),
  `<g data-lane="floor"></g>`,
  node(),
  `<g data-lane="tray"></g>`,
  pod(),
  `<g data-lane="top"></g>`,
].join("");

const live = `
const P = ${JSON.stringify(P)};
${RUNTIME}
const TOP = ${TOP}, POD_TOP = ${POD_TOP}, LANE_Y = ${LANE_Y}, CAB = ${JSON.stringify(CAB)}, CAB_H = ${CAB_H}, KUBELET = ${JSON.stringify(KUBELET)}, TRAY = ${JSON.stringify(TRAY)}, POD = ${JSON.stringify(POD)}, ENV = ${JSON.stringify(ENV)}, FILES = ${JSON.stringify(FILES)};
const lanes = { floor: $('[data-lane="floor"]'), tray: $('[data-lane="tray"]'), top: $('[data-lane="top"]') };
const ui = { status: document.getElementById("cf-status"), rows: document.getElementById("cf-rows"), decode: document.getElementById("cf-decode"), yaml: document.getElementById("cf-yaml") };

// ---- the model ----
const SYNC_DELAY = 5; // the kubelet refreshes mounted ConfigMaps periodically (about a minute in real clusters)
const api = { LOG_LEVEL: "info", FEATURE_X: "off", DB_PASSWORD: "hunter2" };
const env = { ...api };      // copied into the container's environment when it starts
const files = { LOG_LEVEL: "info", FEATURE_X: "off" }; // what the mounted volume shows now
let syncIn = Infinity, restarting = 0, decoded = false, flash = 0, msg = "";
const b64 = (s) => btoa(s);

function edit(key) {
  api[key] = key === "LOG_LEVEL" ? (api[key] === "info" ? "debug" : "info") : api[key] === "off" ? "on" : "off";
  flash = 1;
  if (!isFinite(syncIn)) syncIn = SYNC_DELAY;
  msg = "Edited configmap/app: " + key + "=" + api[key] + ". The API has the new value now. The mounted file follows on the kubelet's next sync; the env var will not change until the container restarts.";
}
function restart() {
  if (restarting) return;
  restarting = 1.6;
  msg = "Restarting the pod: the new container reads its environment from the ConfigMap and Secret as they are now.";
}
function decode() {
  decoded = !decoded;
  msg = decoded
    ? "base64 -d gives 'hunter2' back. A Secret is only encoded, not encrypted: anyone allowed to read it can decode it. Protect Secrets with RBAC and turn on encryption at rest for etcd."
    : "Secrets are stored base64-encoded. Pods get the decoded value as an env var or a file on an in-memory volume.";
}

// ---- deliveries: the kubelet carries values from the API to the pod ----
const kubeletFront = [KUBELET.x + KUBELET.w / 2, KUBELET.y + KUBELET.d + 1.8, 2];
const cabPort = [CAB.x + CAB.w - 12, CAB.y + CAB.d + 1.8, 2];
const toKubelet = [cabPort, [cabPort[0], LANE_Y, 1], [kubeletFront[0], LANE_Y, 1], kubeletFront];
const laneOf = ([x, y, z]) => (z < TOP - 0.5 ? lanes.floor : z < POD_TOP ? lanes.tray : lanes.top);
const net = packets({ speed: 90, layer: laneOf, onArrive: arrive });
function deliver(what) { net.add(toKubelet, { what, hide: ([x, y, z]) => false }); }
function arrive(d) {
  if (d.stage === undefined) {
    // from the kubelet onto the tray, then up into the pod's panel
    const target = d.what === "files" ? [108, POD.y + POD.d + 1.8, TOP + 3] : [64, POD.y + POD.d + 1.8, TOP + 3];
    const k0 = [KUBELET.x + KUBELET.w, KUBELET.y + KUBELET.d / 2, TOP + 1.4];
    net.add([k0, [target[0], k0[1], TOP + 1.4], target], { ...d, stage: 1 });
  } else if (d.stage === 1) {
    if (d.what === "files") { files.LOG_LEVEL = api.LOG_LEVEL; files.FEATURE_X = api.FEATURE_X; flashEl(\`[data-file]\`); }
    else { Object.assign(env, api); flashEl(\`[data-env]\`); }
  }
}
function flashEl(q) { $$(q).forEach((el) => { el.classList.add("cf-new"); clearTimeout(el.__t); el.__t = setTimeout(() => el.classList.remove("cf-new"), 900); }); }

function step(dt) {
  flash = Math.max(0, flash - dt * 1.5);
  if (isFinite(syncIn)) { syncIn -= dt; if (syncIn <= 0) { syncIn = Infinity; deliver("files"); } }
  if (restarting) {
    restarting = Math.max(0, restarting - dt);
    if (restarting === 0) deliver("env");
  }
  net.step(dt);
}

function draw() {
  net.draw();
  $("[data-cmflash]").style.opacity = (flash * 0.8).toFixed(2);
  setText($('[data-cm="LOG_LEVEL"]'), "LOG_LEVEL: " + api.LOG_LEVEL);
  setText($('[data-cm="FEATURE_X"]'), "FEATURE_X: " + api.FEATURE_X);
  setText($("[data-secret]"), decoded ? api.DB_PASSWORD : b64(api.DB_PASSWORD));
  $("[data-secret]").classList.toggle("cf-plain", decoded);
  $("[data-shackle]").setAttribute("transform", decoded ? "translate(0 -2.5)" : "");
  for (const key of ["LOG_LEVEL", "FEATURE_X", "DB_PASSWORD"]) {
    setText($('[data-env="' + key + '"]'), key + "=" + env[key]);
    const stale = env[key] !== api[key];
    const lamp = $('[data-stale="' + key + '"]');
    lamp.classList.toggle("is-stale", stale);
    lamp.style.opacity = stale ? 1 : 0.15;
  }
  for (const key of ["LOG_LEVEL", "FEATURE_X"]) setText($('[data-file="' + key + '"]'), files[key]);
  $("[data-pod]").style.opacity = restarting ? (0.35 + 0.65 * Math.abs(Math.cos(restarting * 2))).toFixed(2) : 1;
  $("[data-kl]").style.opacity = net.list.length ? 1 : 0.2;
  const staleN = ["LOG_LEVEL", "FEATURE_X"].filter((key) => env[key] !== api[key]).length;
  const pending = isFinite(syncIn);
  say(pending ? "volume sync in " + Math.ceil(syncIn) + "s" : staleN ? staleN + " env var" + (staleN > 1 ? "s" : "") + " stale · restart to apply" : "pod in sync");
  setText(ui.status, msg || "The pod reads LOG_LEVEL and FEATURE_X from configmap/app twice: as env vars at start, and as files in a mounted volume. DB_PASSWORD comes from secret/db.");
  ui.status.dataset.tone = staleN ? "bad" : "";
  ui.decode.setAttribute("aria-pressed", String(decoded));
  const row = (key, src) => "<tr><td>" + key + "</td><td>" + src + "</td><td>" + api[key] + "</td><td data-tone='" + (env[key] === api[key] ? "good" : "bad") + "'>" + env[key] + (env[key] === api[key] ? "" : " (stale)") + "</td><td data-tone='" + (key in files ? (files[key] === api[key] ? "good" : "bad") : "") + "'>" + (key in files ? files[key] + (files[key] === api[key] ? "" : " (syncing)") : "not mounted") + "</td></tr>";
  const html = row("LOG_LEVEL", "configmap/app") + row("FEATURE_X", "configmap/app") + row("DB_PASSWORD", "secret/db");
  if (ui.rows.__h !== html) { ui.rows.innerHTML = html; ui.rows.__h = html; }
  setText(document.getElementById("cf-y-log"), api.LOG_LEVEL);
  setText(document.getElementById("cf-y-feat"), api.FEATURE_X);
}

const A = animate({
  tick(dt) { step(dt); draw(); },
  tour: [{ hold: 3 }, { edit: "LOG_LEVEL" }, { hold: 9 }, { restart: true }, { hold: 5 }, { decode: true }, { hold: 6 }, { decode: true }, { edit: "FEATURE_X" }, { hold: 8 }, { restart: true }, { hold: 5 }, { edit: "LOG_LEVEL" }, { edit: "FEATURE_X" }, { hold: 8 }, { restart: true }, { hold: 5 }],
  act(s) { if (s.edit) edit(s.edit); if (s.restart) restart(); if (s.decode) decode(); },
});
controls({ log: () => edit("LOG_LEVEL"), feat: () => edit("FEATURE_X"), restart: () => restart(), decode: () => decode() }, A.takeOver);
draw();
`;

const controls = `<div class="lx-controls" role="group" aria-label="Config controls">
  <button type="button" data-do="log">Edit ConfigMap: LOG_LEVEL</button>
  <button type="button" data-do="feat">Edit ConfigMap: FEATURE_X</button>
  <button type="button" data-do="restart">Restart the pod</button>
  <button type="button" data-do="decode" id="cf-decode" aria-pressed="false">Decode the Secret</button>
  <p class="lx-status" id="cf-status" aria-live="polite"></p>
</div>
<div class="lx-table-wrap"><table class="lx-table"><thead><tr><th>Key</th><th>From</th><th>In the API</th><th>Env var in pod</th><th>File in pod</th></tr></thead><tbody id="cf-rows"></tbody></table></div>
<pre class="lx-yaml"><b>apiVersion:</b> v1
<b>kind:</b> ConfigMap
<b>metadata:</b> { name: app }
<b>data:</b> { <b>LOG_LEVEL:</b> <mark id="cf-y-log">info</mark>, <b>FEATURE_X:</b> <mark id="cf-y-feat">off</mark> }
---
<b>kind:</b> Secret
<b>metadata:</b> { name: db }
<b>data:</b> { <b>password:</b> aHVudGVyMg== }      # base64 of "hunter2"
---
<b>kind:</b> Pod        # excerpt
<b>spec:</b>
  <b>containers:</b>
  - <b>env:</b>
    - { name: LOG_LEVEL,   valueFrom: { configMapKeyRef: { name: app, key: LOG_LEVEL } } }
    - { name: DB_PASSWORD, valueFrom: { secretKeyRef: { name: db, key: password } } }
    <b>volumeMounts:</b> [{ name: config, mountPath: /etc/config }]
  <b>volumes:</b> [{ name: config, configMap: { name: app } }]</pre>`;

const css = `
.cf-stale.is-stale .iso-top, .cf-stale.is-stale .iso-fill, .cf-stale.is-stale .iso-shade { fill: var(--anatomy-red); }
.cf-stale.is-stale .iso-edge { stroke: var(--anatomy-red); }
.iso-face-text.cf-new { fill: var(--anatomy-green); }
.iso-face-text.cf-plain { fill: var(--anatomy-red); }
`;

writeLesson({
  slug: "config",
  pageTitle: "ConfigMaps & Secrets",
  fig: "Fig 8",
  title: "ConfigMaps & Secrets",
  hint: "Edit, restart and decode below",
  readout: "pod in sync",
  label:
    "ConfigMaps and Secrets drawn as a cabinet of API objects and an open pod. On the cabinet lie the ConfigMap sheet, with LOG_LEVEL and FEATURE_X, and the Secret sheet under a padlock, whose password is stored base64-encoded. The pod on the node has its lid off: an env plugboard filled once when the container starts, and a file tray mounted at /etc/config. The kubelet carries values from the cabinet to the pod along a track; a red lamp beside an env var means it no longer matches the API.",
  keys: [
    { mark: "lit", label: "A delivery from the kubelet: new files on its periodic sync, env vars only on restart" },
    { mark: "red", label: "Red lamp: this env var no longer matches the ConfigMap; restart the pod to pick it up" },
    { mark: "raised", label: "Secret: stored base64-encoded, which anyone with read access can decode" },
  ],
  caption:
    "A ConfigMap holds plain settings and a Secret holds sensitive ones; both are API objects stored in etcd. A pod can take their values as environment variables, which are copied in once when the container starts, or as files in a mounted volume, which the kubelet refreshes on its periodic sync, so the app must re-read them. Editing a ConfigMap therefore changes mounted files after a delay but never the env vars of a running container. A Secret's values are only base64-encoded: limit who can read Secrets with RBAC and enable encryption at rest.",
  body,
  controls,
  css,
  live,
});
