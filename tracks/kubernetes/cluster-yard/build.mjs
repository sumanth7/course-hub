import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";


const SKILL = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const k = await import(join(SKILL, "kit/iso-kit.mjs"));
const { kitScript } = await import(join(SKILL, "scripts/inline-kit.mjs"));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../../site/kubernetes/cluster-yard");
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 380;

// World layout (units ≈ px). x along the yard, y across, z up.
const PLATE = { x: -164, y: -78, w: 328, d: 184, r: 9 };
const PLATE_H = 12;
const FOOT_H = 5;

const RAIL_Y = [-60, 60];
const RAIL_X = [-156, 120];
const RAIL_H = 3;

const NODES = [-58, 14, 86];
const TRAY_Z = 4;
const TRAY_H = 7;
const TRAY_TOP = TRAY_Z + TRAY_H;
const TRAY = (cx) => ({ x: cx - 30, y: -42, w: 60, d: 84, r: 3 });
const SLOT_DX = [-14, 14];
const SLOT_DY = [-19, 19];
const SLOTS = NODES.flatMap((cx, node) => SLOT_DX.flatMap((dx) => SLOT_DY.map((dy) => ({ node, x: cx + dx, y: dy }))));

const POD = { w: 22, d: 32, h: 15 };

const HOPPER = { x: -146, y: -46, w: 30, d: 38, r: 2 };
const BIN = { x: -146, y: 2, w: 30, d: 38, r: 2 };
const BOX_H = 22;
const HOP_C = [HOPPER.x + HOPPER.w / 2, HOPPER.y + HOPPER.d / 2];
const BIN_C = [BIN.x + BIN.w / 2, BIN.y + BIN.d / 2];

const TRACK_Y = 76;
const GATE = { x: 108, y: 67, w: 26, d: 21, r: 2 };
const GATE_H = 18;
const INGRESS = { x: 142, y: 62, w: 18, d: 30, r: 2 };
const INGRESS_H = 24;
const PORT_Z = 9;
const REJECT = { x: 145.5, y: 94, w: 11, d: 9, r: 1.2 };
const TRACK = { x: -62, y: TRACK_Y - 3, w: INGRESS.x + 1 - -62, d: 6, r: 1 };
const PORT_Y = 45.5;
const DESK = { x: 124, y: -34, w: 30, d: 68, r: 3 };
const DESK_H = 30;
const KNOB = [139, -14];
const KNOB_R = 6;
const DIAL_R = 11.5;
const MAX_REPLICAS = 12;
const DIAL_SPAN = Math.PI * 1.5;
const DIAL_FROM = -Math.PI * 0.75;

const LEG_TOP = 104;
const BEAM_Z = 104;
const BEAM_H = 7;
const GIRDER_Z = BEAM_Z + BEAM_H;
const GIRDER_H = 8;
const GIRDER_TOP = GIRDER_Z + GIRDER_H;
const TROLLEY_H = 7;
const SPREADER_H = 3;
const TRAVEL_Z = 46;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [RAIL_X[0], RAIL_Y[0], GIRDER_TOP + TROLLEY_H + 6], [RAIL_X[1], RAIL_Y[1], GIRDER_TOP + TROLLEY_H + 6], [184, 76, PORT_Z]],
  WIDTH,
  HEIGHT,
  { pad: 20, azimuth: 52 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const seg = (a, b) => k.segment(a, b, P);
const depth2 = ([x, y]) => k.depthOf([x, y, 0], P);
const byDepth = (points) => [...points].sort((a, b) => depth2(a) - depth2(b));

// ---------- base ----------
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 7.5, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.8, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 9, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -4, P, 9), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // the Service track and its spurs: inlays in the plate that pass under the front rail
  for (const cx of NODES) {
    const spur = { x: cx - 2.4, y: 43.8, w: 4.8, d: TRACK.y - 43.8 + 1, r: 0.8 };
    out.push(S(k.slabOf(spur, 0, 0.6, P, 2), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline(k.insetPlan(spur, 1.2), 0.6, P, 2), { tone: "faint" }));
  }
  out.push(S(k.slabOf(TRACK, 0, 0.6, P, 2), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(TRACK, 1.4), 0.6, P, 2), { tone: "faint" }));
  // ruler strip along the front
  const strip = { x: -120, y: PLATE.y + PLATE.d - 13, w: 232, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }));
  // label plate, front left
  const label = { x: -150, y: PLATE.y + PLATE.d - 20, w: 24, d: 12, r: 1 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 3), { tone: "faint" }));
  [[4, 16], [4, 12], [4, 18]].forEach(([dx, len], i) => out.push(L(k.lineOnTop([label.x + dx, label.y + 3.6 + i * 2.4], [label.x + dx + len, label.y + 3.6 + i * 2.4], 0.8, P), { tone: "lo", free: true })));
  out.push(D([at([label.x + 2, label.y + 2, 0.8]), at([label.x + label.w - 2, label.y + label.d - 2, 0.8])], { size: 0.4 }));
  return out.join("");
}

function rail(y) {
  const out = [];
  const plan = { x: RAIL_X[0], y: y - 2.5, w: RAIL_X[1] - RAIL_X[0], d: 5, r: 1 };
  out.push(S(k.slabOf({ x: plan.x - 2, y: y - 4.5, w: plan.w + 4, d: 9, r: 1.2 }, 0, 1, P, 3), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf(plan, 1, RAIL_H, P, 3, 0.4), { tone: "mid" }));
  out.push(D([...Array(10)].map((_, i) => at([plan.x + 8 + i * ((plan.w - 16) / 9), y + 3.6, 1])), { size: 0.38, tone: "lo" }));
  for (const x of [RAIL_X[0] - 6, RAIL_X[1] + 1]) {
    out.push(S(k.slabOf({ x, y: y - 5, w: 5, d: 10, r: 1.2 }, 0, 8, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2.5, y - 2.4, 8]), at([x + 2.5, y + 2.4, 8])], { size: 0.42 }));
  }
  return out.join("");
}

