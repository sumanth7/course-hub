import { k, scene, RUNTIME, writeLesson } from "../shared.mjs";

const PLATE = { x: -164, y: -76, w: 328, d: 150, r: 9 };
const RACK = { x: -4, y: -66, w: 156, d: 34, r: 3 };
const RACK_H = 4;
const LOCKER_SLOTS = [12, 58, 104];
const LOCKER = (x) => ({ x, y: -62, w: 40, d: 26, r: 1.5 });
const LOCKER_H = 30;
const PRESS = { x: -150, y: -66, w: 58, d: 34, r: 3 };
const PRESS_H = 30;
const TRAY = { x: -128, y: -6, w: 150, d: 62, r: 3 };
const TRAY_Z = 4, TOP = 12;
const POD = { x: -112, y: 4, w: 110, d: 38, r: 1 };
const POD_H = 18;
const POD_TOP = TOP + POD_H;
const ZONE = { fs: { x: -108, y: 8, w: 32, d: 30 }, empty: { x: -72, y: 8, w: 32, d: 30 } };
const TILE = { w: 22, d: 14 };
const MAXT = 8;

const C = scene({ width: 640, height: 400, elevation: 34, pad: 14, fit: [...k.boxCorners(PLATE, -17, 0), [LOCKER_SLOTS[2], -62, RACK_H + LOCKER_H + 12]] });
const { P, at, S, L, D, byDepth, plate, housing, crate, lampSvg, topText, frontText, faceRect } = C;

// a stack of record tiles: MAXT thin slabs, shown up to the count
const tiles = (x, y, z, attr) => Array.from({ length: MAXT }, (_, i) => `<g ${attr}="${i}" style="opacity:0">${S(k.slabOf({ x, y, w: TILE.w, d: TILE.d, r: 0.6 }, z + i * 1.6, 1.3, P, 2), { tone: "hi", crease: "none" })}</g>`).join("");

