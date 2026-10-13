// The HTML page around a 3D lesson: header and course nav, the viewer with its tool rail and tour bar,
// the inspector panel, lesson controls, and one inline module (engine + lesson scene).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const engine = () => readFileSync(join(HERE, "engine.js"), "utf8").replace(/^export /gm, "") + "\n" + readFileSync(join(HERE, "manifests.js"), "utf8");

export const CSS = `
:root {
  --bg: #f1f1ee; --panel: #fbfbfa; --ink: #1a1b1e; --muted: #64666d; --line: #dcdcd8; --accent: #3557c9; --good: #2a8655; --bad: #c8363c; --scene-bg: #f6f6f3;
  --display: "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --bg: #0d0d0e; --panel: #151516; --ink: #e8e8eb; --muted: #8d8f96; --line: #2b2b2e; --accent: #8aa4ff; --good: #5cc28c; --bad: #ff6b6b; --scene-bg: #121213; color-scheme: dark; }
}
:root[data-theme="dark"] { --bg: #0d0d0e; --panel: #151516; --ink: #e8e8eb; --muted: #8d8f96; --line: #2b2b2e; --accent: #8aa4ff; --good: #5cc28c; --bad: #ff6b6b; --scene-bg: #121213; color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.55 var(--display); }
body { padding-inline: 16px; padding-block: env(safe-area-inset-top, 0px) 40px; }
.wrap { max-width: 1240px; margin: 0 auto; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.top { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; padding-block: 16px; font: 500 12px/1.2 var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.top a { text-decoration: none; color: var(--ink); }
.top .where { flex: 1; min-width: 0; }
.top button { font: inherit; letter-spacing: inherit; text-transform: inherit; color: var(--ink); background: none; border: 1px solid var(--line); border-radius: 999px; padding: 7px 12px; cursor: pointer; }
.top button[aria-pressed="true"] { color: var(--good); border-color: var(--good); }
h1 { margin: 2px 0 6px; font-size: clamp(26px, 4vw, 42px); line-height: 1.05; letter-spacing: -.02em; text-wrap: balance; }
.lede { margin: 0 0 16px; color: var(--muted); max-width: 72ch; font-size: 16px; }
.stage { display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 14px; align-items: start; }
@media (max-width: 920px) { .stage { grid-template-columns: minmax(0, 1fr); } }
.viewer { position: relative; height: min(70vh, 660px); min-height: 380px; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: var(--scene-bg); }
.viewer canvas { display: block; touch-action: none; outline: none; }
.viewer canvas:focus-visible { box-shadow: inset 0 0 0 2px var(--accent); }
.viewer:fullscreen { height: 100vh; border-radius: 0; }
.rail { position: absolute; top: 10px; left: 10px; right: 10px; display: flex; flex-wrap: wrap; gap: 6px; pointer-events: none; z-index: 3; }
.rail button, .tourbar button { pointer-events: auto; font: 500 12px/1 var(--mono); color: var(--ink); background: color-mix(in srgb, var(--panel) 90%, transparent); border: 1px solid var(--line); border-radius: 999px; padding: 8px 11px; cursor: pointer; backdrop-filter: blur(6px); }
.rail button:hover, .tourbar button:hover { border-color: var(--ink); }
.rail button[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); }
.rail .spacer { flex: 1; }
.hud { position: absolute; left: 12px; right: 12px; bottom: 58px; display: flex; justify-content: space-between; gap: 10px; font: 500 12px/1.3 var(--mono); color: var(--muted); pointer-events: none; z-index: 3; }
.tourbar { position: absolute; left: 10px; right: 10px; bottom: 10px; display: flex; align-items: center; gap: 6px; padding: 6px; border: 1px solid var(--line); border-radius: 12px; background: color-mix(in srgb, var(--panel) 92%, transparent); backdrop-filter: blur(6px); z-index: 4; font: 400 13.5px/1.4 var(--display); }
.tourbar[hidden] { display: none; }
.tourbar [data-tour="play"] { color: var(--accent); border-color: var(--accent); }
.tour-text { flex: 1; min-width: 0; padding: 0 6px; }
.tour-n { font: 500 12px/1 var(--mono); color: var(--muted); padding: 0 4px; }
.lbl { font: 500 12.5px/1.2 var(--mono); color: var(--ink); background: color-mix(in srgb, var(--panel) 90%, transparent); border: 1px solid var(--line); padding: 3px 7px; border-radius: 6px; white-space: nowrap; pointer-events: auto; cursor: pointer; transform: translateY(-10px); user-select: none; }
.lbl:hover, .lbl.is-sel { border-color: var(--accent); color: var(--accent); }
.lbl.is-small { font-size: 11px; padding: 2px 5px; }
.lbl.is-bad { color: var(--bad); border-color: var(--bad); }
.lbl.is-good { color: var(--good); border-color: var(--good); }
.labels-off .lbl:not(.is-sel), .labels-crowded .lbl:not(.is-sel) { display: none; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px; display: grid; gap: 12px; }
.panel h2 { margin: 0; font-size: 22px; letter-spacing: -.01em; }
.kind { font: 500 11px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--accent); }
.panel p { margin: 0; }
.panel .muted { color: var(--muted); font-size: 14px; }
.actions, .parts { display: flex; flex-wrap: wrap; gap: 6px; }
.actions button, .parts button, .ctl button { font: 500 12.5px/1 var(--mono); color: var(--ink); background: var(--bg); border: 1px solid var(--line); border-radius: 999px; padding: 9px 12px; cursor: pointer; }
.parts button { padding: 6px 9px; font-size: 11.5px; }
.actions button:hover, .parts button:hover, .ctl button:hover:not(:disabled) { border-color: var(--ink); }
.actions .danger, .ctl .danger { color: var(--bad); border-color: currentColor; }
.ctl button[aria-pressed="true"] { color: var(--accent); border-color: var(--accent); }
.ctl button:disabled { opacity: .4; cursor: default; }
.facts { display: grid; grid-template-columns: max-content 1fr; gap: 4px 12px; margin: 0; font: 400 13px/1.45 var(--mono); }
.facts dt { color: var(--muted); }
.facts dd { margin: 0; overflow-wrap: anywhere; }
.tabs { display: flex; align-items: center; gap: 4px; border-bottom: 1px solid var(--line); margin-bottom: -6px; }
.tabs button { font: 500 12px/1 var(--mono); color: var(--muted); background: none; border: 0; border-bottom: 2px solid transparent; padding: 8px 10px; cursor: pointer; }
.tabs button[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--accent); }
.tabs [data-copy], .tabs [data-expand] { border: 1px solid var(--line); border-radius: 999px; padding: 5px 9px; margin-bottom: 4px; }
.tabs-gap { flex: 1; }
pre.code { max-height: 46vh; overflow: auto; font-size: 12px; line-height: 1.6; }
.yk { color: var(--accent); }
.ys { color: var(--good); }
.yc { color: var(--muted); }
.yn { color: var(--muted); font-style: italic; }
.yamlwide { border: 1px solid var(--line); border-radius: 12px; background: var(--panel); padding: 12px 14px; display: grid; gap: 8px; }
.yamlwide[hidden] { display: none; }
.yamlwide header { display: flex; justify-content: space-between; align-items: center; font: 500 12px/1 var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.yamlwide header button { font: inherit; color: var(--ink); background: none; border: 1px solid var(--line); border-radius: 999px; padding: 7px 11px; cursor: pointer; }
.yamlwide pre { max-height: none; font-size: 13px; line-height: 1.65; }
pre { margin: 0; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; font: 400 12.5px/1.55 var(--mono); white-space: pre; overflow-x: auto; background: var(--bg); }
pre b { font-weight: 500; }
pre mark { background: none; color: var(--good); }
.stats { font: 400 12px/1.6 var(--mono); color: var(--muted); margin: 0; }
.below { display: grid; gap: 12px; margin-top: 14px; }
.ctl { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.pair { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--line); border-radius: 999px; padding: 3px 4px 3px 12px; font: 500 12.5px/1 var(--mono); }
.pair button { padding: 6px 9px; border: 0; }
.status { margin: 0; font: 400 14px/1.55 var(--mono); min-height: 3em; }
.status[data-tone="bad"] { color: var(--bad); }
.status[data-tone="good"] { color: var(--good); }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font: 400 13px/1.45 var(--mono); font-variant-numeric: tabular-nums; }
th, td { text-align: left; padding: 7px 9px; border-bottom: 1px solid var(--line); white-space: nowrap; }
th { color: var(--muted); font-weight: 500; }
td[data-tone="good"] { color: var(--good); }
td[data-tone="bad"] { color: var(--bad); }
.caption { color: var(--muted); max-width: 80ch; margin: 18px 0 0; }
.next { display: flex; justify-content: flex-end; margin-top: 18px; }
.next a { text-decoration: none; font: 500 13px/1 var(--mono); border: 1px solid var(--line); border-radius: 999px; padding: 11px 15px; }
.fallback { padding: 24px; color: var(--muted); }
@media (max-width: 600px) { .top .where { flex-basis: 100%; order: 3; } .hud { bottom: 64px; } .hud #hint { display: none; } .viewer { height: min(66vh, 540px); } .rail button { padding: 7px 9px; font-size: 11.5px; } .tour-text { font-size: 12.5px; } }
`;