// ---------- registry hopper and reclaim bin (open-topped boxes) ----------
function openBox(plan, mark) {
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(plan, 0, BOX_H, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(plan, 6, P, 4), { tone: "faint" }) }));
  const mouth = k.insetPlan(plan, 2.4);
  out.push(`<path d="${k.planOutline(mouth, BOX_H, P, 3)}" style="fill:var(--anatomy-shade-0);stroke:none"/>`);
  out.push(L(k.planOutline(mouth, BOX_H, P, 3), { tone: "lo" }));
  // inner far walls seen through the mouth
  out.push(L(seg([mouth.x, mouth.y, BOX_H], [mouth.x, mouth.y, BOX_H - 4]) + seg([mouth.x + mouth.w, mouth.y, BOX_H], [mouth.x + mouth.w, mouth.y, BOX_H - 4]), { tone: "faint", free: "end" }));
  out.push(D(k.corners(plan, 1.2).map(([x, y]) => at([x, y, BOX_H])), { size: 0.4 }));
  // lift / chute rail on the +x face
  const fx = plan.x + plan.w;
  out.push(S(k.slabOf({ x: fx, y: plan.y + plan.d / 2 - 3, w: 1.6, d: 6, r: 0.6 }, 4, 14, P, 2), { tone: "mid", crease: "none" }));
  out.push(D([at([fx + 1.6, plan.y + plan.d / 2, 6]), at([fx + 1.6, plan.y + plan.d / 2, 16])], { size: 0.4 }));
  if (mark === "up") out.push(L(seg([fx + 1.6, plan.y + plan.d / 2 - 1.6, 9.5], [fx + 1.6, plan.y + plan.d / 2, 12]) + seg([fx + 1.6, plan.y + plan.d / 2, 12], [fx + 1.6, plan.y + plan.d / 2 + 1.6, 9.5]), { tone: "hi", free: true }));
  else out.push(L(seg([fx + 1.6, plan.y + plan.d / 2 - 1.6, 12.5], [fx + 1.6, plan.y + plan.d / 2, 10]) + seg([fx + 1.6, plan.y + plan.d / 2, 10], [fx + 1.6, plan.y + plan.d / 2 + 1.6, 12.5]), { tone: "hi", free: true }));
  return out.join("");
}
// a clip that keeps only what lies above a box's top face (what has risen out of its mouth)
function mouthClip(id, plan) {
  const m = k.insetPlan(plan, 2.4);
  const pts = [[m.x, m.y + m.d], [m.x + m.w, m.y + m.d], [m.x + m.w, m.y]].map(([x, y]) => at([x, y, BOX_H]));
  const back = at([m.x, m.y, BOX_H]);
  const left = Math.min(pts[0][0], back[0]);
  const right = Math.max(pts[2][0], back[0]);
  const d = `M${left} -2000L${left} ${pts[0][1]}L${pts[0][0]} ${pts[0][1]}L${pts[1][0]} ${pts[1][1]}L${pts[2][0]} ${pts[2][1]}L${right} ${pts[2][1]}L${right} -2000Z`;
  return `<clipPath id="${id}"><path d="${d}"/></clipPath>`;
}

// ---------- a pod: a ribbed shipping crate, built centred at the origin, bottom at z = 0 ----------
function podSvg({ lit = false } = {}) {
  const plan = { x: -POD.w / 2, y: -POD.d / 2, w: POD.w, d: POD.d, r: 0.8 };
  const out = [];
  const x1 = plan.x + plan.w;
  const y1 = plan.y + plan.d;
  const ribs = [];
  for (let i = 1; i < 8; i++) ribs.push(seg([x1, plan.y + i * (plan.d / 8), 1.2], [x1, plan.y + i * (plan.d / 8), POD.h - 1.2]));
  const doors = seg([0, y1, 1.2], [0, y1, POD.h - 1.2]) + seg([-5.5, y1, 1.2], [-5.5, y1, POD.h - 1.2]) + seg([5.5, y1, 1.2], [5.5, y1, POD.h - 1.2]);
  const bands = k.sideSeam(plan, 1.2, P, 2) + k.sideSeam(plan, POD.h - 1.2, P, 2);
  out.push(S(k.slabOf(plan, 0, POD.h, P, 2, 0.5), { tone: "hi", crease: "lo", lit, inner: L(bands, { tone: lit ? "mid" : "lo" }) + L(ribs.join(""), { tone: "faint" }) + L(doors, { tone: "lo" }) }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2), POD.h, P, 2), { tone: "faint" }));
  out.push(D(k.corners(plan, 1.3).map(([x, y]) => at([x, y, POD.h])), { size: 0.5, tone: lit ? "mid" : "lo" }));
  return out.join("");
}

// ---------- worker node: a tray on feet with four slots, a lamp and two kubelet ports ----------
function nodeTray(cx, index) {
  const plan = TRAY(cx);
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const [x, y] of byDepth(k.corners(plan, 6))) out.push(S(k.cylinder(x, y, 3, 0, TRAY_Z, P, 18), { tone: "lo" }));
  out.push(S(k.slabOf(plan, TRAY_Z, TRAY_H, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(plan, TRAY_Z + 2.4, P, 4), { tone: "faint" }) }));
  // vents on the long +x face: closed slots
  const fx = plan.x + plan.w;
  const vents = [];
  for (let i = 0; i < 6; i++) {
    const y0 = plan.y + 18 + i * 9;
    vents.push(`M${at([fx, y0, TRAY_Z + 4.2]).join(" ")}L${at([fx, y0 + 5, TRAY_Z + 4.2]).join(" ")}L${at([fx, y0 + 5, TRAY_Z + 5.4]).join(" ")}L${at([fx, y0, TRAY_Z + 5.4]).join(" ")}Z`);
  }
  out.push(L(vents.join(""), { tone: "lo" }));
  // slot seats
  for (const dx of SLOT_DX) for (const dy of SLOT_DY) {
    const seat = { x: cx + dx - POD.w / 2 - 1.5, y: dy - POD.d / 2 - 1.5, w: POD.w + 3, d: POD.d + 3, r: 1.2 };
    out.push(L(k.planOutline(seat, TRAY_TOP, P, 2), { tone: "faint" }));
    out.push(D(k.corners(seat, 0).map(([x, y]) => at([x, y, TRAY_TOP])), { size: 0.4, tone: "lo" }));
  }
  // centre spine groove
  out.push(L(k.planOutline({ x: cx - 0.8, y: plan.y + 4, w: 1.6, d: plan.d - 8, r: 0.8 }, TRAY_TOP, P, 2), { tone: "faint" }));
  // kubelet ports on the front (+y) face
  const fy = plan.y + plan.d;
  for (const px of [cx - 18, cx, cx + 18]) {
    out.push(S(k.slabOf({ x: px - 2.6, y: fy, w: 5.2, d: 1.8, r: 0.5 }, TRAY_Z + 1.2, 4.2, P, 2), { tone: "mid", crease: "none" }));
  }
  // status lamp on the front-right corner
  const lamp = [cx + 24, plan.y + plan.d - 6];
  out.push(S(k.cylinder(lamp[0], lamp[1], 2.6, TRAY_TOP, 1.4, P, 18), { tone: "mid" }));
  out.push(`<g data-lamp="${index}">${S(k.cylinder(lamp[0], lamp[1], 1.7, TRAY_TOP + 1.4, 2.2, P, 16), { tone: "hi", lit: true })}</g>`);
  // tiny engraved node number
  out.push(k.faceTextSvg(k.topMatrix([cx - 26, plan.y + plan.d - 4.2], TRAY_TOP, P, "x"), `node-${index + 1}`, { size: 3, tone: "lo" }));
  return `<g data-node="${index}" class="yard-node">${out.join("")}</g>`;
}

