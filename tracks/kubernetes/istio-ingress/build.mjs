import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";


const SKILL = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const k = await import(join(SKILL, "kit/iso-kit.mjs"));
const { kitScript } = await import(join(SKILL, "scripts/inline-kit.mjs"));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../../site/kubernetes/istio-ingress");

const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 390;

// World layout (units ≈ px). x along the station, y across, z up. Traffic flows right → left.
const PLATE = { x: -106, y: -86, w: 278, d: 150, r: 9 };
const PLATE_H = 12;
const FOOT_H = 5;

// pods: v1 at the back, v2 at the front
const TRAY_Z = 4;
const TRAY_TOP = 9;
const PODS = [
  { cx: -70, cy: -46, sub: "v1" },
  { cx: -6, cy: -46, sub: "v1" },
  { cx: -70, cy: 30, sub: "v2" },
  { cx: -6, cy: 30, sub: "v2" },
];
const TRAY = ({ cx, cy }) => ({ x: cx - 22, y: cy - 15, w: 44, d: 30, r: 3 });
const APP = ({ cx, cy }) => ({ x: cx - 13, y: cy - 12, w: 26, d: 14, r: 0.8 });
const APP_H = 14;
const CAR = ({ cx, cy }) => ({ x: cx - 6, y: cy + 4, w: 12, d: 8.5, r: 1.2 });
const CAR_H = 10;

const TRACK_W = 2.5;
// tracks: v1 runs just in front of the back row, v2 just in front of the front row
const V1_Y = -31 + 1.8 + TRACK_W + 0.2; // centrelines: each track runs flush against its row's ports
const V2_Y = 45 + 1.8 + TRACK_W + 0.2;
const TURN = [86, 0];
const TURN_R = 10;
const TRACK_END = -78;

// gateway (Envoy) with its routing deck on the -x side
const GW = { x: 112, y: -18, w: 40, d: 36, r: 2.5 };
const GW_H = 30;
const DECK = { x: 66, y: -16, w: 47, d: 32, r: 2 };
const DECK_H = 6;
const PORT_Z = 15;
const SLIDE = { x: 102, y: -12, w: 4, d: 24, r: 1.2 };

// istiod
const ISTIOD = { x: 112, y: -78, w: 36, d: 26, r: 2.5 };
const ISTIOD_H = 34;
const KNOB = [124, -66];
const KNOB_R = 5.5;
const DIAL_R = 10;
const DIAL_FROM = -Math.PI * 0.75;
const DIAL_SPAN = Math.PI * 1.5;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [ISTIOD.x, ISTIOD.y, ISTIOD_H + 8], [GW.x + GW.w, GW.y, GW_H + 8], [196, 0, PORT_Z]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 52 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const seg = (a, b) => k.segment(a, b, P);
const depth2 = ([x, y]) => k.depthOf([x, y, 0], P);
const byDepth = (points) => [...points].sort((a, b) => depth2(a) - depth2(b));
const faceRect = (axis, c, a0, a1, z0, z1) =>
  axis === "x"
    ? `M${at([c, a0, z0]).join(" ")}L${at([c, a1, z0]).join(" ")}L${at([c, a1, z1]).join(" ")}L${at([c, a0, z1]).join(" ")}Z`
    : `M${at([a0, c, z0]).join(" ")}L${at([a1, c, z0]).join(" ")}L${at([a1, c, z1]).join(" ")}L${at([a0, c, z1]).join(" ")}Z`;

// ---------- base ----------
function lTrack(xv, y0, yMain, xEnd) {
  const w = TRACK_W;
  const down = yMain < y0;
  const yo = down ? yMain - w : yMain + w;
  const yi = down ? yMain + w : yMain - w;
  return [[xv + w, y0], [xv + w, yo], [xEnd, yo], [xEnd, yi], [xv - w, yi], [xv - w, y0]];
}
function lGroove(xv, y0, yMain, xEnd) {
  const w = TRACK_W - 1.1;
  const down = yMain < y0;
  const ys = down ? y0 - 1.1 : y0 + 1.1;
  const yo = down ? yMain - w : yMain + w;
  const yi = down ? yMain + w : yMain - w;
  return [[xv + w, ys], [xv + w, yo], [xEnd + 1.1, yo], [xEnd + 1.1, yi], [xv - w, yi], [xv - w, ys]];
}
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
  // subset tracks, inlaid
  for (const [y0, ym] of [[-DECK.d / 2 + 1, V1_Y], [DECK.d / 2 - 1, V2_Y]]) {
    out.push(S(k.extrude(lTrack(TURN[0], y0, ym, TRACK_END), 0, 0.6, P, { convex: false }), { tone: "lo", crease: "none" }));
    out.push(L(k.onTop(lGroove(TURN[0], y0, ym, TRACK_END), 0.6, P, true), { tone: "faint" }));
  }
  // ruler strip along the front
  const strip = { x: PLATE.x + 44, y: PLATE.y + PLATE.d - 10.5, w: 176, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }));
  // label plate, front left
  const label = { x: PLATE.x + 7.5, y: PLATE.y + PLATE.d - 15, w: 19, d: 10, r: 1 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 3), { tone: "faint" }));
  [[3, 12], [3, 9], [3, 13]].forEach(([dx, len], i) => out.push(L(k.lineOnTop([label.x + dx, label.y + 2.8 + i * 2.2], [label.x + dx + len, label.y + 2.8 + i * 2.2], 0.8, P), { tone: "lo", free: true })));
  out.push(D([at([label.x + 2, label.y + 2, 0.8]), at([label.x + label.w - 2, label.y + label.d - 2, 0.8])], { size: 0.4 }));
  return out.join("");
}

