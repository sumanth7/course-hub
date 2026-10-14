// Renders the Course Hub landing page (site/index.html) from the catalogue.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function card(track, lesson, n, thumbs) {
  const id = `${track.id}/${lesson.slug}`;
  const live = lesson.status === "live";
  const base = `assets/thumbs/${track.id}-${lesson.slug}`;
  const thumb = thumbs.has(`${track.id}-${lesson.slug}-dark`)
    ? `<img data-thumb="${base}" src="${base}-light.png" alt="" loading="lazy" width="700" height="491">`
    : `<span class="plate-empty" aria-hidden="true"><span>Fig ${n}</span></span>`;
  const meta = live ? `<span class="chip chip-live">Live</span>${lesson.has3d ? '<span class="chip chip-live">3D</span>' : ""}${lesson.minutes ? `<span>${lesson.minutes} min</span>` : ""}` : `<span class="chip">Planned</span>`;
  const inner = `${live ? `
      <span class="thumb">${thumb}</span>` : ""}
      <span class="body">
        <span class="num">Lesson ${String(n).padStart(2, "0")}</span>
        <span class="title">${esc(lesson.title)}</span>
        <span class="goal">${esc(lesson.goal)}</span>${lesson.concepts ? `
        <span class="concepts" aria-label="Concepts covered">${lesson.concepts.map((c) => `<span>${esc(c)}</span>`).join("")}</span>` : ""}
        <span class="meta">${meta}<span class="done-mark" aria-hidden="true">✓ Done</span></span>
      </span>`;
  return live
    ? lesson.has3d
      ? `<li><a class="card is-live" data-lesson="${id}" data-3d href="${track.id}/${lesson.slug}/${lesson.only3d ? "" : "3d/"}">${inner}</a></li>`
      : `<li><a class="card is-live" data-lesson="${id}" data-href="${track.id}/${lesson.slug}/" href="${track.id}/${lesson.slug}/">${inner}</a></li>`
    : `<li><div class="card is-planned" data-lesson="${id}">${inner}</div></li>`;
}

