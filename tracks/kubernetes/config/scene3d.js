// Lesson 08 in 3D: API objects in a cabinet, and an open pod with an env plugboard and a mounted file tray.
const S = createStage({ home: { target: [0, 22, -4], dir: [1, 1.1, 1.05], zoom: 1.1 }, viewH: 250 });
const { box, cyl, lamp, crate, housing, track, part, own, label } = S;

const CAB = { x: -92, z: -14, w: 92, d: 64, h: 22 };
const TRAY = { x: 67, z: -10, w: 150, d: 92 }, TOP = 12;
const POD = { x: 78, z: -17, w: 112, d: 58, h: 20 };
const ENV = { x: 53, z: -17 }, FILES = { x: 106, z: -17 };
const KUBELET = { x: 13, z: 22, w: 26, d: 16, h: 9 };
const LANE_Z = 46, FY = 1.9;

part("plate", { kind: "Cluster", title: "Config, outside and inside the pod", noFrame: true, zoom: 1, anchor: V(0, 30, -4), desc: "On the left, two API objects stored in etcd. On the right, a pod with its lid off, so you can see where their values end up.", yaml: "kubectl get configmap app -o yaml\nkubectl get secret db -o yaml" });
own("plate", S.plate({ x: 2, z: -2, w: 298, d: 124 }), track([[[CAB.x + 34, CAB.z + CAB.d / 2], [CAB.x + 34, LANE_Z]], [[CAB.x + 34, LANE_Z], [KUBELET.x, LANE_Z]], [[KUBELET.x, KUBELET.z + 8], [KUBELET.x, LANE_Z]]], { width: 4.8 }));

// the API cabinet with a ConfigMap sheet and a Secret sheet under a padlock
part("cabinet", { kind: "API server · etcd", title: "API objects", zoom: 1.8, anchor: V(CAB.x, CAB.h + 16, CAB.z), desc: "ConfigMaps and Secrets are API objects, stored in etcd like everything else. Pods refer to them by name.", yaml: "kubectl get configmaps,secrets" });
own("cabinet", housing({ x: CAB.x, z: CAB.z, w: CAB.w, d: CAB.d, h: CAB.h }));
part("configmap", { kind: "ConfigMap", title: "configmap/app", zoom: 3, anchor: V(CAB.x - 23, CAB.h + 8, CAB.z),
  desc: () => `Plain settings: LOG_LEVEL=<b>${api.LOG_LEVEL}</b>, FEATURE_X=<b>${api.FEATURE_X}</b>. Edit it and the API has the new values at once; whether the pod sees them depends on how it uses them.`,
  yaml: () => `kind: ConfigMap\nmetadata: { name: app }\ndata:\n  LOG_LEVEL: ${api.LOG_LEVEL}\n  FEATURE_X: "${api.FEATURE_X}"`,
  actions: () => [{ label: "Edit LOG_LEVEL", run: () => edit("LOG_LEVEL") }, { label: "Edit FEATURE_X", run: () => edit("FEATURE_X") }] });
const cmSheet = box(44, 0.8, 56, { x: CAB.x - 23, y0: CAB.h, z: CAB.z, tone: "hi", r: 0.6 });
own("configmap", cmSheet);
label("configmap", "configmap/app");
const cmLabel = S.label("configmap", "", { small: true, anchor: V(CAB.x - 23, CAB.h + 3, CAB.z + 10) });
part("secret", { kind: "Secret", title: "secret/db", zoom: 3, anchor: V(CAB.x + 23, CAB.h + 8, CAB.z),
  desc: () => decoded ? "base64 -d gives <b>hunter2</b> back. A Secret is only encoded, not encrypted: anyone allowed to read it can decode it. Limit who can read Secrets with RBAC and turn on encryption at rest." : "Sensitive values, stored <b>base64-encoded</b>: password = aHVudGVyMg==. Pods get the decoded value.",
  yaml: "kind: Secret\nmetadata: { name: db }\ndata:\n  password: aHVudGVyMg==   # base64 of hunter2",
  actions: () => [{ label: decoded ? "Hide the value" : "Decode it", danger: !decoded, run: () => { decoded = !decoded; } }] });