// ---------- a pod: tray, app container, Envoy sidecar ----------
function pod(p, i) {
  const plan = TRAY(p);
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const [x, y] of byDepth(k.corners(plan, 5))) out.push(S(k.cylinder(x, y, 2.8, 0, TRAY_Z, P, 18), { tone: "lo" }));
  out.push(S(k.slabOf(plan, TRAY_Z, TRAY_TOP - TRAY_Z, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(plan, TRAY_Z + 2, P, 4), { tone: "faint" }) }));
  // inbound port on the tray front, where the subset track ends
  const fy = plan.y + plan.d;
  out.push(S(k.slabOf({ x: p.cx - 3, y: fy, w: 6, d: 1.8, r: 0.5 }, TRAY_Z + 0.6, 3.8, P, 2), { tone: "mid", crease: "none" }));
  // app container (the crate)
  const app = APP(p);
  const ax = app.x + app.w;
  const ribs = [];
  for (let r = 1; r < 4; r++) ribs.push(seg([ax, app.y + r * (app.d / 4), TRAY_TOP + 1.2], [ax, app.y + r * (app.d / 4), TRAY_TOP + APP_H - 1.2]));
  for (let r = 1; r < 8; r++) ribs.push(seg([app.x + r * (app.w / 8), app.y + app.d, TRAY_TOP + 1.2], [app.x + r * (app.w / 8), app.y + app.d, TRAY_TOP + APP_H - 1.2]));
  const bands = k.sideSeam(app, TRAY_TOP + 1.2, P, 2) + k.sideSeam(app, TRAY_TOP + APP_H - 1.2, P, 2);
  out.push(`<g data-app="${i}">${S(k.slabOf(app, TRAY_TOP, APP_H, P, 2, 0.5), { tone: "hi", crease: "lo", inner: L(bands, { tone: "lo" }) + L(ribs.join(""), { tone: "faint" }) })}</g>`);
  out.push(L(k.planOutline(k.insetPlan(app, 2), TRAY_TOP + APP_H, P, 2), { tone: "faint" }));
  out.push(D(k.corners(app, 1.3).map(([x, y]) => at([x, y, TRAY_TOP + APP_H])), { size: 0.5, tone: "lo" }));
  // Envoy sidecar in front of the app
  const car = CAR(p);
  out.push(S(k.slabOf(car, TRAY_TOP, CAR_H, P, 2, 0.5), { tone: "mid", inner: L(k.sideSeam(car, TRAY_TOP + 3, P, 2), { tone: "faint" }) }));
  out.push(L(k.sideRing([p.cx, car.y + car.d, TRAY_TOP + 6.6], 1.8, "y", P, 16), { tone: "lo" }));
  out.push(L(faceRect("x", car.x + car.w, car.y + 2, car.y + 6.5, TRAY_TOP + 5, TRAY_TOP + 7.5), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(car, 1.6), TRAY_TOP + CAR_H, P, 2), { tone: "faint" }));
  // health lamp: on while the endpoint is in the load-balancing pool
  const lamp = [plan.x + plan.w - 4.5, plan.y + plan.d - 4.5];
  out.push(S(k.cylinder(lamp[0], lamp[1], 2.4, TRAY_TOP, 1.2, P, 16), { tone: "lo" }));
  out.push(`<g data-lamp="${i}">${S(k.cylinder(lamp[0], lamp[1], 1.5, TRAY_TOP + 1.2, 2, P, 14), { tone: "hi", lit: true })}</g>`);
  out.push(k.faceTextSvg(k.topMatrix([plan.x + 2.4, plan.y + plan.d - 2.6], TRAY_TOP, P, "x"), `reviews-${p.sub}`, { size: 2.6, tone: "lo" }));
  out.push(`<g data-hop="${i}"></g>`);
  return `<g data-pod="${i}" class="mesh-pod">${out.join("")}</g>`;
}