export function page3d({ title, pageTitle, lede, trackTitle, lessonNo, id, twoD, next, controls = "", caption = "", css = "", script, home }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(pageTitle || title)}</title>
<meta name="description" content="${esc(lede)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Schibsted+Grotesk:wght@400;500;700&display=swap">
<script>try{var t=localStorage.getItem("coursehub:theme");if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<style>${CSS}${css}</style>
</head>
<body>
<div class="wrap">
  <nav class="top" aria-label="Course"><a href="${home}">← Course Hub</a><span class="where">${esc(trackTitle)} · Lesson ${String(lessonNo).padStart(2, "0")} · 3D</span>${twoD ? `<a href="${twoD}">2D version</a>` : ""}<button type="button" id="done" aria-pressed="false">Mark complete</button></nav>
  <h1>${esc(title)}</h1>
  <p class="lede">${lede}</p>
  <div class="stage">
    <div class="viewer" id="viewer">
      <div class="rail" role="toolbar" aria-label="View">
        <button type="button" data-view="iso">Iso</button><button type="button" data-view="top">Top</button><button type="button" data-view="front">Front</button><button type="button" data-view="side">Side</button>
        <button type="button" id="spin" aria-pressed="false">Auto-rotate</button><span class="spacer"></span>
        <button type="button" id="labels" aria-pressed="true">Labels</button><button type="button" id="theme">Theme</button><button type="button" id="full">Full screen</button>
      </div>
      <div class="hud"><span id="hint">Drag to rotate · click a part</span><span id="readout"></span></div>
      <div class="tourbar" id="tourbar" hidden></div>
    </div>
    <aside class="panel" id="panel" aria-live="polite"></aside>
  </div>
  <div class="below"><section class="yamlwide" id="yamlwide" hidden aria-label="Object YAML"><header><span data-wide-title></span><button type="button" id="yamlwide-close">Close</button></header><pre class="code"></pre></section>${controls}</div>
  ${caption ? `<p class="caption">${caption}</p>` : ""}
  ${next ? `<div class="next"><a href="${next.href}">Next: ${esc(next.title)} →</a></div>` : ""}
</div>
<script>
(function(){var KEY="coursehub:done",ID=${JSON.stringify(id)},b=document.getElementById("done"),d=[];
try{d=JSON.parse(localStorage.getItem(KEY)||"[]")}catch(e){}
function s(){var on=d.indexOf(ID)>=0;b.setAttribute("aria-pressed",String(on));b.textContent=on?"✓ Completed":"Mark complete"}
b.addEventListener("click",function(){var i=d.indexOf(ID);if(i>=0)d.splice(i,1);else d.push(ID);try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){}s()});s()})();
</script>
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
} }
</script>
<script type="module">${(engine() + "\n// ---- lesson ----\n" + script).replace(/<\/script/gi, "<\\/script")}</script>
</body>
</html>`;
}