// ---------- control plane: cabinet with etcd drawers and the replica knob ----------
function desk() {
  const out = [`<path class="iso-halo" d="${k.haloOf(DESK, 0, DESK_H, P)}"/>`];
  const plinth = k.insetPlan(DESK, -1.5);
  out.push(S(k.slabOf(plinth, 0, 3, P, 4), { tone: "lo" }));
  out.push(S(k.slabOf(DESK, 3, DESK_H - 3, P, 4, 1), { tone: "mid" }));
  // three etcd drawers on the +x face, closed outlines with pull bars
  const fx = DESK.x + DESK.w;
  const drawers = [];
  const pulls = [];
  for (let i = 0; i < 3; i++) {
    const y0 = DESK.y + 5 + i * 20;
    const y1 = y0 + 17;
    drawers.push(`M${at([fx, y0, 6]).join(" ")}L${at([fx, y1, 6]).join(" ")}L${at([fx, y1, 24]).join(" ")}L${at([fx, y0, 24]).join(" ")}Z`);
    pulls.push([y0 + 5, y1 - 5]);
  }
  out.push(L(drawers.join(""), { tone: "lo" }));
  for (const [a, b] of pulls) {
    out.push(S(k.slabOf({ x: fx, y: a, w: 1.4, d: b - a, r: 0.6 }, 19, 1.8, P, 2), { tone: "hi", crease: "none" }));
  }
  // top: dial ring and knob
  const top = DESK_H;
  out.push(L(k.ring(KNOB[0], KNOB[1], DIAL_R + 1.4, top, P, 48), { tone: "lo" }));
  const ticks = k.radialTicks(KNOB[0], KNOB[1], DIAL_R, MAX_REPLICAS, 4, top, [1.4, 2.6], P, DIAL_FROM, DIAL_SPAN);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(S(k.cylinder(KNOB[0], KNOB[1], KNOB_R + 1.2, top, 1.2, P, 32), { tone: "lo" }));
  out.push(S(k.cylinder(KNOB[0], KNOB[1], KNOB_R, top + 1.2, 5, P, 32, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(KNOB[0], KNOB[1], KNOB_R, top + 1.4, top + 6, 36, P), { tone: "lo" }));
  // lamp and label on top
  out.push(S(k.cylinder(139, 14, 2.6, top, 1.4, P, 18), { tone: "lo" }));
  out.push(S(k.cylinder(139, 14, 1.7, top + 1.4, 2, P, 16), { tone: "hi" }));
  const label = { x: 128, y: 21, w: 22, d: 9, r: 0.8 };
  out.push(S(k.slabOf(label, top, 0.6, P, 2), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.2), top + 0.6, P, 2), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 3, label.y + 5.6], top + 0.6, P, "x"), "control-plane", { size: 2.6, tone: "mid" }));
  out.push(D(k.corners(DESK, 2.2).map(([x, y]) => at([x, y, top])), { size: 0.45 }));
  // uplink port on the front face (start of the kubelet chain)
  out.push(S(k.slabOf({ x: 132, y: DESK.y + DESK.d, w: 5.2, d: 1.8, r: 0.5 }, 5, 4.2, P, 2), { tone: "mid", crease: "none" }));
  return out.join("");
}
// ingress: an edge router that takes outside traffic through a TLS port and routes it by path
function ingress() {
  const I = INGRESS;
  const out = [`<path class="iso-halo" d="${k.haloOf(I, 0, INGRESS_H, P)}"/>`];
  out.push(S(k.slabOf(k.insetPlan(I, -1.4), 0, 2, P, 3), { tone: "lo" }));
  out.push(S(k.slabOf(I, 2, INGRESS_H - 2, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(I, 7, P, 3) + k.sideSeam(I, INGRESS_H - 4, P, 3), { tone: "faint" }) }));
  const fx = I.x + I.w;
  // TLS port on the +x face: a flanged round inlet
  out.push(S(k.slabOf({ x: fx, y: TRACK_Y - 5, w: 1.6, d: 10, r: 1 }, PORT_Z - 5, 10, P, 2), { tone: "mid", crease: "none" }));
  out.push(L(k.sideRing([fx + 1.6, TRACK_Y, PORT_Z], 3.4, "x", P, 24), { tone: "mid" }));
  out.push(L(k.sideRing([fx + 1.6, TRACK_Y, PORT_Z], 2, "x", P, 20), { tone: "lo" }));
  out.push(D([[TRACK_Y - 4, PORT_Z - 4], [TRACK_Y + 4, PORT_Z - 4], [TRACK_Y - 4, PORT_Z + 4], [TRACK_Y + 4, PORT_Z + 4]].map(([y, z]) => at([fx + 1.6, y, z])), { size: 0.4 }));
  // fins on the +x face behind the port: closed slots
  const fins = [];
  for (let i = 0; i < 5; i++) {
    const y0 = I.y + 3 + i * 2.6;
    fins.push(`M${at([fx, y0, 6]).join(" ")}L${at([fx, y0 + 1.2, 6]).join(" ")}L${at([fx, y0 + 1.2, 18]).join(" ")}L${at([fx, y0, 18]).join(" ")}Z`);
  }
  out.push(L(fins.join(""), { tone: "lo" }));
  // reject slot on the +y face, over the 404 tray
  const fy = I.y + I.d;
  const cxr = REJECT.x + REJECT.w / 2;
  out.push(L(`M${at([cxr - 3.4, fy, 8]).join(" ")}L${at([cxr + 3.4, fy, 8]).join(" ")}L${at([cxr + 3.4, fy, 11]).join(" ")}L${at([cxr - 3.4, fy, 11]).join(" ")}Z`, { tone: "lo" }));
  // route table on top: two rules and a status lamp
  const T = INGRESS_H;
  const card = { x: I.x + 2, y: I.y + 8, w: I.w - 4, d: 14, r: 0.8 };
  out.push(S(k.slabOf(card, T, 0.6, P, 2), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(card, 1), T + 0.6, P, 2), { tone: "faint" }));
  out.push(L(k.lineOnTop([card.x + 1, card.y + 7], [card.x + card.w - 1, card.y + 7], T + 0.6, P), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([card.x + 1.6, card.y + 5], T + 0.6, P, "x"), "/ → web", { size: 2.6, tone: "hi" }));
  out.push(k.faceTextSvg(k.topMatrix([card.x + 1.6, card.y + 11.6], T + 0.6, P, "x"), "* → 404", { size: 2.6, tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([I.x + 2.4, I.y + 5.6], T, P, "x"), "ingress", { size: 2.6, tone: "mid" }));
  out.push(S(k.cylinder(I.x + 4, I.y + I.d - 3.4, 1.8, T, 1.2, P, 16), { tone: "lo" }));
  out.push(S(k.cylinder(I.x + 4, I.y + I.d - 3.4, 1.1, T + 1.2, 1.4, P, 14), { tone: "hi", lit: true }));
  out.push(D(k.corners(I, 1.4).map(([x, y]) => at([x, y, T])), { size: 0.42 }));
  return out.join("");
}
function rejectTray() {
  const out = [`<path class="iso-halo" d="${k.haloOf(REJECT, 0, 0.1, P)}" style="filter:blur(2px)"/>`];
  out.push(S(k.slabOf(REJECT, 0, 3.2, P, 2, 0.4), { tone: "mid" }));
  const mouth = k.insetPlan(REJECT, 1.2);
  out.push(`<path d="${k.planOutline(mouth, 3.2, P, 2)}" style="fill:var(--anatomy-shade-0);stroke:none"/>`);
  out.push(L(k.planOutline(mouth, 3.2, P, 2), { tone: "lo" }));
  return out.join("");
}
function gate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(GATE, 0, GATE_H, P)}"/>`];
  out.push(S(k.slabOf(k.insetPlan(GATE, -1.4), 0, 2, P, 3), { tone: "lo" }));
  out.push(S(k.slabOf(GATE, 2, GATE_H - 2, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(GATE, 6, P, 3), { tone: "faint" }) }));
  // vents on the +x face: closed slots
  const fx = GATE.x + GATE.w;
  const vents = [];
  for (let i = 0; i < 4; i++) {
    const y0 = GATE.y + 4 + i * 3.4;
    vents.push(`M${at([fx, y0, 10]).join(" ")}L${at([fx, y0 + 1.6, 10]).join(" ")}L${at([fx, y0 + 1.6, 14]).join(" ")}L${at([fx, y0, 14]).join(" ")}Z`);
  }
  out.push(L(vents.join(""), { tone: "lo" }));
  // endpoint lamps: one per ready pod
  const lamps = [];
  for (let i = 0; i < MAX_REPLICAS; i++) {
    const x = GATE.x + 3.4 + (i % 6) * 3.2;
    const y = GATE.y + 3.8 + Math.floor(i / 6) * 3.4;
    lamps.push([x, y, i]);
  }
  out.push(L(k.planOutline({ x: GATE.x + 1.6, y: GATE.y + 1.8, w: 19.6, d: 7.2, r: 0.8 }, GATE_H, P, 2), { tone: "lo" }));
  for (const [x, y, i] of byDepth(lamps)) out.push(`<g data-ep="${i}" style="opacity:.15">${S(k.cylinder(x, y, 0.95, GATE_H, 0.9, P, 12), { tone: "hi", lit: true, crease: "none" })}</g>`);
  // inlet where the ingress link enters, on the +x face
  out.push(L(`M${at([fx, TRACK_Y - 2.6, 2]).join(" ")}L${at([fx, TRACK_Y + 2.6, 2]).join(" ")}L${at([fx, TRACK_Y + 2.6, 5]).join(" ")}L${at([fx, TRACK_Y - 2.6, 5]).join(" ")}Z`, { tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([GATE.x + 2.4, GATE.y + 17.6], GATE_H, P, "x"), "svc/web", { size: 2.8, tone: "mid" }));
  out.push(D(k.corners(GATE, 1.4).map(([x, y]) => at([x, y, GATE_H])), { size: 0.42 }));
  return out.join("");
}
const knobPointer = (count) => {
  const a = DIAL_FROM + (count / MAX_REPLICAS) * DIAL_SPAN;
  return k.lineOnTop([KNOB[0] + Math.sin(a) * 1.4, KNOB[1] - Math.cos(a) * 1.4], [KNOB[0] + Math.sin(a) * (KNOB_R - 0.6), KNOB[1] - Math.cos(a) * (KNOB_R - 0.6)], DESK_H + 6.2, P);
};