// ---------- gateway deck: the VirtualService diverter and the weight slide ----------
function deck() {
  const out = [`<path class="iso-halo" d="${k.haloOf(DECK, 0, DECK_H, P)}"/>`];
  out.push(S(k.slabOf(DECK, 0, DECK_H, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(DECK, 2.4, P, 3), { tone: "faint" }) }));
  // exit chutes on the deck edges, where the subset tracks start
  out.push(L(faceRect("y", DECK.y + DECK.d, TURN[0] - 2.6, TURN[0] + 2.6, 0.6, 3.6), { tone: "lo" }));
  // turntable
  const [tx, ty] = TURN;
  out.push(S(k.cylinder(tx, ty, TURN_R + 1.4, DECK_H, 0.8, P, 48), { tone: "lo" }));
  out.push(S(k.cylinder(tx, ty, TURN_R, DECK_H + 0.8, 1.6, P, 48, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(tx, ty, TURN_R, DECK_H + 0.9, DECK_H + 2.3, 48, P), { tone: "faint" }));
  const top = DECK_H + 2.4;
  const ticks = k.radialTicks(tx, ty, TURN_R - 1, 20, 5, top, [1, 2], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(S(k.cylinder(tx, ty, 1.6, top, 1, P, 14), { tone: "mid" }));
  // weight slide: the VirtualService weight, set over xDS
  out.push(S(k.slabOf(SLIDE, DECK_H, 0.4, P, 2), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(SLIDE, 1.2), DECK_H + 0.4, P, 2), { tone: "faint" }));
  const t = k.topTicks(SLIDE.y + 2, SLIDE.y + SLIDE.d - 2, 2, 5, SLIDE.x + SLIDE.w, DECK_H, [1.2, 2.2], P, "y");
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(k.faceTextSvg(k.sideMatrix([TURN[0] + 5, DECK.y + DECK.d], 2.2, P, "left"), "VirtualService", { size: 2.2, tone: "mid" }));
  out.push(D(k.corners(DECK, 1.4).map(([x, y]) => at([x, y, DECK_H])), { size: 0.42 }));
  return out.join("");
}
const slider = () => S(k.slabOf({ x: SLIDE.x - 1, y: -2, w: SLIDE.w + 2, d: 4, r: 0.8 }, DECK_H + 0.4, 2, P, 2, 0.3), { tone: "hi", lit: true });
const flapAt = (angle) => k.lineOnTop([TURN[0], TURN[1]], [TURN[0] + Math.sin(angle) * (TURN_R - 1.6), TURN[1] - Math.cos(angle) * (TURN_R - 1.6)], DECK_H + 2.6, P);

