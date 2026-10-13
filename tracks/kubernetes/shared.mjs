// Shared parts for the Kubernetes lessons: camera, plate, crates, housings, lamps, inlays,
// the page shell and a small browser runtime (loop, tour, packets, controls).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const k = await import(join(ROOT, "kit/iso-kit.mjs"));
const { kitScript } = await import(join(ROOT, "scripts/inline-kit.mjs"));
export const theme = process.argv.includes("--light") ? "light" : "dark";

// A drawing context bound to one projection.
export function scene({ width = 640, height = 400, fit, azimuth = 52, pad = 22, elevation = 30 }) {
  const P = k.fitProjection(fit, width, height, { pad, azimuth, elevation });
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const seg = (a, b) => k.segment(a, b, P);
  const depth2 = ([x, y]) => k.depthOf([x, y, 0], P);
  const byDepth = (points) => [...points].sort((a, b) => depth2(a) - depth2(b));
  // a closed rectangle drawn on a vertical face: axis "x" = face x = c (y from a0 to a1), axis "y" = face y = c
  const faceRect = (axis, c, a0, a1, z0, z1) =>
    axis === "x"
      ? `M${at([c, a0, z0]).join(" ")}L${at([c, a1, z0]).join(" ")}L${at([c, a1, z1]).join(" ")}L${at([c, a0, z1]).join(" ")}Z`
      : `M${at([a0, c, z0]).join(" ")}L${at([a1, c, z0]).join(" ")}L${at([a1, c, z1]).join(" ")}L${at([a0, c, z1]).join(" ")}Z`;
  const topText = (x, y, z, text, { size = 3, tone = "mid", attrs = "" } = {}) =>
    k.faceTextSvg(k.topMatrix([x, y], z, P, "x"), text, { size, tone }).replace("<text ", `<text ${attrs} `);
  const frontText = (x, y, z, text, { size = 3, tone = "mid", attrs = "" } = {}) =>
    k.faceTextSvg(k.sideMatrix([x, y], z, P, "left"), text, { size, tone }).replace("<text ", `<text ${attrs} `);

  // the base plate on feet, with a groove, corner screws, a ruler strip and a label plate
  function plate(PL, { h = 12, foot = 5, ruler = true, label = true } = {}) {
    const out = [`<path class="iso-halo" d="${k.haloOf(PL, -h - foot, h, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(PL, 24))) {
      out.push(S(k.cylinder(x, y, 7.5, -h - foot, 1.6, P, 28), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 5.8, -h - foot + 1.6, foot - 1.6, P, 28), { tone: "mid" }));
    }
    out.push(S(k.slabOf(PL, -h, h, P, 9, 1.6), { tone: "mid", inner: L(k.sideSeam(PL, -4, P, 9), { tone: "faint" }) }));
    out.push(L(k.planOutline(k.insetPlan(PL, 5), 0, P), { tone: "lo" }));
    const screws = k.corners(PL, 10);
    out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
    out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
    if (ruler) {
      const strip = { x: PL.x + 44, y: PL.y + PL.d - 11, w: PL.w - 88, d: 5.5, r: 1 };
      out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
      const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.6, 0.6, [1.6, 3.2], P);
      out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
      out.push(D([at([strip.x + 2, strip.y + 2.75, 0.6]), at([strip.x + strip.w - 2, strip.y + 2.75, 0.6])], { size: 0.45 }));
    }
    if (label) {
      const lp = { x: PL.x + 9, y: PL.y + PL.d - 19, w: 24, d: 11, r: 1 };
      out.push(S(k.slabOf(lp, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
      out.push(L(k.planOutline(k.insetPlan(lp, 1.4), 0.8, P, 3), { tone: "faint" }));
      [[3, 16], [3, 11], [3, 17]].forEach(([dx, len], i) => out.push(L(k.lineOnTop([lp.x + dx, lp.y + 3.4 + i * 2.2], [lp.x + dx + len, lp.y + 3.4 + i * 2.2], 0.8, P), { tone: "lo", free: true })));
      out.push(D([at([lp.x + 2, lp.y + 2, 0.8]), at([lp.x + lp.w - 2, lp.y + lp.d - 2, 0.8])], { size: 0.4 }));
    }
    return out.join("");
  }

  // a flat inlay in the plate (tracks, spurs, painted zones)
  const inlay = (plan, { z = 0, groove = true, tone = "lo" } = {}) =>
    S(k.slabOf(plan, z, 0.6, P, 2), { tone, crease: "none" }) + (groove ? L(k.planOutline(k.insetPlan(plan, Math.min(1.3, plan.w / 4, plan.d / 4)), z + 0.6, P, 2), { tone: "faint" }) : "");

  // a housing: plinth, body with a seam, corner screws
  function housing(plan, z, h, { tone = "mid", seam = 0.35, plinth = true, bevel = 0.8, screws = true, steps = 3 } = {}) {
    const out = [`<path class="iso-halo" d="${k.haloOf(plan, z, h, P)}"/>`];
    const z0 = plinth ? z + 2 : z;
    if (plinth) out.push(S(k.slabOf(k.insetPlan(plan, -1.4), z, 2, P, steps), { tone: "lo" }));
    out.push(S(k.slabOf(plan, z0, h - (z0 - z), P, steps, bevel), { tone, inner: seam ? L(k.sideSeam(plan, z0 + (h - (z0 - z)) * seam, P, steps), { tone: "faint" }) : "" }));
    if (screws) out.push(D(k.corners(plan, 1.5).map(([x, y]) => at([x, y, z + h])), { size: 0.42 }));
    return out.join("");
  }

  // a ribbed crate (a container). plan is its footprint; the lid carries an optional label and lamp.
  function crate(plan, z, h, { label, labelSize = 4, lamp, lampAttr = "", lit = false, tone = "hi", ribs = 7, doors = true } = {}) {
    const out = [];
    const x1 = plan.x + plan.w, y1 = plan.y + plan.d, top = z + h;
    const rib = [];
    for (let i = 1; i <= ribs; i++) rib.push(seg([x1, plan.y + i * (plan.d / (ribs + 1)), z + 1.2], [x1, plan.y + i * (plan.d / (ribs + 1)), top - 1.2]));
    const mid = plan.x + plan.w / 2;
    const door = doors ? [-plan.w / 4, 0, plan.w / 4].map((dx) => seg([mid + dx, y1, z + 1.2], [mid + dx, y1, top - 1.2])).join("") : "";
    const bands = k.sideSeam(plan, z + 1.2, P, 2) + k.sideSeam(plan, top - 1.2, P, 2);
    out.push(S(k.slabOf(plan, z, h, P, 2, 0.5), { tone, crease: "lo", lit, inner: L(bands, { tone: lit ? "mid" : "lo" }) + L(rib.join(""), { tone: "faint" }) + L(door, { tone: "lo" }) }));
    out.push(L(k.planOutline(k.insetPlan(plan, Math.min(2, plan.w / 6)), top, P, 2), { tone: "faint" }));
    out.push(D(k.corners(plan, 1.2).map(([x, y]) => at([x, y, top])), { size: 0.45, tone: lit ? "mid" : "lo" }));
    if (label) out.push(topText(plan.x + 2, plan.y + plan.d - 2.6, top, label, { size: labelSize, tone: "hi" }));
    if (lamp) out.push(lampSvg(lamp[0], lamp[1], top, { attr: lampAttr }));
    return out.join("");
  }

  // a small indicator lamp: a base ring and a lit cap you can dim from the page by attribute
  const lampSvg = (x, y, z, { r = 1.4, attr = "", cls = "" } = {}) =>
    S(k.cylinder(x, y, r + 0.8, z, 0.8, P, 16), { tone: "lo" }) +
    `<g ${attr} class="${cls}">${S(k.cylinder(x, y, r, z + 0.8, 1.3, P, 14), { tone: "hi", lit: true })}</g>`;

  // a port block on a +y face
  const port = (x, y, z, { w = 6, h = 4 } = {}) => S(k.slabOf({ x: x - w / 2, y, w, d: 1.8, r: 0.5 }, z, h, P, 2), { tone: "mid", crease: "none" });

  return { P, at, S, L, D, seg, depth2, byDepth, faceRect, topText, frontText, plate, inlay, housing, crate, lampSvg, port };
}

// Browser runtime shared by every lesson page. Lesson code runs after it.
export const RUNTIME = String.raw`
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (q) => svg.querySelector(q);
const $$ = (q) => [...svg.querySelectorAll(q)];
const at = (p) => iso(p, P);
const still = matchMedia("(prefers-reduced-motion: reduce)");
const readoutEl = document.querySelector("[data-readout]");
const say = (t) => { if (readoutEl.textContent !== t) readoutEl.textContent = t; };
const setText = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
const ease = (v, to, dt, tau) => (still.matches ? to : v + (to - v) * (1 - Math.exp(-dt / tau)));
const lengthOf = (pts) => pts.slice(1).reduce((s, b, i) => s + Math.hypot(b[0] - pts[i][0], b[1] - pts[i][1], b[2] - pts[i][2]), 0);
const pointAt = (pts, s) => {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (s <= l || i === pts.length - 1) { const t = l ? Math.min(1, s / l) : 1; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    s -= l;
  }
};
// packets: small dots that travel a 3D polyline; layer() picks the SVG group to paint in from the current point
const NS = "http://www.w3.org/2000/svg";
function packets({ speed = 120, layer, onArrive, cls = "lx-packet" }) {
  const list = [];
  return {
    list,
    add(pts, data = {}, extra = "") {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("r", "1.7"); c.setAttribute("class", cls + (extra ? " " + extra : ""));
      const g = layer(pts[0], data); g.appendChild(c);
      list.push({ pts, total: lengthOf(pts), s: 0, c, g, data, fade: data.fade || 0 });
    },
    step(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.s += (p.data.speed || speed) * dt;
        if (p.s >= p.total) { p.c.remove(); list.splice(i, 1); if (onArrive) onArrive(p.data); }
      }
    },
    draw() {
      for (const p of list) {
        const pt = pointAt(p.pts, p.s);
        const [sx, sy] = at(pt);
        p.c.setAttribute("cx", sx.toFixed(1)); p.c.setAttribute("cy", sy.toFixed(1));
        let o = Math.min(1, p.s / 8);
        if (p.data.hide && p.data.hide(pt)) o = 0;
        if (p.fade) o *= Math.max(0, Math.min(1, (p.total - p.s) / p.fade));
        p.c.style.opacity = o.toFixed(2);
        const g = layer(pt, p.data);
        if (g !== p.g) { g.appendChild(p.c); p.g = g; }
      }
    },
    clear() { list.forEach((p) => p.c.remove()); list.length = 0; },
  };
}
// the frame loop: runs while the figure is on screen; an idle tour runs until the reader takes over
function animate({ tick, tour = [], act = () => {}, resumeAfter = 30000 }) {
  let frame = 0, last = 0, visible = false, touring = !still.matches, ti = 0, wait = 0, idle = 0;
  function loop(t) {
    const dt = last ? Math.min((t - last) / 1000, 1 / 30) : 1 / 60;
    last = t;
    if (touring && tour.length) {
      const s = tour[ti];
      if (s.hold !== undefined) { wait += dt; if (wait >= s.hold) { wait = 0; ti = (ti + 1) % tour.length; } }
      else if (s.until !== undefined) { wait += dt; if (s.until() && wait >= (s.min || 0)) { wait = 0; ti = (ti + 1) % tour.length; } }
      else { act(s); ti = (ti + 1) % tour.length; }
    }
    tick(dt);
    frame = visible ? requestAnimationFrame(loop) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(loop); } };
  new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  return {
    takeOver() { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; ti = 0; wait = 0; run(); }, resumeAfter); run(); },
  };
}
// wire a button: <button data-do="name"> runs handlers[name](button)
function controls(handlers, takeOver) {
  document.querySelectorAll("[data-do]").forEach((b) => b.addEventListener("click", () => { const f = handlers[b.dataset.do]; if (f) { f(b); takeOver(); } }));
}
`;

export const CONTROLS_CSS = `
.lx-packet { fill: var(--anatomy-lit); stroke: var(--anatomy-paper); stroke-width: .6; }
.lx-packet.is-bad { fill: var(--anatomy-paper); stroke: var(--anatomy-red); stroke-width: .9; }
.lx-packet.is-alt { fill: var(--anatomy-paper); stroke: var(--anatomy-hi); stroke-width: .9; }
.iso-solid[data-flash] > .iso-edge { stroke: var(--anatomy-lit); }
.lx-controls { display: flex; flex-wrap: wrap; gap: 8px 10px; align-items: center; margin-top: 14px; font: 500 12px/1 var(--anatomy-mono); }
.lx-controls button { font: inherit; color: var(--anatomy-strong); background: var(--anatomy-card); border: 1px solid var(--anatomy-muted); border-radius: 999px; padding: 9px 13px; cursor: pointer; }
.lx-controls button:hover:not(:disabled) { border-color: var(--anatomy-strong); }
.lx-controls button:disabled { opacity: .4; cursor: default; }
.lx-controls button:focus-visible { outline: 2px solid var(--anatomy-strong); outline-offset: 2px; }
.lx-controls button[aria-pressed="true"] { border-color: var(--anatomy-green); color: var(--anatomy-green); }
.lx-controls .is-danger { color: var(--anatomy-red); border-color: currentColor; }
.lx-pair { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--anatomy-muted); border-radius: 999px; padding: 3px 4px 3px 12px; color: var(--anatomy-text); }
.lx-pair button { padding: 5px 9px; border: 0; background: none; }
.lx-status { flex-basis: 100%; margin: 6px 0 0; font: 400 13px/1.5 var(--anatomy-mono); color: var(--anatomy-text); min-height: 3em; }
.lx-status[data-tone="bad"] { color: var(--anatomy-red); }
.lx-status[data-tone="good"] { color: var(--anatomy-green); }
.lx-table-wrap { overflow-x: auto; margin-top: 12px; }
.lx-table { width: 100%; border-collapse: collapse; font: 400 12px/1.4 var(--anatomy-mono); font-variant-numeric: tabular-nums; color: var(--anatomy-text); }
.lx-table th, .lx-table td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--anatomy-faint); white-space: nowrap; }
.lx-table th { color: var(--anatomy-muted); font-weight: 500; }
.lx-table td:first-child { color: var(--anatomy-strong); }
.lx-table [data-tone="good"] { color: var(--anatomy-green); }
.lx-table [data-tone="bad"] { color: var(--anatomy-red); }
.lx-yaml { margin: 12px 0 0; padding: 12px 14px; border: 1px solid var(--anatomy-faint); border-radius: 8px; font: 400 12px/1.55 var(--anatomy-mono); color: var(--anatomy-text); white-space: pre; overflow-x: auto; }
.lx-yaml b { color: var(--anatomy-strong); font-weight: 500; }
.lx-yaml mark { background: none; color: var(--anatomy-green); }
.iso-stage { touch-action: manipulation; }
`;

// Writes a lesson page: the figure card, controls under it, and the live script.
export function writeLesson({ slug, pageTitle, fig, title, hint, readout, keys, caption, label, width = 640, height = 400, body, controls = "", css = "", live }) {
  const svg = k.figureSvg({ width, height, label, body });
  const html = k.plateHtml({
    fig, title, hint, readout, keys, caption,
    body: `<div class="iso-stage" tabindex="-1" role="img" aria-label="${title} figure">${svg}</div>${controls}`,
  });
  const out = join(ROOT, "site/kubernetes", slug);
  mkdirSync(out, { recursive: true });
  const file = theme === "light" ? "index-light.html" : "index.html";
  writeFileSync(join(out, file), k.pageHtml({ title: pageTitle, theme, body: `<style>${CONTROLS_CSS}${css}</style>${html}`, script: kitScript() + live, width: 700 }));
  console.log("wrote", slug, file);
}