own("secret", box(36, 0.8, 56, { x: CAB.x + 23, y0: CAB.h, z: CAB.z, tone: "hi", r: 0.6 }), box(10, 6, 7, { x: CAB.x + 23, y0: CAB.h + 0.8, z: CAB.z + 16, r: 1 }));
const shackle = new THREE.Group();
shackle.add(box(1.6, 4, 2, { x: -3, y0: 0, z: 0, r: 0.4 }), box(1.6, 4, 2, { x: 3, y0: 0, z: 0, r: 0.4 }), box(7.6, 1.6, 2, { x: 0, y0: 4, z: 0, r: 0.5 }));
shackle.position.set(CAB.x + 23, CAB.h + 6.8, CAB.z + 16);
own("secret", shackle);
label("secret", "secret/db");
const secLabel = S.label("secret", "", { small: true, anchor: V(CAB.x + 23, CAB.h + 3, CAB.z) });

// the node, the kubelet, and the open pod
part("node", { kind: "Node", title: "node-1", zoom: 1.6, anchor: V(TRAY.x, TOP + 4, TRAY.z + 46), desc: "The node running the pod.", yaml: "" });
own("node", S.tray({ x: TRAY.x, z: TRAY.z, w: TRAY.w, d: TRAY.d, top: TOP }));
part("kubelet", { kind: "kubelet", title: "kubelet", zoom: 3, anchor: V(KUBELET.x, TOP + KUBELET.h + 8, KUBELET.z), desc: "Fetches ConfigMaps and Secrets for the pods on its node. Env vars are filled once, when a container starts; mounted volumes are refreshed on the kubelet's periodic sync (about a minute in a real cluster, a few seconds here).", yaml: "" });
own("kubelet", housing({ x: KUBELET.x, z: KUBELET.z, w: KUBELET.w, d: KUBELET.d, h: KUBELET.h, y0: TOP, plinth: false }));
const klLamp = lamp(KUBELET.x + 9, TOP + KUBELET.h, KUBELET.z - 4, { r: 1 });
own("kubelet", klLamp.mesh);
label("kubelet", "kubelet");
part("pod", { kind: "Pod", title: "pod/app (lid off)", zoom: 2, anchor: V(POD.x, TOP + POD.h + 14, POD.z), desc: () => (restarting ? "Restarting: the new container will read its environment as it is now." : "The pod's container sees config in two ways: env vars on the left, files on the right."), yaml: "",
  actions: () => [{ label: "Restart the pod", run: restart }] });
own("pod", S.openBox({ x: POD.x, z: POD.z, w: POD.w, d: POD.d, h: POD.h, y0: TOP }));
part("env", { kind: "Environment variables", title: "env (read at start)", zoom: 3.2, anchor: V(ENV.x, TOP + 14, ENV.z),
  desc: () => { const stale = ["LOG_LEVEL", "FEATURE_X"].filter((k) => env[k] !== api[k]); return "Copied into the container when it starts, and never changed after that. " + (stale.length ? `<b>${stale.join(", ")}</b> no longer match${stale.length === 1 ? "es" : ""} the ConfigMap: restart the pod to pick up the change.` : "They match the ConfigMap."); },
  yaml: "env:\n- name: LOG_LEVEL\n  valueFrom: { configMapKeyRef: { name: app, key: LOG_LEVEL } }\n- name: DB_PASSWORD\n  valueFrom: { secretKeyRef: { name: db, key: password } }",
  actions: () => [{ label: "Restart the pod", run: restart }] });
own("env", box(50, 10, 48, { x: ENV.x, y0: TOP + 1.6, z: ENV.z, tone: "mid", r: 0.6 }));
const ROWS = ["LOG_LEVEL", "FEATURE_X", "DB_PASSWORD"];
const envRows = ROWS.map((k, i) => { const l = lamp(ENV.x + 21, TOP + 11.6, ENV.z - 12 + i * 12, { r: 1.1, state: "off" }); own("env", l.mesh); const L = S.label("env", "", { small: true, anchor: V(ENV.x - 4, TOP + 13, ENV.z - 12 + i * 12) }); return { l, L, k }; });
label("env", "env vars", { anchor: V(ENV.x, TOP + 18, ENV.z - 26) });
part("files", { kind: "Mounted volume", title: "/etc/config (volume)", zoom: 3.2, anchor: V(FILES.x, TOP + 14, FILES.z),
  desc: () => (isFinite(syncIn) ? `The ConfigMap changed; the kubelet will refresh these files in about ${Math.ceil(syncIn)} s. The app must re-read them to notice.` : "One file per key, refreshed by the kubelet when the ConfigMap changes. No restart needed, but the app must re-read the file."),
  yaml: "volumeMounts: [{ name: config, mountPath: /etc/config }]\nvolumes: [{ name: config, configMap: { name: app } }]" });