// ---------- kubelet chain: desk → node 3 → node 2 → node 1 ----------
function chain() {
  const out = [];
  const floor = 0.2;
  const portZ = TRAY_Z + 3.3;
  const fy = 42 + 1.8;
  const lanes = [53, 51, 49];
  const hops = [
    { from: [134.6, DESK.y + DESK.d + 1.8, 7], to: [NODES[2] + 18, fy, portZ], lane: lanes[2], node: 2 },
    { from: [NODES[2] - 18, fy, portZ], to: [NODES[1] + 18, fy, portZ], lane: lanes[1], node: 1 },
    { from: [NODES[1] - 18, fy, portZ], to: [NODES[0] + 18, fy, portZ], lane: lanes[0], node: 0 },
  ];
  for (const h of hops) {
    const via = [[h.from[0], h.from[1] + 2, floor], [h.from[0], h.lane, floor], [h.to[0], h.lane, floor], [h.to[0], h.to[1] + 2, floor]].map(at);
    out.push(`<g data-link="${h.node}">${k.wireSvg(at(h.from), at(h.to), { via, tone: "mid", flow: true, size: 1 })}</g>`);
  }
  return out.join("");
}

// ---------- gantry crane ----------
// one side frame (truck on the rail, two legs, an end beam), built at gx = 0
function gantrySide(y) {
  const out = [];
  const truck = { x: -17, y: y - 4.5, w: 34, d: 9, r: 1.6 };
  out.push(S(k.slabOf(truck, RAIL_H + 1, 7, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(truck, RAIL_H + 3.4, P, 3), { tone: "faint" }) }));
  for (const x of [-12, 12]) out.push(L(k.sideRing([x, y + 4.5, RAIL_H + 4.5], 2.6, "y", P, 16), { tone: "lo" }), D([at([x, y + 4.5, RAIL_H + 4.5])], { size: 0.5 }));
  for (const x of [-11, 11]) {
    const leg = { x: x - 2.2, y: y - 2.2, w: 4.4, d: 4.4, r: 0.8 };
    out.push(S(k.slabOf({ x: x - 3.4, y: y - 3.4, w: 6.8, d: 6.8, r: 1 }, RAIL_H + 8, 2.4, P, 2), { tone: "mid" }));
    out.push(S(k.slabOf(leg, RAIL_H + 10.4, LEG_TOP - RAIL_H - 10.4, P, 2), { tone: "mid", crease: "none", inner: L(k.sideSeam(leg, 50, P, 2), { tone: "faint" }) }));
  }
  // diagonal brace between the legs (a flat bar in the y plane)
  const brace = [];
  out.push(L(seg([-9, y + 2.2, 24], [9, y + 2.2, 78]) + seg([9, y + 2.2, 24], [-9, y + 2.2, 78]), { tone: "lo" }));
  out.push(D([at([-9, y + 2.2, 24]), at([9, y + 2.2, 78]), at([9, y + 2.2, 24]), at([-9, y + 2.2, 78])], { size: 0.45 }));
  const beam = { x: -16, y: y - 4, w: 32, d: 8, r: 1 };
  out.push(S(k.slabOf(beam, BEAM_Z, BEAM_H, P, 2, 0.5), { tone: "mid" }));
  out.push(D([-13, 13].map((x) => at([x, y, BEAM_Z + BEAM_H])), { size: 0.45 }));
  return out.join("");
}
function girder(x0) {
  const plan = { x: x0, y: RAIL_Y[0] - 4, w: 5, d: RAIL_Y[1] - RAIL_Y[0] + 8, r: 0.8 };
  const out = [S(k.slabOf(plan, GIRDER_Z, GIRDER_H, P, 2, 0.4), { tone: "mid", inner: L(k.sideSeam(plan, GIRDER_Z + 2, P, 2), { tone: "faint" }) })];
  out.push(D([plan.y + 3, plan.y + plan.d - 3].map((y) => at([x0 + 2.5, y, GIRDER_TOP])), { size: 0.42 }));
  return out.join("");
}
// trolley riding both girders, built at (0, 0)
function trolley() {
  const out = [];
  const plan = { x: -10, y: -9, w: 20, d: 18, r: 1.6 };
  out.push(S(k.slabOf(plan, GIRDER_TOP, TROLLEY_H, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(plan, GIRDER_TOP + 2.2, P, 3), { tone: "faint" }) }));
  out.push(S(k.cylinder(-2, 0, 4.4, GIRDER_TOP + TROLLEY_H, 4.5, P, 28, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(-2, 0, 4.4, GIRDER_TOP + TROLLEY_H + 0.6, GIRDER_TOP + TROLLEY_H + 4, 24, P), { tone: "lo" }));
  out.push(S(k.slabOf({ x: 4, y: -6, w: 4, d: 4, r: 0.8 }, GIRDER_TOP + TROLLEY_H, 3, P, 2), { tone: "lo" }));
  out.push(D(k.corners(plan, 1.6).map(([x, y]) => at([x, y, GIRDER_TOP + TROLLEY_H])), { size: 0.42 }));
  return out.join("");
}
// hook block + spreader + optional crate, built with its spreader bottom at z = 0
function hookBlock() {
  const out = [];
  const spreader = { x: -POD.w / 2 - 1, y: -POD.d / 2 - 1, w: POD.w + 2, d: POD.d + 2, r: 1 };
  out.push(S(k.slabOf(spreader, 0, SPREADER_H, P, 2, 0.4), { tone: "mid" }));
  out.push(D(k.corners(spreader, 1.4).map(([x, y]) => at([x, y, SPREADER_H])), { size: 0.45, tone: "lo" }));
  out.push(S(k.slabOf({ x: -4, y: -5, w: 8, d: 10, r: 1.2 }, SPREADER_H, 5, P, 2, 0.4), { tone: "mid" }));
  out.push(L(k.sideRing([0, 5, SPREADER_H + 2.5], 1.6, "y", P, 14), { tone: "lo" }));
  return out.join("");
}