function rack() {
  const out = [S(k.slabOf(RACK, 0, RACK_H, P, 3, 0.6), { tone: "lo" })];
  LOCKER_SLOTS.forEach((x) => out.push(L(k.planOutline(k.insetPlan(LOCKER(x), -1.2), RACK_H, P, 2), { tone: "faint" })));
  out.push(frontText(RACK.x + 4, RACK.y + RACK.d, 0.6, "PersistentVolumes", { size: 2.8, tone: "mid" }));
  return out.join("");
}
// a locker built at x = 0, slid along x into its slot from the page
function locker(i) {
  const pl = LOCKER(0);
  const out = [housing(pl, RACK_H, LOCKER_H, { seam: 0.5, plinth: false })];
  const fy = pl.y + pl.d;
  out.push(L(faceRect("y", fy, pl.x + 3, pl.x + pl.w - 3, RACK_H + 3, RACK_H + LOCKER_H - 3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: pl.x + pl.w - 9, y: fy, w: 5, d: 1.4, r: 0.5 }, RACK_H + 12, 2, P, 2), { tone: "hi", crease: "none" }));
  out.push(frontText(pl.x + 5, fy, RACK_H + LOCKER_H - 9, "", { size: 3.2, tone: "hi", attrs: `data-pvname="${i}"` }));
  out.push(frontText(pl.x + 5, fy, RACK_H + LOCKER_H - 14, "", { size: 2.6, tone: "mid", attrs: `data-pvstate="${i}"` }));
  out.push(lampSvg(pl.x + pl.w - 5, pl.y + 5, RACK_H + LOCKER_H, { r: 1.2, attr: `data-pvlamp="${i}"` }));
  out.push(tiles(pl.x + 4, pl.y + 6, RACK_H + LOCKER_H, `data-pvt-${i}`));
  return `<g data-pv="${i}" style="opacity:0">${out.join("")}</g>`;
}
function press() {
  const out = [housing(PRESS, 0, PRESS_H, { seam: 0.3 })];
  const fx = PRESS.x + PRESS.w;
  out.push(L(faceRect("x", fx, PRESS.y + 5, PRESS.y + PRESS.d - 5, 4, 20), { tone: "lo" }));
  out.push(topText(PRESS.x + 3, PRESS.y + 10, PRESS_H, "StorageClass", { size: 3.4, tone: "hi" }));
  out.push(topText(PRESS.x + 3, PRESS.y + 16, PRESS_H, "standard", { size: 3, tone: "mid" }));
  out.push(topText(PRESS.x + 3, PRESS.y + 22, PRESS_H, "provisioner: csi", { size: 2.6, tone: "lo" }));
  out.push(topText(PRESS.x + 3, PRESS.y + 28, PRESS_H, "", { size: 2.6, tone: "mid", attrs: "data-reclaim" }));
  out.push(lampSvg(PRESS.x + PRESS.w - 5, PRESS.y + 5, PRESS_H, { r: 1.2, attr: "data-pressing" }));
  return out.join("");
}
function node() {
  const out = [`<path class="iso-halo" d="${k.haloOf(TRAY, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const [x, y] of byDepth(k.corners(TRAY, 6))) out.push(S(k.cylinder(x, y, 3, 0, TRAY_Z, P, 18), { tone: "lo" }));
  out.push(S(k.slabOf(TRAY, TRAY_Z, TOP - TRAY_Z, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(TRAY, TRAY_Z + 2.4, P, 4), { tone: "faint" }) }));
  out.push(frontText(TRAY.x + 4, TRAY.y + TRAY.d, TRAY_Z + 2.2, "node-1", { size: 2.8, tone: "mid" }));
  return out.join("");
}
function pod() {
  const out = [crate(POD, TOP, POD_H, { ribs: 8, doors: false })];
  for (const [key, label] of [["fs", "container fs"], ["empty", "emptyDir"]]) {
    const z = ZONE[key];
    out.push(L(k.planOutline({ ...z, r: 1 }, POD_TOP, P, 2), { tone: "lo" }));
    out.push(topText(z.x + 2, z.y + z.d - 2.5, POD_TOP, label, { size: 2.8, tone: "mid" }));
    out.push(tiles(z.x + 5, z.y + 3, POD_TOP, `data-t-${key}`));
  }
  // the claim ticket: a tag plate for the PVC
  const tag = { x: -34, y: 10, w: 28, d: 26, r: 1 };
  out.push(S(k.slabOf(tag, POD_TOP, 1, P, 2, 0.3), { tone: "mid" }));
  out.push(topText(tag.x + 2.5, tag.y + 8, POD_TOP + 1, "pvc/data", { size: 3.2, tone: "hi", attrs: "data-pvcname" }));
  out.push(topText(tag.x + 2.5, tag.y + 14, POD_TOP + 1, "5Gi RWO", { size: 2.8, tone: "mid" }));
  out.push(topText(tag.x + 2.5, tag.y + 20, POD_TOP + 1, "", { size: 2.8, tone: "mid", attrs: "data-pvcstate" }));
  out.push(frontText(POD.x + 4, POD.y + POD.d, TOP + 6, "", { size: 3.2, tone: "hi", attrs: "data-podname" }));
  out.push(S(k.slabOf({ x: POD.x + POD.w, y: 20, w: 1.8, d: 6, r: 0.5 }, TOP + 6, 4, P, 2), { tone: "mid", crease: "none" }));
  return `<g data-pod>${out.join("")}</g>`;
}

const body = [
  plate(PLATE, { ruler: false }),
  press(),
  rack(),
  [0, 1, 2].map(locker).join(""),
  node(),
  pod(),
  `<path data-mount class="st-mount" d=""/><circle data-mount-a class="iso-wire-end" r="1.1"/><circle data-mount-b class="iso-wire-end" r="1.1"/>`,
].join("");

const live = `
const P = ${JSON.stringify(P)};
${RUNTIME}
const LOCKER_SLOTS = ${JSON.stringify(LOCKER_SLOTS)}, PRESS = ${JSON.stringify(PRESS)}, POD = ${JSON.stringify(POD)}, MAXT = ${MAXT}, TOP = ${TOP}, RACK_H = ${RACK_H};
const ui = { status: document.getElementById("st-status"), rows: document.getElementById("st-rows"), policy: document.getElementById("st-policy"), pvcBtn: document.getElementById("st-pvc") };

// ---- model ----
let pvSeq = 0, podSeq = 0;
const data = { fs: 0, empty: 0 };
const pvs = [];          // { id, slot, state, data, x, born }
const pvc = { exists: true, pv: null, pending: 0 };
let policy = "Delete", podName = "", podFade = 1, podGone = 0, restartT = 0, pressing = 0, msg = "";
const pvName = (id) => "pvc-" + ["8f2c", "b71a", "4d9e", "e05b", "c3a7", "71fd"][id % 6];
function newPod() { podName = "app-7c9d-" + ["k2m4", "x8qp", "t3vn", "r6wz"][podSeq++ % 4]; }
function provision() {
  // dynamic provisioning: the StorageClass makes a new volume for the claim
  const slot = [0, 1, 2].find((s) => !pvs.some((v) => v.slot === s));
  if (slot === undefined) { msg = "The rack is full of Released volumes. Delete them (an admin task) to make room."; return; }
  const v = { id: pvSeq++, slot, state: "Provisioning", data: 0, x: PRESS.x + PRESS.w - 4, t: 0 };
  pvs.push(v); pvc.pv = v.id; pressing = 1.6;
}
newPod();
provision(); pvs[0].x = LOCKER_SLOTS[0]; pvs[0].state = "Bound"; pressing = 0;
const boundPv = () => pvs.find((v) => v.id === pvc.pv);

function write() {
  if (podGone || restartT) return;
  data.fs++; data.empty++;
  const v = boundPv(); if (v && v.state === "Bound") v.data++;
  msg = "The app wrote a record to each place: its container's filesystem, the pod's emptyDir, and the PersistentVolume.";
}
function restartContainer() {
  restartT = 1.2; data.fs = 0;
  msg = "The container crashed and was restarted: its own filesystem starts fresh, so that record is gone. The emptyDir belongs to the pod and the PV is outside it, so both keep their data.";
}
function deletePod() {
  podGone = 1.6; data.fs = 0; data.empty = 0;
  msg = "The pod was deleted and its Deployment made a new one. emptyDir lives and dies with the pod, so it is empty. The new pod mounts the same claim, so the PV's data is still there.";
}
function togglePvc() {
  if (pvc.exists) {
    pvc.exists = false;
    const v = boundPv(); pvc.pv = null;
    if (v) {
      if (policy === "Delete") { v.state = "Deleting"; v.t = 0; msg = "PVC deleted with reclaimPolicy Delete: the volume and all its data are deleted too."; }
      else { v.state = "Released"; msg = "PVC deleted with reclaimPolicy Retain: the volume and its data stay, marked Released. It is not reused automatically; an admin must recover or delete it."; }
    }
  } else {
    pvc.exists = true;
    provision();
    msg = "New PVC: the StorageClass provisions a brand-new, empty volume and binds it to the claim.";
  }
}
function setPolicy() { policy = policy === "Delete" ? "Retain" : "Delete"; msg = "reclaimPolicy is set on the StorageClass and copied to each volume it makes. It decides what happens to the volume when its claim is deleted."; }

function step(dt) {
  pressing = Math.max(0, pressing - dt);
  if (restartT) restartT = Math.max(0, restartT - dt);
  if (podGone) { podGone = Math.max(0, podGone - dt); if (podGone === 0) newPod(); }
  for (const v of pvs) {
    v.t = (v.t || 0) + dt;
    const tx = v.state === "Provisioning" && pressing > 0.6 ? PRESS.x + PRESS.w - 4 : LOCKER_SLOTS[v.slot];
    v.x = ease(v.x, tx, dt, 0.35);
    if (v.state === "Provisioning" && pressing === 0 && Math.abs(v.x - tx) < 0.5) v.state = pvc.pv === v.id ? "Bound" : "Available";
  }
  for (let i = pvs.length - 1; i >= 0; i--) if (pvs[i].state === "Deleting" && pvs[i].t > 1.2) pvs.splice(i, 1);
}

function draw() {
  for (const key of ["fs", "empty"]) for (let i = 0; i < MAXT; i++) $('[data-t-' + key + '="' + i + '"]').style.opacity = i < data[key] ? 1 : 0;
  [0, 1, 2].forEach((i) => {
    const g = $('[data-pv="' + i + '"]');
    const v = pvs.find((p) => p.slot === i);
    if (!v) { g.style.opacity = 0; return; }
    g.style.opacity = v.state === "Deleting" ? Math.max(0, 1 - v.t / 1.2) : v.state === "Released" ? 0.6 : 1;
    g.setAttribute("transform", translateAlong(P, [v.x, 0, 0]));
    setText(g.querySelector("[data-pvname]"), pvName(v.id));
    setText(g.querySelector("[data-pvstate]"), v.state + " · 5Gi");
    $('[data-pvlamp="' + i + '"]').style.opacity = v.state === "Bound" ? 1 : 0.15;
    for (let t = 0; t < MAXT; t++) $('[data-pvt-' + i + '="' + t + '"]').style.opacity = t < v.data ? 1 : 0;
  });
  // the mount: from the pod's side port, along the floor, to the bound locker's door
  const v = boundPv();
  const mount = $("[data-mount]");
  if (v && v.state === "Bound" && !podGone) {
    const lx = v.x + 20;
    const pts = [[POD.x + POD.w + 1.8, 23, TOP + 8], [POD.x + POD.w + 8, 23, TOP + 1.5], [26, 23, TOP + 1.5], [26, 23, 0.3], [lx, 23, 0.3], [lx, -30, 0.3], [lx, -30, RACK_H + 4], [lx, -36, RACK_H + 9]].map(at);
    mount.setAttribute("d", "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L"));
    $("[data-mount-a]").setAttribute("cx", pts[0][0]); $("[data-mount-a]").setAttribute("cy", pts[0][1]);
    $("[data-mount-b]").setAttribute("cx", pts[7][0]); $("[data-mount-b]").setAttribute("cy", pts[7][1]);
    [mount, $("[data-mount-a]"), $("[data-mount-b]")].forEach((e) => (e.style.opacity = 1));
  } else [mount, $("[data-mount-a]"), $("[data-mount-b]")].forEach((e) => (e.style.opacity = 0));
  $("[data-pod]").style.opacity = podGone ? Math.max(0.15, Math.abs(podGone - 0.8) / 0.8) : restartT ? 0.5 + 0.5 * Math.abs(Math.cos(restartT * 6)) : 1;
  setText($("[data-podname]"), "pod/" + podName);
  setText($("[data-pvcstate]"), pvc.exists ? (v && v.state === "Bound" ? "Bound" : "Pending") : "deleted");
  $("[data-pvcname]").style.opacity = pvc.exists ? 1 : 0.35;
  setText($("[data-reclaim]"), "reclaimPolicy: " + policy);
  $("[data-pressing]").style.opacity = pressing > 0 ? 1 : 0.15;
  ui.policy.textContent = "reclaimPolicy: " + policy;
  ui.pvcBtn.textContent = pvc.exists ? "Delete the PVC" : "Create the PVC again";
  const pvData = v ? v.data : 0;
  say("container fs " + data.fs + " · emptyDir " + data.empty + " · PV " + (v ? pvData : "none"));
  setText(ui.status, msg || "Press Write a record a few times, then restart the container or delete the pod and see which data survives.");
  ui.status.dataset.tone = /gone|deleted too|empty\\./.test(msg) ? "bad" : "";
  const html = [["Container filesystem", data.fs, "the container", "lost on container restart"], ["emptyDir volume", data.empty, "the pod", "lost when the pod is deleted"], ["PersistentVolume via PVC", v ? pvData : "–", "the cluster", "kept until its claim is deleted (then reclaimPolicy)"]]
    .map((r) => "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td><td>" + r[2] + "</td><td>" + r[3] + "</td></tr>").join("");
  if (ui.rows.__h !== html) { ui.rows.innerHTML = html; ui.rows.__h = html; }
}

const A = animate({
  tick(dt) { step(dt); draw(); },
  tour: [{ hold: 2 }, { w: 1 }, { hold: 0.8 }, { w: 1 }, { hold: 0.8 }, { w: 1 }, { hold: 3 }, { rc: 1 }, { hold: 5 }, { w: 1 }, { hold: 2 }, { dp: 1 }, { hold: 6 }, { w: 1 }, { hold: 3 }, { pvc: 1 }, { hold: 5 }, { pvc: 1 }, { hold: 5 }, { pol: 1 }, { w: 1 }, { hold: 2 }, { pvc: 1 }, { hold: 6 }, { pvc: 1 }, { hold: 5 }, { pol: 1 }],
  act(s) { if (s.w) write(); if (s.rc) restartContainer(); if (s.dp) deletePod(); if (s.pvc) togglePvc(); if (s.pol) setPolicy(); },
});
controls({ write, rc: restartContainer, dp: deletePod, pvc: togglePvc, pol: setPolicy }, A.takeOver);
draw();
`;

const controls = `<div class="lx-controls" role="group" aria-label="Storage controls">
  <button type="button" data-do="write">Write a record</button>
  <button type="button" data-do="rc">Restart the container</button>
  <button type="button" data-do="dp" class="is-danger">Delete the pod</button>
  <button type="button" data-do="pvc" id="st-pvc" class="is-danger">Delete the PVC</button>
  <button type="button" data-do="pol" id="st-policy">reclaimPolicy: Delete</button>
  <p class="lx-status" id="st-status" aria-live="polite"></p>
</div>
<div class="lx-table-wrap"><table class="lx-table"><thead><tr><th>Where the app writes</th><th>Records</th><th>Lives as long as</th><th>So</th></tr></thead><tbody id="st-rows"></tbody></table></div>
<pre class="lx-yaml"><b>kind:</b> PersistentVolumeClaim
<b>metadata:</b> { name: data }
<b>spec:</b> { <b>storageClassName:</b> standard, <b>accessModes:</b> [ReadWriteOnce], <b>resources:</b> { requests: { storage: 5Gi } } }
---
<b>kind:</b> Pod      # excerpt
<b>spec:</b>
  <b>volumes:</b>
  - { name: scratch, <b>emptyDir:</b> {} }
  - { name: data,    <b>persistentVolumeClaim:</b> { claimName: data } }</pre>`;

writeLesson({
  slug: "storage",
  pageTitle: "Volumes, PVs & PVCs",
  fig: "Fig 11",
  title: "Volumes, PVs & PVCs",
  hint: "Write records, then restart or delete below",
  readout: "container fs 0 · emptyDir 0 · PV 0",
  label:
    "Storage drawn as lockers and a claim ticket. A pod crate on a node shows two record trays on its lid, its container's own filesystem and an emptyDir volume, and a claim-ticket plate for its PersistentVolumeClaim. At the back, a rack holds PersistentVolumes drawn as lockers, and a StorageClass press beside it builds a new locker when a claim needs one. A cable runs from the pod to the locker its claim is bound to. Records are thin tiles stacked in each place.",
  keys: [
    { mark: "raised", label: "Tiles: records the app has written, in the container, the emptyDir and the PV" },
    { mark: "lit", label: "Locker lamp: the PersistentVolume is Bound to the pod's claim" },
    { mark: "edge", label: "Cable: the pod mounts the PV through its claim" },
  ],
  caption:
    "A container's own filesystem is thrown away whenever it restarts. An emptyDir volume belongs to the pod, so it survives container restarts but is deleted with the pod. For data that must outlive pods, a pod mounts a PersistentVolumeClaim: a request for storage of a size, access mode and class. A StorageClass provisions a PersistentVolume to satisfy the claim and binds the two. A replacement pod that uses the same claim finds the same data. When the claim is deleted, the volume's reclaimPolicy decides: Delete removes it and its data, Retain keeps it as Released for an admin to recover.",
  body,
  controls,
  css: `.st-mount { fill: none; stroke: var(--anatomy-hi); stroke-width: .8; stroke-dasharray: 2 1.4; }`,
  live,
});