own("files", box(43, 10, 48, { x: FILES.x, y0: TOP + 1.6, z: FILES.z, tone: "mid", r: 0.6 }));
const fileCards = ["LOG_LEVEL", "FEATURE_X"].map((k, i) => { const c = box(37, 0.6, 12, { x: FILES.x, y0: TOP + 11.6, z: FILES.z - 8 + i * 16, tone: "hi", r: 0.4 }); own("files", c); const L = S.label("files", "", { small: true, anchor: V(FILES.x, TOP + 14, FILES.z - 8 + i * 16) }); return { c, L, k }; });
label("files", "/etc/config", { anchor: V(FILES.x, TOP + 18, FILES.z - 26) });

// ---- model ----
const SYNC_DELAY = 5;
const api = { LOG_LEVEL: "info", FEATURE_X: "off", DB_PASSWORD: "hunter2" };
const env = { ...api }, files = { LOG_LEVEL: "info", FEATURE_X: "off" };
let syncIn = Infinity, restarting = 0, decoded = false, cmFlash = 0, msg = "";
function edit(key) {
  api[key] = key === "LOG_LEVEL" ? (api[key] === "info" ? "debug" : "info") : api[key] === "off" ? "on" : "off";
  cmFlash = 1;
  if (!isFinite(syncIn)) syncIn = SYNC_DELAY;
  msg = `Edited configmap/app: ${key}=${api[key]}. The mounted file follows on the kubelet's next sync; the env var will not change until the container restarts.`;
}
function restart() { if (!restarting) { restarting = 1.6; msg = "Restarting the pod: the new container reads its environment from the ConfigMap and Secret as they are now."; } }
const cabPort = V(CAB.x + 34, FY, CAB.z + CAB.d / 2 + 1);
const net = S.packets({ speed: 90, onArrive: (d) => {
  if (d.stage === 0) { const target = d.what === "files" ? FILES : ENV; net.add([V(KUBELET.x + KUBELET.w / 2, TOP + 1.5, KUBELET.z), V(target.x, TOP + 1.5, KUBELET.z), V(target.x, TOP + 12, target.z + 24)], { ...d, stage: 1 }); }
  else if (d.what === "files") { Object.assign(files, { LOG_LEVEL: api.LOG_LEVEL, FEATURE_X: api.FEATURE_X }); fresh.files = 1; }
  else { Object.assign(env, api); fresh.env = 1; }
} });
const fresh = { files: 0, env: 0 };
const deliver = (what) => net.add([cabPort, V(cabPort.x, FY, LANE_Z), V(KUBELET.x, FY, LANE_Z), V(KUBELET.x, FY, KUBELET.z + 9)], { what, stage: 0 });