// ---------- gateway housing ----------
function gateway() {
  const out = [`<path class="iso-halo" d="${k.haloOf(GW, 0, GW_H, P)}"/>`];
  out.push(S(k.slabOf(k.insetPlan(GW, -1.6), 0, 2.4, P, 3), { tone: "lo" }));
  out.push(S(k.slabOf(GW, 2.4, GW_H - 2.4, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(GW, 8, P, 3) + k.sideSeam(GW, GW_H - 4, P, 3), { tone: "faint" }) }));
  const fx = GW.x + GW.w;
  // TLS port: flanged round inlet on the +x face
  out.push(S(k.slabOf({ x: fx, y: -6.5, w: 1.8, d: 13, r: 1.2 }, PORT_Z - 6.5, 13, P, 2, 0.3), { tone: "mid" }));
  out.push(L(k.sideRing([fx + 1.8, 0, PORT_Z], 4.4, "x", P, 28), { tone: "mid" }));
  out.push(L(k.sideRing([fx + 1.8, 0, PORT_Z], 2.6, "x", P, 22), { tone: "lo" }));
  out.push(D([[-5, -5], [5, -5], [-5, 5], [5, 5]].map(([y, z]) => at([fx + 1.8, y, PORT_Z + z])), { size: 0.42 }));
  // xDS port low on the same face
  out.push(S(k.slabOf({ x: fx, y: -14.5, w: 1.6, d: 5, r: 0.6 }, 3.6, 4.4, P, 2), { tone: "mid", crease: "none" }));
  // vents on the +y face
  const fy = GW.y + GW.d;
  const vents = [];
  for (let i = 0; i < 7; i++) vents.push(faceRect("y", fy, GW.x + 5 + i * 4.4, GW.x + 7 + i * 4.4, 11, 21));
  out.push(L(vents.join(""), { tone: "lo" }));
  // top: Secret key cartridge in its slot, the Gateway card and a lamp
  const T = GW_H;
  const slot = { x: GW.x + 4, y: GW.y + 5, w: 9, d: 15, r: 1 };
  out.push(L(k.planOutline(slot, T, P, 2), { tone: "lo" }));
  const cart = k.insetPlan(slot, 1.4);
  out.push(S(k.slabOf(cart, T, 5, P, 2, 0.4), { tone: "hi", crease: "lo" }));
  out.push(S(k.cylinder(cart.x + cart.w / 2, cart.y + cart.d - 3, 2.4, T + 5, 2.6, P, 22), { tone: "mid" }));
  out.push(L(k.knurl(cart.x + cart.w / 2, cart.y + cart.d - 3, 2.4, T + 5.2, T + 7.4, 18, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([cart.x + 1.4, cart.y + 3], [cart.x + cart.w - 1.4, cart.y + 3], T + 5, P), { tone: "faint" }));
  const card = { x: GW.x + 16, y: GW.y + 5, w: 21, d: 17, r: 0.8 };
  out.push(S(k.slabOf(card, T, 0.6, P, 2), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(card, 1), T + 0.6, P, 2), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([card.x + 1.8, card.y + 5], T + 0.6, P, "x"), "Gateway :443", { size: 2.6, tone: "hi" }));
  out.push(k.faceTextSvg(k.topMatrix([card.x + 1.8, card.y + 9.6], T + 0.6, P, "x"), "bookinfo.io", { size: 2.4, tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([card.x + 1.8, card.y + 14], T + 0.6, P, "x"), "tls: SIMPLE", { size: 2.4, tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([GW.x + 4, GW.y + GW.d - 3], T, P, "x"), "istio-ingressgateway", { size: 2.4, tone: "lo" }));
  out.push(S(k.cylinder(GW.x + GW.w - 4.4, GW.y + GW.d - 4.4, 2, T, 1.2, P, 16), { tone: "lo" }));
  out.push(S(k.cylinder(GW.x + GW.w - 4.4, GW.y + GW.d - 4.4, 1.3, T + 1.2, 1.6, P, 14), { tone: "hi", lit: true }));
  out.push(D(k.corners(GW, 1.6).map(([x, y]) => at([x, y, T])), { size: 0.45 }));
  return out.join("");
}

// ---------- istiod ----------
function istiod() {
  const I = ISTIOD;
  const out = [`<path class="iso-halo" d="${k.haloOf(I, 0, ISTIOD_H, P)}"/>`];
  out.push(S(k.slabOf(k.insetPlan(I, -1.5), 0, 3, P, 4), { tone: "lo" }));
  out.push(S(k.slabOf(I, 3, ISTIOD_H - 3, P, 4, 1), { tone: "mid", inner: L(k.sideSeam(I, 12, P, 4) + k.sideSeam(I, 24, P, 4), { tone: "faint" }) }));
  const fx = I.x + I.w;
  // three panels on the +x face: config store, CA, xDS server
  const panels = [];
  for (let i = 0; i < 3; i++) panels.push(faceRect("x", fx, I.y + 3 + i * 7, I.y + 8.5 + i * 7, 14.5, 21.5));
  out.push(L(panels.join(""), { tone: "lo" }));
  for (let i = 0; i < 3; i++) out.push(D([at([fx, I.y + 5.75 + i * 7, 18])], { size: 0.5, tone: "hi" }));
  // xDS port on the +y face
  out.push(S(k.slabOf({ x: 128, y: I.y + I.d, w: 5, d: 1.8, r: 0.5 }, 4.6, 4.4, P, 2), { tone: "mid", crease: "none" }));
  // top: weight knob with its dial, label, lamp
  const top = ISTIOD_H;
  out.push(L(k.ring(KNOB[0], KNOB[1], DIAL_R, top, P, 48), { tone: "lo" }));
  const ticks = k.radialTicks(KNOB[0], KNOB[1], DIAL_R, 10, 5, top, [1.3, 2.4], P, DIAL_FROM, DIAL_SPAN);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(S(k.cylinder(KNOB[0], KNOB[1], KNOB_R + 1, top, 1, P, 32), { tone: "lo" }));
  out.push(S(k.cylinder(KNOB[0], KNOB[1], KNOB_R, top + 1, 4.6, P, 32, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(KNOB[0], KNOB[1], KNOB_R, top + 1.2, top + 5.4, 32, P), { tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([I.x + 24.5, I.y + 7], top, P, "x"), "istiod", { size: 3, tone: "mid" }));
  out.push(S(k.cylinder(I.x + 28, I.y + 18, 2, top, 1.2, P, 16), { tone: "lo" }));
  out.push(`<g data-part="xds-lamp">${S(k.cylinder(I.x + 28, I.y + 18, 1.3, top + 1.2, 1.6, P, 14), { tone: "hi", lit: true })}</g>`);
  out.push(D(k.corners(I, 2).map(([x, y]) => at([x, y, top])), { size: 0.45 }));
  return out.join("");
}
const knobPointer = (weight) => {
  const a = DIAL_FROM + (weight / 100) * DIAL_SPAN;
  return k.lineOnTop([KNOB[0] + Math.sin(a) * 1.4, KNOB[1] - Math.cos(a) * 1.4], [KNOB[0] + Math.sin(a) * (KNOB_R - 0.6), KNOB[1] - Math.cos(a) * (KNOB_R - 0.6)], ISTIOD_H + 5.8, P);
};

// xDS cable: istiod → gateway
function xds() {
  const from = [130.5, ISTIOD.y + ISTIOD.d + 1.8, 6.8];
  const to = [GW.x + GW.w + 1.6, -12, 5.8];
  const via = [[130.5, ISTIOD.y + ISTIOD.d + 4, 0.2], [160, ISTIOD.y + ISTIOD.d + 4, 0.2], [160, -12, 0.2], [GW.x + GW.w + 4, -12, 0.2]].map(at);
  return `<g data-part="xds">${k.wireSvg(at(from), at(to), { via, tone: "mid", flow: true, size: 1 })}</g>`;
}

const back = PODS.map((p, i) => [p, i]).filter(([p]) => p.sub === "v1").sort((a, b) => depth2([a[0].cx, a[0].cy]) - depth2([b[0].cx, b[0].cy]));
const front = PODS.map((p, i) => [p, i]).filter(([p]) => p.sub === "v2").sort((a, b) => depth2([a[0].cx, a[0].cy]) - depth2([b[0].cx, b[0].cy]));

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Istio ingress drawn as a parcel-sorting station. Sealed requests enter the istio-ingressgateway through a TLS port on the right, where a key cartridge (the Secret) unseals them. On the gateway's deck a turntable, the VirtualService, sends each request to the v1 or v2 subset by weight, and always to v2 for the user jason. Requests are resealed with mutual TLS for the trip to each pod's Envoy sidecar, which hands them to the app. istiod, the tower at the back, holds the weight knob and pushes config to the gateway over an xDS cable.",
  body: [
    plate(),
    istiod(),
    back.map(([p, i]) => pod(p, i)).join(""),
    `<g data-part="lane-v1"></g>`,
    deck(),
    `<g data-part="slider">${slider()}</g>`,
    `<path data-part="flap" class="iso-line" data-tone="lit" data-free="end" d="${flapAt(Math.PI)}" style="stroke-width:1.2"/>`,
    `<g data-part="lane-deck"></g>`,
    front.map(([p, i]) => pod(p, i)).join(""),
    `<g data-part="lane-v2"></g>`,
    gateway(),
    xds(),
    `<g data-part="lane-out"></g>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const PODS = ${JSON.stringify(PODS)};
const TURN = ${JSON.stringify(TURN)}, TURN_R = ${TURN_R}, DECK_H = ${DECK_H}, PORT_Z = ${PORT_Z};
const GW = ${JSON.stringify(GW)}, DECK = ${JSON.stringify(DECK)}, SLIDE = ${JSON.stringify(SLIDE)};
const V1_Y = ${V1_Y}, V2_Y = ${V2_Y}, TRAY_TOP = ${TRAY_TOP}, APP_H = ${APP_H}, CAR_H = ${CAR_H}, TRAY_Z = ${TRAY_Z};
const KNOB = ${JSON.stringify(KNOB)}, KNOB_R = ${KNOB_R}, DIAL_FROM = ${DIAL_FROM}, DIAL_SPAN = ${DIAL_SPAN}, ISTIOD_H = ${ISTIOD_H};
const knobPointer = ${knobPointer.toString().replace(/k\./g, "")};
const flapAt = ${flapAt.toString().replace(/k\./g, "")};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (q) => svg.querySelector(q);
const lanes = { v1: $('[data-part="lane-v1"]'), deck: $('[data-part="lane-deck"]'), v2: $('[data-part="lane-v2"]'), out: $('[data-part="lane-out"]') };
const hops = PODS.map((_, i) => $('[data-hop="' + i + '"]'));
const apps = PODS.map((_, i) => $('[data-app="' + i + '"] .iso-solid'));
const lamps = PODS.map((_, i) => $('[data-lamp="' + i + '"]'));
const podEls = PODS.map((_, i) => $('[data-pod="' + i + '"]'));
const flap = $('[data-part="flap"]'), slider = $('[data-part="slider"]'), pointer = $('[data-part="pointer"]');
const xdsEl = $('[data-part="xds"]'), xdsLamp = $('[data-part="xds-lamp"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

// ---- the model ----
// weight: the VirtualService's v2 weight as istiod holds it; applied: what the gateway Envoy has received over xDS
const mesh = { weight: 20, applied: 20, push: 0, down: PODS.map(() => false), ejectedUntil: PODS.map(() => 0), errors: PODS.map(() => 0), acc: 0, rr: { v1: 0, v2: 0 }, ok: 0, fail: 0 };
const EJECT_AFTER = 2, EJECT_FOR = 6;
let clock = 0;
const inPool = (i) => clock >= mesh.ejectedUntil[i];
const healthy = (sub) => PODS.map((p, i) => i).filter((i) => PODS[i].sub === sub && inPool(i));
function pickSubset(jason) {
  if (jason) return "v2";
  mesh.acc += mesh.applied / 100;
  if (mesh.acc >= 1 - 1e-9) { mesh.acc -= 1; return "v2"; }
  return "v1";
}
function pickEndpoint(sub) {
  const pool = healthy(sub);
  if (!pool.length) return -1;
  return pool[mesh.rr[sub]++ % pool.length];
}

// ---- requests ----
const NS = "http://www.w3.org/2000/svg";
const packets = [];
let spawnIn = 0, reqNo = 0, flapAngle = Math.PI, flapWant = Math.PI;
const SPEED = 120, GAP = 0.34, DECKZ = DECK_H + 3.6, FLOOR = 1.9;
const approach = [[200, 0, PORT_Z], [GW.x + 2, 0, PORT_Z], [GW.x + 2, 0, DECKZ], [TURN[0], TURN[1], DECKZ]];
function tail(sub, i) {
  const p = PODS[i];
  const ey = sub === "v1" ? DECK.y : DECK.y + DECK.d;
  const ly = sub === "v1" ? V1_Y : V2_Y;
  const port = p.cy + (sub === "v1" ? 15 : 15) + 1.8;
  return [[TURN[0], ey + (sub === "v1" ? -0.5 : 0.5), DECKZ], [TURN[0], ey + (sub === "v1" ? -2 : 2), FLOOR], [TURN[0], ly, FLOOR], [p.cx, ly, FLOOR], [p.cx, port, FLOOR]];
}
const len = (pts) => pts.slice(1).reduce((s, b, i) => s + Math.hypot(b[0] - pts[i][0], b[1] - pts[i][1], b[2] - pts[i][2]), 0);
const pointAt = (pts, s) => {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (s <= l || i === pts.length - 1) { const t = l ? Math.min(1, s / l) : 1; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    s -= l;
  }
};
function makePacket(jason) {
  const g = document.createElementNS(NS, "g");
  g.setAttribute("class", "mesh-req" + (jason ? " is-jason" : ""));
  g.innerHTML = '<circle class="seal" r="3.1"/>' + (jason ? '<path class="core" d="M0 -2.3L2.3 0 0 2.3-2.3 0Z"/>' : '<circle class="core" r="1.6"/>');
  lanes.out.appendChild(g);
  return g;
}
function spawn() {
  const jason = reqNo++ % 5 === 2;
  const el = makePacket(jason);
  packets.push({ jason, el, path: approach.slice(), total: len(approach), s: 0, stage: "in", sub: null, pod: -1, layer: lanes.out });
}
function deliver(p) {
  const i = p.pod;
  if (mesh.down[i]) {
    // the app answers 5xx: the gateway's outlier detection counts it and ejects the endpoint
    mesh.fail++;
    mesh.errors[i]++;
    if (mesh.errors[i] >= EJECT_AFTER && inPool(i)) { mesh.ejectedUntil[i] = clock + EJECT_FOR; mesh.errors[i] = 0; }
    return false;
  }
  mesh.ok++;
  mesh.errors[i] = 0;
  const app = apps[i];
  if (app) { app.setAttribute("data-lit", ""); clearTimeout(app.__t); app.__t = setTimeout(() => app.removeAttribute("data-lit"), 200); }
  return true;
}
function stepPackets(dt, calm) {
  spawnIn -= dt;
  if (!calm && spawnIn <= 0) { spawnIn = GAP; spawn(); }
  for (let n = packets.length - 1; n >= 0; n--) {
    const p = packets[n];
    p.s += (p.stage === "hop" ? 45 : p.stage === "dead" ? 30 : SPEED) * dt;
    if (p.s < p.total) continue;
    if (p.stage === "in") {
      // at the turntable: VirtualService match and weights, then a DestinationRule subset endpoint
      const sub = pickSubset(p.jason);
      const i = pickEndpoint(sub);
      flapWant = sub === "v1" ? Math.PI * 0 : Math.PI;
      if (i < 0) { p.stage = "dead"; p.el.classList.add("is-err"); mesh.fail++; p.path = [p.path[p.path.length - 1], [TURN[0] + 3, TURN[1], DECKZ + 4]]; p.total = len(p.path); p.s = 0; continue; }
      p.sub = sub; p.pod = i; p.stage = "mtls";
      p.path = [p.path[p.path.length - 1], ...tail(sub, i)];
      p.total = len(p.path); p.s = 0;
      p.el.classList.remove("is-plain");
      p.el.classList.add("is-mtls");
      continue;
    }
    if (p.stage === "mtls") {
      // into the sidecar: mTLS ends, plain HTTP over localhost to the app
      const q = PODS[p.pod];
      p.stage = "hop";
      p.el.classList.remove("is-mtls");
      hops[p.pod].appendChild(p.el); p.layer = hops[p.pod];
      p.path = [[q.cx, q.cy + 8.5, TRAY_TOP + CAR_H + 1.4], [q.cx, q.cy + 1.6, TRAY_TOP + APP_H + 1.4]];
      p.total = len(p.path); p.s = 0;
      continue;
    }
    if (p.stage === "hop") {
      if (!deliver(p)) { p.stage = "dead"; p.el.classList.add("is-err"); p.path = [p.path[1], [p.path[1][0], p.path[1][1], p.path[1][2] + 5]]; p.total = len(p.path); p.s = 0; continue; }
    }
    p.el.remove();
    packets.splice(n, 1);
  }
}
function placePacket(p) {
  const [x, y, z] = pointAt(p.path, p.s);
  const [sx, sy] = iso([x, y, z], P);
  p.el.setAttribute("transform", "translate(" + sx.toFixed(1) + " " + sy.toFixed(1) + ")");
  const insideGw = x > GW.x && x < GW.x + GW.w && y > GW.y && y < GW.y + GW.d;
  let o = insideGw ? 0 : Math.min(1, p.s / 14 + (p.stage === "in" ? 0 : 1));
  if (p.stage === "hop") o = Math.min(1, p.s / 3);
  if (p.stage === "dead") o = Math.max(0, 1 - p.s / p.total);
  p.el.style.opacity = o.toFixed(2);
  if (p.stage === "in") {
    const want = x > GW.x + GW.w - 0.5 ? lanes.out : lanes.deck;
    if (p.layer !== want) { want.appendChild(p.el); p.layer = want; }
    p.el.classList.toggle("is-plain", x < GW.x + GW.w - 0.5);
  } else if (p.stage === "mtls") {
    const want = y < DECK.y ? lanes.v1 : y > DECK.y + DECK.d ? lanes.v2 : lanes.deck;
    if (p.layer !== want) { want.appendChild(p.el); p.layer = want; }
  }
}

// ---- drawing ----
function draw() {
  for (const p of packets) placePacket(p);
  flap.setAttribute("d", flapAt(flapAngle));
  slider.setAttribute("transform", translateAlong(P, [0, -8 + (mesh.applied / 100) * 16, 0]));
  pointer.setAttribute("d", knobPointer(mesh.weight));
  PODS.forEach((_, i) => {
    const on = inPool(i);
    lamps[i].style.opacity = on ? 1 : 0.15;
    podEls[i].classList.toggle("is-down", mesh.down[i]);
  });
  xdsEl.classList.toggle("is-push", mesh.push > 0);
  xdsLamp.style.opacity = mesh.push > 0 ? 1 : 0.35;
  const ej = PODS.map((p, i) => (inPool(i) ? "" : p.sub)).filter(Boolean);
  const text = "v1 " + (100 - mesh.applied) + "% · v2 " + mesh.applied + "%" + (mesh.push > 0 ? " · pushing" : "") + (ej.length ? " · " + ej.length + " ejected" : "");
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(mesh.weight));
  stage.setAttribute("aria-valuetext", text);
}

function setWeight(w) {
  w = Math.max(0, Math.min(100, Math.round(w / 10) * 10));
  if (w === mesh.weight) return;
  mesh.weight = w;
  mesh.push = 0.9; // xDS push to the gateway takes a moment
}
function setDown(i, down) {
  mesh.down[i] = down;
  if (!down) mesh.errors[i] = 0;
}

// ---- idle tour ----
const TOUR = [
  { w: 20, hold: 6 }, { w: 50, hold: 6 },
  { fail: 3, hold: 7 }, { heal: 3, hold: 6 },
  { w: 100, hold: 6 }, { fail: 2, hold: 2 }, { fail: 3, hold: 6 }, { heal: 2, hold: 0 }, { heal: 3, hold: 6 },
  { w: 0, hold: 6 },
];
let touring = true, tourAt = 0, tourHold = 0, idleTimer = 0;
function tour(dt) {
  tourHold -= dt;
  if (tourHold > 0) return;
  const s = TOUR[tourAt];
  if (s.w !== undefined) setWeight(s.w);
  if (s.fail !== undefined) setDown(s.fail, true);
  if (s.heal !== undefined) setDown(s.heal, false);
  tourHold = s.hold;
  tourAt = (tourAt + 1) % TOUR.length;
}

let frame = 0, last = 0, visible = false;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  clock += dt;
  if (touring) tour(dt);
  if (mesh.push > 0) { mesh.push -= dt; if (mesh.push <= 0) { mesh.push = 0; mesh.applied = mesh.weight; } }
  stepPackets(dt, calm);
  const diff = Math.atan2(Math.sin(flapWant - flapAngle), Math.cos(flapWant - flapAngle));
  flapAngle = calm ? flapWant : flapAngle + diff * (1 - Math.exp(-dt / 0.08));
  draw();
  frame = visible && !(calm && !mesh.push) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const takeOver = () => { touring = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; tourHold = 0; run(); }, 20000); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;

stage.addEventListener("click", (event) => {
  const el = event.target.closest("[data-pod]");
  if (el) { const i = +el.dataset.pod; setDown(i, !mesh.down[i]); takeOver(); return; }
  const box = svg.getBoundingClientRect();
  setWeight(mesh.weight + (event.clientY - box.top < box.height * 0.5 ? 10 : -10));
  takeOver();
});
stage.addEventListener("wheel", (event) => { event.preventDefault(); setWeight(mesh.weight + (event.deltaY < 0 ? 10 : -10)); takeOver(); }, { passive: false });
stage.addEventListener("keydown", (event) => {
  let w = null;
  if (event.key === "ArrowUp" || event.key === "ArrowRight") w = mesh.weight + 10;
  if (event.key === "ArrowDown" || event.key === "ArrowLeft") w = mesh.weight - 10;
  if (event.key === "Home") w = 0;
  if (event.key === "End") w = 100;
  if (["1", "2", "3", "4"].includes(event.key)) { const i = +event.key - 1; setDown(i, !mesh.down[i]); takeOver(); event.preventDefault(); return; }
  if (w === null) return;
  event.preventDefault();
  setWeight(w);
  takeOver();
});
draw();
`;

const css = `<style>
.mesh-pod { cursor: pointer; }
.mesh-pod .iso-solid { transition: opacity .4s ease; }
.mesh-pod.is-down [data-app] { opacity: .45; }
.mesh-req .core { fill: var(--anatomy-lit); stroke: var(--anatomy-paper); stroke-width: .5; }
.mesh-req .seal { fill: none; stroke: var(--anatomy-hi); stroke-width: .7; opacity: 1; transition: opacity .15s; }
.mesh-req.is-plain .seal { opacity: 0; }
.mesh-req.is-mtls .seal { opacity: 1; stroke-dasharray: 1.4 1; }
[data-hop] .mesh-req .seal { opacity: 0; }
.mesh-req.is-err .core { fill: var(--anatomy-paper); stroke: var(--anatomy-hi); stroke-width: .8; }
.mesh-req.is-err .seal { opacity: 0; }
[data-part="xds"] .iso-line { transition: stroke .3s; }
[data-part="xds"].is-push .iso-line { stroke: var(--anatomy-lit); }
[data-lamp], [data-part="xds-lamp"] { transition: opacity .3s ease; }
.iso-stage { touch-action: manipulation; }
</style>`;

const body =
  css +
  k.plateHtml({
    fig: "Fig 2",
    title: "Istio ingress",
    hint: "↑↓ v2 weight · click a pod to break it",
    readout: "v1 80% · v2 20%",
    keys: [
      { mark: "lit", label: "A request: ringed = TLS from the client, dashed ring = mTLS inside the mesh, bare = plain HTTP" },
      { mark: "raised", label: "Gateway: istio-ingressgateway Envoy with its TLS port and Secret cartridge" },
      { mark: "edge", label: "VirtualService turntable splits by weight; diamonds are end-user: jason, always v2" },
      { mark: "dotted", label: "xDS cable: istiod pushes config to the gateway" },
    ],
    caption:
      "A client's request arrives sealed with TLS at the istio-ingressgateway, an Envoy proxy. The Gateway resource opens port 443 for bookinfo.io and unseals the request with the certificate in its Secret. The VirtualService bound to that Gateway then routes it on the deck: requests with the header end-user: jason always go to v2, the rest split by weight. The DestinationRule defines the v1 and v2 subsets by pod label, sets mutual TLS for the hop to each pod's Envoy sidecar, and turns on outlier detection: a pod that returns errors twice is ejected from the pool for a while and its lamp goes out. Turning the weight knob on istiod does not move traffic at once: istiod pushes the new route to the gateway over xDS, and only then does the split change.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Istio ingress: arrow keys change the v2 weight, keys 1 to 4 break or fix a pod" aria-valuemin="0" aria-valuemax="100" aria-valuenow="20">${svg.replace('</svg>', `<path data-part="pointer" class="iso-line" data-tone="lit" data-free="start" d="${knobPointer(20)}" style="stroke-width:1.1"/></svg>`)}</div>`,
  });

mkdirSync(OUT, { recursive: true });
const file = theme === "light" ? "index-light.html" : "index.html";
writeFileSync(join(OUT, file), k.pageHtml({ title: "Istio Ingress", theme, body, script: kitScript() + live, width: 700 }));
console.log("wrote", file);