const HOOK_TOP = SPREADER_H + 5;
const startGX = 14;

const defs = `<defs>${mouthClip("mouth-hopper", HOPPER)}${mouthClip("mouth-bin", BIN)}</defs>`;

const slotsSvg = SLOTS.map((s, i) => `<g data-slot="${i}" data-node-of="${s.node}" class="yard-pod" transform="${k.translateAlong(P, [s.x, s.y, TRAY_TOP])}" style="opacity:0">${podSvg()}</g>`).join("");

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A Kubernetes cluster drawn as a container yard. Three worker-node trays each hold four pod crates. A gantry crane, the scheduler, lifts a new crate from the image-registry hopper and sets it on the least-loaded node that is up; extra crates go into the reclaim bin. A control-plane cabinet with etcd drawers holds the replica knob, and a kubelet cable chains it to every node. At the right edge an ingress router takes outside requests and routes them by path; matching ones go to a Service gate, which sends them along a track, round-robin to the ready pods.",
  body: [
    defs,
    plate(),
    rail(RAIL_Y[0]),
    `<g data-part="gantry-back" transform="${k.translateAlong(P, [startGX, 0, 0])}">${gantrySide(RAIL_Y[0])}</g>`,
    openBox(HOPPER, "up"),
    `<g clip-path="url(#mouth-hopper)"><g data-part="fresh" transform="${k.translateAlong(P, [HOP_C[0], HOP_C[1], BOX_H])}">${podSvg()}</g></g>`,
    openBox(BIN, "down"),
    `<g clip-path="url(#mouth-bin)"><g data-part="sinking" transform="${k.translateAlong(P, [BIN_C[0], BIN_C[1], BOX_H - POD.h - 1])}">${podSvg()}</g></g>`,
    NODES.map((cx, i) => nodeTray(cx, i)).join(""),
    desk(),
    `<path data-part="pointer" class="iso-line" data-tone="lit" data-free="start" d="${knobPointer(6)}" style="stroke-width:1.1"/>`,
    `<g data-part="stack">${slotsSvg}<g data-part="carry"><path data-part="cable" class="iso-line" data-tone="mid" d=""/><g data-part="hook">${hookBlock()}<g data-part="cargo" style="opacity:0" transform="${k.translateAlong(P, [0, 0, -POD.h])}">${podSvg({ lit: true })}</g></g></g></g>`,
    chain(),
    `<g data-part="packets-back"></g>`,
    rail(RAIL_Y[1]),
    `<g data-part="gantry-front" transform="${k.translateAlong(P, [startGX, 0, 0])}">${gantrySide(RAIL_Y[1])}</g>`,
    `<g data-part="packets-front"></g>`,
    gate(),
    ingress(),
    rejectTray(),
    `<g data-part="packets-out"></g>`,
    `<g data-part="gantry-top" transform="${k.translateAlong(P, [startGX, 0, 0])}">${girder(-9)}${girder(4)}</g>`,
    `<g data-part="trolley" transform="${k.translateAlong(P, [startGX, 0, 0])}">${trolley()}</g>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const SLOTS = ${JSON.stringify(SLOTS)};
const NODES = ${JSON.stringify(NODES)};
const HOP = ${JSON.stringify(HOP_C)}, BIN = ${JSON.stringify(BIN_C)};
const POD_H = ${POD.h}, TRAY_TOP = ${TRAY_TOP}, BOX_H = ${BOX_H}, TRAVEL = ${TRAVEL_Z}, HOOK_TOP = ${HOOK_TOP}, GIRDER_Z = ${GIRDER_Z};
const GATE_X = ${GATE.x}, TRACK_Y = ${TRACK_Y}, PORT_Y = ${PORT_Y}, PORT_Z = ${PORT_Z};
const ING = ${JSON.stringify(INGRESS)}, REJ_X = ${REJECT.x + REJECT.w / 2}, GATE_FACE = ${GATE.x + GATE.w};
const MAX = ${MAX_REPLICAS}, MAX_REPLICAS = MAX, KNOB = ${JSON.stringify(KNOB)}, KNOB_R = ${KNOB_R}, DIAL_FROM = ${DIAL_FROM}, DIAL_SPAN = ${DIAL_SPAN}, DESK_H = ${DESK_H};
const knobPointer = ${knobPointer.toString().replace(/k\./g, "")};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (q) => svg.querySelector(q);
const stack = $('[data-part="stack"]'), carry = $('[data-part="carry"]'), hook = $('[data-part="hook"]'), cable = $('[data-part="cable"]');
const cargo = $('[data-part="cargo"]'), fresh = $('[data-part="fresh"]'), sinking = $('[data-part="sinking"]'), pointer = $('[data-part="pointer"]');
const gTop = $('[data-part="gantry-top"]'), pBack = $('[data-part="packets-back"]'), pFront = $('[data-part="packets-front"]'), pOut = $('[data-part="packets-out"]');
const epLamps = [...svg.querySelectorAll("[data-ep]")];
const gBack = $('[data-part="gantry-back"]'), gFront = $('[data-part="gantry-front"]'), trolleyEl = $('[data-part="trolley"]');
const podEls = [...svg.querySelectorAll("[data-slot]")];
const lamps = [...svg.querySelectorAll("[data-lamp]")];
const links = [...svg.querySelectorAll("[data-link]")];
const trays = [...svg.querySelectorAll(".yard-node")];
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

// ---- the model: desired replicas, nodes, slots ----
const state = { desired: 6, up: [true, true, true], slot: SLOTS.map(() => 0), fade: SLOTS.map(() => 0), seq: 0 };
// slot: 0 empty, >0 pod id (placement order), -1 reserved for an incoming crate
const running = () => state.slot.filter((v) => v > 0).length;
const freeSlot = () => {
  let best = -1, load = 99;
  NODES.forEach((_, n) => {
    if (!state.up[n]) return;
    const mine = SLOTS.map((s, i) => i).filter((i) => SLOTS[i].node === n);
    const used = mine.filter((i) => state.slot[i] !== 0).length;
    const open = mine.find((i) => state.slot[i] === 0);
    if (open !== undefined && used < load) { load = used; best = open; }
  });
  return best;
};

// ---- the crane ----
const crane = { gx: ${startGX}, ty: 0, hz: TRAVEL, vgx: 0, vty: 0, vhz: 0, holding: false };
const want = { gx: crane.gx, ty: 0, hz: TRAVEL };
let plan = [];       // steps: { go:[x,y] } | { z } | { act }
let job = null;      // { kind, slot }
let wait = 0;
let freshRise = 1, sinkDepth = 1;

function schedule() {
  if (job) return;
  const r = running();
  if (r < state.desired) {
    const s = freeSlot();
    if (s < 0) return;
    state.slot[s] = -1;
    job = { kind: "create", slot: s };
    plan = [{ go: HOP }, { z: BOX_H }, { act: "grab-fresh" }, { z: TRAVEL }, { go: "slot" }, { z: TRAY_TOP }, { act: "place" }, { z: TRAVEL }];
  } else if (r > state.desired) {
    let s = -1, top = 0;
    state.slot.forEach((v, i) => { if (v > top) { top = v; s = i; } });
    job = { kind: "delete", slot: s };
    plan = [{ go: "slot" }, { z: TRAY_TOP }, { act: "lift" }, { z: TRAVEL }, { go: BIN }, { z: BOX_H }, { act: "drop" }, { z: TRAVEL }];
  }
}
function act(name) {
  const s = job.slot;
  if (name === "grab-fresh") { crane.holding = true; freshRise = 0; }
  if (name === "place") { crane.holding = false; state.slot[s] = ++state.seq; state.fade[s] = 1; job = null; }
  if (name === "lift") {
    if (state.slot[s] <= 0) { plan = [{ z: TRAVEL }]; job = null; return; }
    state.slot[s] = 0; state.fade[s] = 0; crane.holding = true;
  }
  if (name === "drop") { crane.holding = false; sinkDepth = 0; job = null; }
}
function stepPlan(dt) {
  if (wait > 0) { wait -= dt; return; }
  if (!plan.length) { schedule(); return; }
  const step = plan[0];
  if (step.go) {
    let target = step.go;
    if (target === "slot") {
      // a node may have failed while we travelled: re-pick a slot, or carry the crate back
      if (job && job.kind === "create" && !state.up[SLOTS[job.slot].node]) {
        const s = freeSlot();
        if (s >= 0) { state.slot[s] = -1; job.slot = s; }
        else { plan = [{ go: BIN }, { z: BOX_H }, { act: "drop" }, { z: TRAVEL }]; return; }
      }
      if (job && job.kind === "delete" && state.slot[job.slot] <= 0) { plan = []; job = null; return; }
      target = [SLOTS[job.slot].x, SLOTS[job.slot].y];
    }
    want.gx = target[0]; want.ty = target[1];
    if (Math.abs(crane.gx - want.gx) < 0.5 && Math.abs(crane.ty - want.ty) < 0.5 && Math.abs(crane.vgx) < 3 && Math.abs(crane.vty) < 3) plan.shift();
  } else if (step.z !== undefined) {
    want.hz = step.z;
    if (Math.abs(crane.hz - want.hz) < 0.15 && Math.abs(crane.vhz) < 1.5) { plan.shift(); wait = 0.08; }
  } else if (step.act) {
    plan.shift(); act(step.act); wait = 0.12;
  }
}
const springTo = (key, vkey, target, dt, stiff) => {
  const damp = 2 * Math.sqrt(stiff);
  for (let i = 0; i < 4; i++) { crane[vkey] += ((target - crane[key]) * stiff - crane[vkey] * damp) * dt / 4; crane[key] += crane[vkey] * dt / 4; }
};

// ---- node failure ----
function setNode(n, up) {
  if (state.up[n] === up) return;
  state.up[n] = up;
  if (!up) SLOTS.forEach((s, i) => { if (s.node === n) { if (state.slot[i] === -1 && !(job && job.slot === i)) state.slot[i] = 0; if (state.slot[i] > 0) state.slot[i] = 0; } });
  if (!up && job && job.kind === "create" && SLOTS[job.slot].node === n && !crane.holding) { state.slot[job.slot] = 0; job = null; plan = [{ z: TRAVEL }]; }
}

// ---- ingress + Service: outside requests hit the ingress, which routes "/" to svc/web and the rest to 404;
// the Service sends each request round-robin to one ready endpoint ----
const NS = "http://www.w3.org/2000/svg";
const packets = [];
let rr = 0, spawnIn = 0, reqNo = 0;
const endpoints = () => state.slot.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
const SPEED = 140, GAP = 0.42, FLOOR = 1.9;
const MID = ING.x + ING.w / 2;
const pathTo = (cx) => [[196, TRACK_Y, PORT_Z], [MID, TRACK_Y, PORT_Z], [MID, TRACK_Y, FLOOR], [cx, TRACK_Y, FLOOR], [cx, PORT_Y, FLOOR]];
const rejectPath = [[196, TRACK_Y, PORT_Z], [REJ_X, TRACK_Y, PORT_Z], [REJ_X, ING.y + ING.d + 1, PORT_Z + 0.5], [REJ_X, ING.y + ING.d + 5, 4.2]];
const lengthOf = (pts) => pts.slice(1).reduce((sum, b, i) => sum + Math.hypot(b[0] - pts[i][0], b[1] - pts[i][1], b[2] - pts[i][2]), 0);
const pointAt = (pts, s) => {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (s <= len || i === pts.length - 1) { const t = Math.min(1, s / len); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    s -= len;
  }
};
function stepPackets(dt, calm) {
  const eps = endpoints();
  spawnIn -= dt;
  if (!calm && eps.length && spawnIn <= 0) {
    spawnIn = GAP;
    const reject = reqNo++ % 5 === 4;
    const slot = reject ? -1 : eps[rr++ % eps.length];
    const path = reject ? rejectPath : pathTo(NODES[SLOTS[slot].node]);
    const el = document.createElementNS(NS, "circle");
    el.setAttribute("r", "1.7");
    el.setAttribute("class", reject ? "yard-packet is-reject" : "yard-packet");
    pOut.appendChild(el);
    packets.push({ slot, reject, path, total: lengthOf(path), s: 0, el, layer: pOut });
  }
  for (let i = packets.length - 1; i >= 0; i--) {
    const p = packets[i];
    p.s += SPEED * (p.reject && p.s > p.total - 8 ? 0.4 : 1) * dt;
    if (p.s >= p.total) {
      const pod = p.slot >= 0 && podEls[p.slot].querySelector(".iso-solid");
      if (pod && state.slot[p.slot] > 0) { pod.setAttribute("data-lit", ""); clearTimeout(pod.__t); pod.__t = setTimeout(() => pod.removeAttribute("data-lit"), 220); }
      p.el.remove();
      packets.splice(i, 1);
    }
  }
}
function drawPackets() {
  for (const p of packets) {
    const [x, y, z] = pointAt(p.path, p.s);
    const [sx, sy] = iso([x, y, z], P);
    p.el.setAttribute("cx", sx.toFixed(1));
    p.el.setAttribute("cy", sy.toFixed(1));
    const inside = x > ING.x && x < ING.x + ING.w && y > ING.y && y < ING.y + ING.d;
    const under = y > 53 && y < 67;
    let o = inside || under ? 0 : Math.min(1, p.s / 14);
    if (p.reject) o *= Math.min(1, Math.max(0, (p.total - p.s) / 6));
    p.el.style.opacity = o.toFixed(2);
    const want = x > GATE_FACE - 0.5 || y > ING.y + ING.d ? pOut : y < 60 ? pBack : pFront;
    if (p.layer !== want) { want.appendChild(p.el); p.layer = want; }
  }
}

// ---- drawing ----
let lastOrder = -2;
function draw() {
  const gx = crane.gx;
  gBack.setAttribute("transform", translateAlong(P, [gx, 0, 0]));
  gFront.setAttribute("transform", translateAlong(P, [gx, 0, 0]));
  gTop.setAttribute("transform", translateAlong(P, [gx, 0, 0]));
  drawPackets();
  trolleyEl.setAttribute("transform", translateAlong(P, [gx, crane.ty, 0]));
  hook.setAttribute("transform", translateAlong(P, [gx, crane.ty, crane.hz]));
  const top = crane.hz + HOOK_TOP;
  cable.setAttribute("d", segment([gx - 1, crane.ty + 3, top], [gx - 1, crane.ty + 3, GIRDER_Z], P) + segment([gx + 1, crane.ty - 3, top], [gx + 1, crane.ty - 3, GIRDER_Z], P));
  cargo.style.opacity = crane.holding ? 1 : 0;
  // the carried crate is painted in the slot where it physically sits
  const d = depthOf([gx, crane.ty, 0], P);
  let before = null;
  for (const el of podEls) { const s = SLOTS[+el.dataset.slot]; if (depthOf([s.x, s.y, 0], P) > d) { before = el; break; } }
  const order = before ? +before.dataset.slot : -1;
  if (order !== lastOrder) { stack.insertBefore(carry, before); lastOrder = order; }
  podEls.forEach((el, i) => { const o = state.fade[i]; el.style.opacity = o > 0.01 ? o.toFixed(3) : 0; el.style.visibility = o > 0.01 ? "" : "hidden"; });
  fresh.setAttribute("transform", translateAlong(P, [HOP[0], HOP[1], BOX_H - (1 - freshRise) * (POD_H + 1)]));
  sinking.setAttribute("transform", translateAlong(P, [BIN[0], BIN[1], BOX_H - sinkDepth * (POD_H + 1)]));
  sinking.style.visibility = sinkDepth > 0.995 ? "hidden" : "";
  fresh.style.visibility = crane.holding && job && job.kind === "create" && freshRise < 0.02 ? "hidden" : "";
  pointer.setAttribute("d", knobPointer(state.desired));
  const ready = running();
  epLamps.forEach((el) => { const on = +el.dataset.ep < ready; const o = on ? "1" : ".15"; if (el.style.opacity !== o) el.style.opacity = o; });
  state.up.forEach((up, n) => {
    lamps[n].style.opacity = up ? 1 : 0.18;
    links[n].classList.toggle("is-down", !up);
    trays[n].classList.toggle("is-down", !up);
  });
  const r = running(), pending = Math.max(0, state.desired - r);
  const down = state.up.map((u, i) => (u ? "" : "node-" + (i + 1))).filter(Boolean);
  const text = "pods " + r + "/" + state.desired + (pending ? " · " + pending + " pending" : "") + (down.length ? " · " + down.join(", ") + " down" : "");
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(state.desired));
  stage.setAttribute("aria-valuetext", text);
}

// ---- idle tour ----
const TOUR = [
  { set: 6 }, { settle: 1.6 },
  { fail: 1 }, { settle: 2.2 },
  { heal: 1 }, { settle: 1.2 },
  { set: 10 }, { settle: 1.6 },
  { fail: 2 }, { settle: 2.4 },
  { heal: 2 }, { settle: 1.2 },
  { set: 3 }, { settle: 2 },
];
let touring = true, tourAt = 0, tourWait = 0, idleTimer = 0;
const settled = () => !job && !plan.length && running() === Math.min(state.desired, capacity()) && Math.abs(crane.vgx) < 0.05;
const capacity = () => state.up.filter(Boolean).length * 4;
function tour(dt) {
  const step = TOUR[tourAt];
  if (step.settle !== undefined) {
    if (!settled()) return;
    tourWait += dt;
    if (tourWait < step.settle) return;
    tourWait = 0;
  } else if (step.set !== undefined) state.desired = step.set;
  else if (step.fail !== undefined) setNode(step.fail, false);
  else if (step.heal !== undefined) setNode(step.heal, true);
  tourAt = (tourAt + 1) % TOUR.length;
}

let frame = 0, last = 0, visible = false;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) tour(dt);
  stepPlan(dt);
  stepPackets(dt, calm);
  if (calm) { crane.gx = want.gx; crane.ty = want.ty; crane.hz = want.hz; crane.vgx = crane.vty = crane.vhz = 0; }
  else { springTo("gx", "vgx", want.gx, dt, 48); springTo("ty", "vty", want.ty, dt, 70); springTo("hz", "vhz", want.hz, dt, 130); }
  const ease = (v, to, tau) => (calm ? to : v + (to - v) * (1 - Math.exp(-dt / tau)));
  state.fade = state.fade.map((v, i) => { const to = state.slot[i] > 0 ? 1 : 0; const n = ease(v, to, 0.22); return Math.abs(n - to) < 0.005 ? to : n; });
  if (!crane.holding || !job || job.kind !== "create") freshRise = ease(freshRise, 1, 0.35);
  sinkDepth = ease(sinkDepth, 1, 0.4);
  draw();
  const idle = !touring && !job && !plan.length && running() === Math.min(state.desired, capacity()) && freshRise > 0.999 && sinkDepth > 0.999 && Math.abs(crane.gx - want.gx) < 0.01 && Math.abs(crane.hz - want.hz) < 0.01 && !packets.length && (calm || running() === 0);
  frame = visible && !idle ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const takeOver = () => { touring = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; tourAt = 1; tourWait = 0; state.up = state.up.map(() => true); run(); }, 20000); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;

const setDesired = (n) => { state.desired = Math.max(0, Math.min(MAX, n)); takeOver(); };
stage.addEventListener("click", (event) => {
  const node = event.target.closest("[data-node], [data-node-of]");
  if (node) { const n = +(node.dataset.node ?? node.dataset.nodeOf); setNode(n, !state.up[n]); takeOver(); return; }
  const box = svg.getBoundingClientRect();
  setDesired(event.clientY - box.top < box.height * 0.5 ? state.desired + 1 : state.desired - 1);
});
stage.addEventListener("wheel", (event) => { event.preventDefault(); setDesired(state.desired + (event.deltaY < 0 ? 1 : -1)); }, { passive: false });
stage.addEventListener("keydown", (event) => {
  let n = null;
  if (event.key === "ArrowUp" || event.key === "ArrowRight") n = state.desired + 1;
  if (event.key === "ArrowDown" || event.key === "ArrowLeft") n = state.desired - 1;
  if (event.key === "Home") n = 0;
  if (event.key === "End") n = MAX;
  if (["1", "2", "3"].includes(event.key)) { const i = +event.key - 1; setNode(i, !state.up[i]); takeOver(); event.preventDefault(); return; }
  if (n === null) return;
  event.preventDefault();
  setDesired(n);
});
draw();
`;

const css = `<style>
.yard-node, .yard-pod { cursor: pointer; }
.yard-packet { fill: var(--anatomy-lit); stroke: var(--anatomy-paper); stroke-width: .6; }
.yard-packet.is-reject { fill: var(--anatomy-paper); stroke: var(--anatomy-hi); }
.yard-pod .iso-solid[data-lit] > .iso-edge { stroke: var(--anatomy-lit); }
.yard-node { transition: opacity .5s ease; }
.yard-node.is-down { opacity: .5; }
[data-link].is-down .iso-line { animation-play-state: paused; opacity: .35; }
[data-lamp] { transition: opacity .3s ease; }
.iso-stage { touch-action: manipulation; }
</style>`;

const body =
  css +
  k.plateHtml({
    fig: "Fig 1",
    title: "Kubernetes cluster",
    hint: "Click a node to fail it · ↑↓ replicas",
    readout: "pods 0/6 · 6 pending",
    keys: [
      { mark: "lit", label: "The crate on the hook: a pod being scheduled" },
      { mark: "raised", label: "Running pods, four slots per worker node" },
      { mark: "dotted", label: "Kubelet cable from the control plane" },
      { mark: "edge", label: "Ingress: routes outside requests by path, / to svc/web, anything else to 404" },
      { mark: "dim", label: "Service gate: round-robin to ready pods, one lamp per endpoint" },
    ],
    caption:
      "The control plane holds the desired replica count on its knob and keeps it in etcd. The scheduler, drawn as a crane, compares that count with what is running, pulls a pod from the registry and sets it on the least-loaded node that is up. When a node fails its pods are lost, and the crane reschedules them onto the nodes that are left, up to their capacity. Anything over capacity waits as pending. Outside traffic enters through the ingress on the right edge, which terminates TLS and routes by path: "/" goes on to svc/web, any other path is answered 404 and drops into the tray. The Service (svc/web) is the stable address behind it: its lamps show the endpoint list, every ready pod, and each request is sent round-robin to one of them, so traffic follows the pods wherever the crane puts them.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Kubernetes cluster: arrow keys change the replica count, keys 1 to 3 fail or recover a node" aria-valuemin="0" aria-valuemax="${MAX_REPLICAS}" aria-valuenow="6">${svg}</div>`,
  });

const file = theme === "light" ? "index-light.html" : "index.html";
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, file), k.pageHtml({ title: "Kubernetes cluster", theme, body, script: kitScript() + live, width: 700 }));
console.log("wrote", file);