S.onTick((dt) => {
  cmFlash = Math.max(0, cmFlash - dt * 1.5);
  if (isFinite(syncIn)) { syncIn -= dt; if (syncIn <= 0) { syncIn = Infinity; deliver("files"); } }
  if (restarting) { restarting = Math.max(0, restarting - dt); if (!restarting) deliver("env"); }
  net.step(dt);
  fresh.files = Math.max(0, fresh.files - dt); fresh.env = Math.max(0, fresh.env - dt);
  cmLabel.el.textContent = `LOG_LEVEL: ${api.LOG_LEVEL} · FEATURE_X: ${api.FEATURE_X}`;
  cmLabel.el.classList.toggle("is-good", cmFlash > 0);
  secLabel.el.textContent = decoded ? "password: hunter2" : "password: aHVudGVyMg==";
  secLabel.el.classList.toggle("is-bad", decoded);
  shackle.position.y = CAB.h + 6.8 + (decoded ? 2.5 : 0);
  envRows.forEach(({ l, L, k }) => { const stale = env[k] !== api[k]; l.set(stale ? "bad" : "off"); L.el.textContent = `${k}=${env[k]}`; L.el.classList.toggle("is-bad", stale); L.el.classList.toggle("is-good", fresh.env > 0); });
  fileCards.forEach(({ L, k }) => { L.el.textContent = `${k.toLowerCase()}: ${files[k]}`; L.el.classList.toggle("is-good", fresh.files > 0); L.el.classList.toggle("is-bad", files[k] !== api[k]); });
  klLamp.set(net.list.length ? "accent" : "off");
  S.PARTS.pod.meshes.forEach((m) => (m.visible = !(restarting && Math.cos(restarting * 8) > 0.3)));
  const staleN = ["LOG_LEVEL", "FEATURE_X"].filter((k) => env[k] !== api[k]).length;
  S.say(isFinite(syncIn) ? `volume sync in ${Math.ceil(syncIn)}s` : staleN ? `${staleN} env var${staleN > 1 ? "s" : ""} stale · restart to apply` : "pod in sync");
  syncUi(staleN);
});

S.overview = () => `<h2>Where config ends up</h2><p class="muted">Edit the ConfigMap and compare the env vars with the mounted files. Pick a part:</p>`;
const ui = { status: document.getElementById("cf-status"), rows: document.getElementById("cf-rows"), decode: document.getElementById("cf-decode") };
document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => {
  S.stopTour();
  const a = b.dataset.do;
  if (a === "log") edit("LOG_LEVEL"); if (a === "feat") edit("FEATURE_X"); if (a === "restart") restart(); if (a === "decode") decoded = !decoded;
  S.renderPanel();
}));
function syncUi(staleN) {
  const m = msg || "The pod reads LOG_LEVEL and FEATURE_X from configmap/app twice: as env vars at start, and as files in a mounted volume.";
  if (ui.status.textContent !== m) ui.status.textContent = m;
  ui.status.dataset.tone = staleN ? "bad" : "";
  ui.decode.setAttribute("aria-pressed", String(decoded));
  const row = (k, src) => `<tr><td>${k}</td><td>${src}</td><td>${api[k]}</td><td data-tone="${env[k] === api[k] ? "good" : "bad"}">${env[k]}${env[k] === api[k] ? "" : " (stale)"}</td><td data-tone="${k in files ? (files[k] === api[k] ? "good" : "bad") : ""}">${k in files ? files[k] + (files[k] === api[k] ? "" : " (syncing)") : "not mounted"}</td></tr>`;
  const html = row("LOG_LEVEL", "configmap/app") + row("FEATURE_X", "configmap/app") + row("DB_PASSWORD", "secret/db");
  if (ui.rows.__h !== html) { ui.rows.innerHTML = html; ui.rows.__h = html; }
}

S.setTour([
  { home: true, say: "Two API objects on the left, and a pod with its lid off on the right, so we can see where their values end up.", hold: 6 },
  { focus: "configmap", zoom: 3, say: "Edit the ConfigMap: LOG_LEVEL becomes debug. The API has the new value immediately.", run: () => { if (api.LOG_LEVEL === "info") edit("LOG_LEVEL"); }, hold: 5 },
  { focus: "files", zoom: 3, say: "The mounted file follows after the kubelet's next sync, with no restart...", hold: 3, until: () => !isFinite(syncIn) && files.LOG_LEVEL === api.LOG_LEVEL },
  { focus: "env", zoom: 3, say: "...but the env var is still info: environment variables are copied once, at start. The red lamp marks it stale.", hold: 6 },
  { focus: "pod", zoom: 2, say: "Restart the pod, and the new container reads the current values.", run: restart, hold: 3, until: () => env.LOG_LEVEL === api.LOG_LEVEL },
  { focus: "secret", zoom: 3, say: "The Secret looks scrambled, but it is only base64. Decoding it gives the password straight back.", run: () => { decoded = true; }, hold: 7 },
  { home: true, say: "Env vars: read at start. Files: refreshed on sync. Secrets: encoded, so protect who can read them.", run: () => { decoded = false; }, hold: 6 },
]);
S.start();
