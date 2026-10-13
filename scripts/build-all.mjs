// Builds the whole site into site/: every live lesson (dark and light) with the course nav, then the hub page.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, TRACKS } from "../catalog.mjs";
import { hubHtml, lessonNav, nextLink } from "./hub.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "site");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let built = 0;
for (const track of TRACKS) {
  const live = track.lessons.filter((l) => l.status === "live");
  track.lessons.forEach((lesson, index) => {
    if (lesson.status !== "live") return;
    const script = join(ROOT, "tracks", track.id, lesson.slug, "build.mjs");
    if (!existsSync(script)) throw new Error(`${track.id}/${lesson.slug} is marked live but has no build.mjs`);
    const next = live[live.indexOf(lesson) + 1];
    for (const theme of ["dark", "light"]) {
      execFileSync(process.execPath, [script, ...(theme === "light" ? ["--light"] : [])], { stdio: "inherit" });
      const file = join(OUT, track.id, lesson.slug, theme === "light" ? "index-light.html" : "index.html");
      let html = readFileSync(file, "utf8");
      html = html.replace('<main class="iso-page">', `<main class="iso-page">${lessonNav({ track, lesson, index, next, theme })}`);
      html = html.replace("</main>", `${nextLink(next, theme)}</main>`);
      writeFileSync(file, html);
    }
    built++;
  });
}

const thumbsDir = join(ROOT, "assets", "thumbs");
const thumbs = new Set();
if (existsSync(thumbsDir)) {
  mkdirSync(join(OUT, "assets", "thumbs"), { recursive: true });
  for (const name of readdirSync(thumbsDir).filter((n) => n.endsWith(".png"))) {
    copyFileSync(join(thumbsDir, name), join(OUT, "assets", "thumbs", name));
    thumbs.add(name.replace(/\.png$/, ""));
  }
}
writeFileSync(join(OUT, "index.html"), hubHtml({ site: SITE, tracks: TRACKS, thumbs }));
writeFileSync(join(OUT, ".nojekyll"), "");
console.log(`built ${built} lessons and the hub into site/`);