export function hubHtml({ site, tracks, thumbs }) {
  const total = tracks.reduce((s, t) => s + t.lessons.filter((l) => l.status === "live").length, 0);
  const sections = tracks
    .map((t) => {
      const live = t.lessons.filter((l) => l.status === "live").length;
      return `
    <section class="track" id="${t.id}" aria-labelledby="h-${t.id}">
      <header class="track-head">
        <div>
          <h2 id="h-${t.id}">${esc(t.title)}</h2>
          <p>${esc(t.blurb)}</p>
        </div>
        <p class="track-count" data-track="${t.id}" data-live="${live}">${live ? `<span class="n">0</span> of ${live} done · ` : "Coming soon · "}${t.lessons.length - live} planned</p>
      </header>
      <ol class="grid">${t.lessons.map((l, i) => card(t, l, i + 1, thumbs)).join("")}</ol>
    </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(site.title)}</title>
<meta name="description" content="${esc(site.tagline)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Schibsted+Grotesk:wght@400;500;700&display=swap">
<script>try{var t=localStorage.getItem("coursehub:theme");if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<style>
/* Layout: a drafting-room index. One column of tracks, each a grid of figure plates; the plates carry the colour, the page stays quiet. */
:root {
  --bg: #f1f1ee; --surface: #fbfbfa; --ink: #1a1b1e; --muted: #64666d; --line: #dcdcd8; --accent: #3557c9; --done: #2a8655;
  --display: "Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --bg: #0d0d0e; --surface: #151516; --ink: #e8e8eb; --muted: #8d8f96; --line: #2b2b2e; --accent: #8aa4ff; --done: #5cc28c; color-scheme: dark; }
}
:root[data-theme="dark"] { --bg: #0d0d0e; --surface: #151516; --ink: #e8e8eb; --muted: #8d8f96; --line: #2b2b2e; --accent: #8aa4ff; --done: #5cc28c; color-scheme: dark; }
* { box-sizing: border-box; }
html { background: var(--bg); }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.55 var(--display); padding-inline: 16px; padding-block: env(safe-area-inset-top, 0px) env(safe-area-inset-bottom, 0px); }
.wrap { max-width: 1120px; margin: 0 auto; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 4px; }

.top { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-block: 20px; font: 500 12px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.theme { font: inherit; letter-spacing: inherit; text-transform: inherit; color: var(--muted); background: none; border: 1px solid var(--line); border-radius: 999px; padding: 8px 12px; cursor: pointer; }
.theme:hover { color: var(--ink); }

.hero { display: grid; gap: 20px; padding-block: 40px 32px; border-bottom: 1px solid var(--line); }
.hero h1 { margin: 0; font-weight: 700; font-size: clamp(40px, 7vw, 76px); line-height: .95; letter-spacing: -.03em; text-wrap: balance; }
.hero p { margin: 0; max-width: 60ch; font-size: 18px; color: var(--muted); }
.progress { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; font: 400 13px/1.4 var(--mono); color: var(--muted); }
.bar { flex: 1 1 220px; max-width: 360px; height: 6px; background: var(--line); border-radius: 999px; overflow: hidden; }
.bar span { display: block; height: 100%; width: 0; background: var(--done); transition: width .5s ease; }
.jump { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.jump a { display: inline-block; text-decoration: none; font: 500 13px/1 var(--mono); padding: 9px 12px; border: 1px solid var(--line); border-radius: 999px; color: var(--ink); }
.jump a:hover { border-color: var(--ink); }
.proto { margin: 0; font: 400 14px/1.5 var(--mono); color: var(--muted); }
.proto a { color: var(--accent); text-decoration: none; font-weight: 500; margin-right: 8px; }
.proto a:hover { text-decoration: underline; }

.track { padding-block: 48px 8px; scroll-margin-top: 16px; }
.track-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 8px 24px; margin-bottom: 20px; }
.track-head h2 { margin: 0; font-size: 30px; letter-spacing: -.02em; }
.track-head p { margin: 4px 0 0; color: var(--muted); max-width: 60ch; }
.track-count { font: 400 13px/1.4 var(--mono); font-variant-numeric: tabular-nums; color: var(--muted); margin: 0; }

.grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 16px; align-items: start; }
.card { display: flex; flex-direction: column; height: 100%; text-decoration: none; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.card.is-live { transition: border-color .2s, transform .2s; }
.card.is-live:hover { border-color: var(--ink); transform: translateY(-2px); }
.thumb { display: block; aspect-ratio: 700 / 491; max-width: 100%; border-bottom: 1px solid var(--line); background: var(--bg); }
.thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.plate-empty { display: grid; place-items: end start; width: 100%; height: 100%; padding: 12px; background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px); background-size: 20px 20px; background-position: -1px -1px; opacity: .7; }
.plate-empty span { font: 500 11px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); background: var(--bg); padding: 4px 6px; border-radius: 4px; }
.body { display: flex; flex-direction: column; gap: 6px; padding: 16px; flex: 1; }
.num { font: 500 11px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.title { font-weight: 700; font-size: 19px; line-height: 1.25; text-wrap: balance; }
.goal { color: var(--muted); font-size: 15px; }
.concepts { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.concepts span { font: 400 11px/1.3 var(--mono); color: var(--muted); padding: 3px 6px; border-radius: 4px; background: color-mix(in srgb, var(--line) 55%, transparent); }
.meta { margin-top: auto; padding-top: 10px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font: 400 12px/1 var(--mono); color: var(--muted); }
.chip { padding: 5px 8px; border-radius: 999px; border: 1px solid var(--line); }
.chip-live { color: var(--accent); border-color: currentColor; }
.card.is-planned { background: transparent; border-style: dashed; }
.is-planned .title { color: var(--muted); font-size: 17px; }
.is-planned .goal { font-size: 14px; }
.done-mark { display: none; color: var(--done); font-weight: 500; }
.card.is-done .done-mark { display: inline; }
.card.is-done { border-color: color-mix(in srgb, var(--done) 55%, var(--line)); }

footer { margin-top: 56px; padding-block: 24px 40px; border-top: 1px solid var(--line); color: var(--muted); font: 400 13px/1.6 var(--mono); }
@media (prefers-reduced-motion: reduce) { .card.is-live, .bar span { transition: none; } .card.is-live:hover { transform: none; } }
</style>
</head>
<body>
<div class="wrap">
  <div class="top"><span>${esc(site.title)}</span><button class="theme" id="theme" type="button">Theme: system</button></div>
  <header class="hero">
    <h1>${esc(site.title)}</h1>
    <p>${esc(site.tagline)}</p>
    <div class="progress"><span class="bar" aria-hidden="true"><span id="bar"></span></span><span id="overall" aria-live="polite">0 of ${total} live lessons complete</span></div>
    <ul class="jump">${tracks.map((t) => `<li><a href="#${t.id}">${esc(t.title)}</a></li>`).join("")}</ul>
    <p class="proto"><a href="kubernetes/production/">New: a request in production, CDN to pod →</a> <span>plus edge, delivery, observability and platform lessons, each with a live terminal</span></p>
  </header>
  ${sections}
  <footer>Progress is saved in this browser only. Each lesson has a dark and a light version; the hub opens the one that matches your theme.</footer>
</div>
<script>
(function () {
  var KEY = "coursehub:done", total = ${total};
  var done = [];
  try { done = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) {}
  var cards = document.querySelectorAll(".card");
  var count = 0;
  cards.forEach(function (c) { var on = done.indexOf(c.dataset.lesson) >= 0; c.classList.toggle("is-done", on); if (on && c.classList.contains("is-live")) count++; });
  document.getElementById("overall").textContent = count + " of " + total + " live lessons complete";
  document.getElementById("bar").style.width = (total ? (100 * count) / total : 0) + "%";
  document.querySelectorAll(".track-count").forEach(function (el) {
    var n = 0; document.querySelectorAll("#" + el.dataset.track + " .card.is-live.is-done").forEach(function () { n++; });
    var slot = el.querySelector(".n"); if (slot) slot.textContent = n;
  });
  // theme: system → light → dark
  var btn = document.getElementById("theme"), root = document.documentElement;
  var order = ["", "light", "dark"];
  function dark() { return root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; }
  function sync() {
    btn.textContent = "Theme: " + (root.dataset.theme || "system");
    var d = dark();
    document.querySelectorAll("a.card[data-href]").forEach(function (a) { a.href = a.dataset.href + (d ? "" : "index-light.html"); });
    document.querySelectorAll("img[data-thumb]").forEach(function (img) { var src = img.dataset.thumb + (d ? "-dark.png" : "-light.png"); if (img.getAttribute("src") !== src) img.setAttribute("src", src); });
  }
  btn.addEventListener("click", function () {
    var next = order[(order.indexOf(root.dataset.theme || "") + 1) % order.length];
    if (next) root.dataset.theme = next; else delete root.dataset.theme;
    try { next ? localStorage.setItem("coursehub:theme", next) : localStorage.removeItem("coursehub:theme"); } catch (e) {}
    sync();
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", sync);
  sync();
})();
</script>
</body>
</html>`;
}

// The bar injected at the top of every lesson page: back to the hub, theme switch, mark complete, next lesson.
export function lessonNav({ track, lesson, index, next, theme, threeD = false }) {
  const id = `${track.id}/${lesson.slug}`;
  const other = theme === "light" ? "index.html" : "index-light.html";
  const nextHref = next ? `../${next.slug}/${theme === "light" ? "index-light.html" : ""}` : "";
  return `<style>
.ch-nav{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;margin:0 0 18px;font:500 12px/1.2 var(--anatomy-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--anatomy-muted)}
.ch-nav a{color:var(--anatomy-text);text-decoration:none}
.ch-nav a:hover{color:var(--anatomy-strong)}
.ch-nav .ch-where{flex:1;min-width:0}
.ch-nav button{font:inherit;letter-spacing:inherit;text-transform:inherit;color:var(--anatomy-strong);background:none;border:1px solid var(--anatomy-muted);border-radius:999px;padding:7px 12px;cursor:pointer}
.ch-nav button[aria-pressed="true"]{border-color:var(--anatomy-green);color:var(--anatomy-green)}
.ch-next{display:flex;justify-content:flex-end;margin-top:22px;font:500 13px/1 var(--anatomy-mono)}
.ch-next a{color:var(--anatomy-strong);text-decoration:none;border:1px solid var(--anatomy-muted);border-radius:999px;padding:10px 14px}
</style>
<nav class="ch-nav" aria-label="Course"><a href="../../">← Course Hub</a><span class="ch-where">${esc(track.title)} · Lesson ${String(index + 1).padStart(2, "0")}</span>${threeD ? '<a href="3d/">3D version</a>' : ""}<a href="${other}">${theme === "light" ? "Dark" : "Light"} version</a><button type="button" id="ch-done" aria-pressed="false">Mark complete</button></nav>
<script>
(function(){var KEY="coursehub:done",ID=${JSON.stringify(id)},b=document.getElementById("ch-done"),d=[];
try{d=JSON.parse(localStorage.getItem(KEY)||"[]")}catch(e){}
function s(){var on=d.indexOf(ID)>=0;b.setAttribute("aria-pressed",String(on));b.textContent=on?"✓ Completed":"Mark complete"}
b.addEventListener("click",function(){var i=d.indexOf(ID);if(i>=0)d.splice(i,1);else d.push(ID);try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){}s()});s()})();
</script>`;
}
export const nextLink = (next, theme) =>
  next ? `<div class="ch-next"><a href="../${next.slug}/${theme === "light" ? "index-light.html" : ""}">Next: ${esc(next.title)} →</a></div>` : "";
