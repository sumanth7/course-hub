// A small YAML reader for the editor and `kubectl apply`: block maps and lists, flow { } and [ ],
// quoted and plain scalars, | and > blocks, comments and --- documents. Errors carry a line number
// and read like the API server's.
const YAML = (() => {
  class YErr extends Error { constructor(line, msg) { super(`error converting YAML to JSON: yaml: line ${line}: ${msg}`); this.line = line; } }
  const stripComment = (s) => {
    let q = null;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { if (c === "\\" && q === '"') i++; else if (c === q) q = null; }
      else if (c === '"' || c === "'") { if (i === 0 || /[\s:\[{,-]/.test(s[i - 1])) q = c; }
      else if (c === "#" && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i);
    }
    return s;
  };
  function scalar(raw, ln) {
    const s = raw.trim();
    if (s === "" || s === "~" || s === "null") return null;
    if (s === "true") return true;
    if (s === "false") return false;
    if (/^-?\d+$/.test(s)) return parseInt(s, 10);
    if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
    if (s[0] === '"') { if (!/^"(?:[^"\\]|\\.)*"$/.test(s)) throw new YErr(ln, "found unexpected end of stream"); return JSON.parse(s); }
    if (s[0] === "'") { if (!/^'(?:[^']|'')*'$/.test(s)) throw new YErr(ln, "found unexpected end of stream"); return s.slice(1, -1).replace(/''/g, "'"); }
    if (/^[&*!|>%@`]/.test(s)) throw new YErr(ln, `found character that cannot start any token`);
    if (/:\s/.test(s) || s.endsWith(":")) throw new YErr(ln, "mapping values are not allowed in this context");
    return s;
  }
  // flow collections: { a: 1, b: [x, y] }
  function flow(src, ln) {
    let i = 0;
    const ws = () => { while (i < src.length && /\s/.test(src[i])) i++; };
    const fail = (m) => { throw new YErr(ln, m); };
    function value() {
      ws();
      if (src[i] === "{") { i++; const o = {}; ws(); if (src[i] === "}") { i++; return o; } for (;;) { ws(); const k = key(); ws(); if (src[i] !== ":") fail("did not find expected ':'"); i++; o[k] = value(); ws(); if (src[i] === ",") { i++; continue; } if (src[i] === "}") { i++; return o; } fail("did not find expected ',' or '}'"); } }
      if (src[i] === "[") { i++; const a = []; ws(); if (src[i] === "]") { i++; return a; } for (;;) { a.push(value()); ws(); if (src[i] === ",") { i++; continue; } if (src[i] === "]") { i++; return a; } fail("did not find expected ',' or ']'"); } }
      if (src[i] === '"' || src[i] === "'") { const q = src[i]; let j = i + 1; while (j < src.length && src[j] !== q) j += src[j] === "\\" ? 2 : 1; if (j >= src.length) fail("found unexpected end of stream"); const s = src.slice(i, j + 1); i = j + 1; return scalar(s, ln); }
      let j = i; while (j < src.length && !/[,\]}]/.test(src[j]) && !(src[j] === ":" && /[\s,\]}]/.test(src[j + 1] || " "))) j++;
      const s = src.slice(i, j); i = j; return scalar(s, ln);
    }
    function key() { let j = i; if (src[i] === '"') { j = src.indexOf('"', i + 1) + 1; const k = JSON.parse(src.slice(i, j)); i = j; return k; } while (j < src.length && src[j] !== ":" && !/[,{}\[\]]/.test(src[j])) j++; const k = src.slice(i, j).trim(); if (!k) fail("did not find expected key"); i = j; return k; }
    const v = value(); ws();
    if (i < src.length) fail("did not find expected <document start>");
    return v;
  }
  const valueOf = (raw, ln) => { const s = raw.trim(); return s[0] === "{" || s[0] === "[" ? flow(s, ln) : scalar(s, ln); };
  // split "key: rest" at the first ": " outside quotes and brackets
  function splitKey(s) {
    let q = null, depth = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { if (i === 0) q = c; continue; }
      if (c === "{" || c === "[") { if (i === 0) return null; depth++; } else if (c === "}" || c === "]") depth--;
      else if (c === ":" && depth === 0 && (i === s.length - 1 || s[i + 1] === " ")) { let k = s.slice(0, i).trim(); if (/^".*"$|^'.*'$/.test(k)) k = k.slice(1, -1); return [k, s.slice(i + 1)]; }
    }
    return null;
  }
  function parseDoc(lines) {
    // lines: [{ n, indent, text }]
    let p = 0;
    function block(indent) {
      const first = lines[p];
      if (first.text.startsWith("- ") || first.text === "-") return seq(first.indent);
      return map(first.indent);
    }
    function nested(parentIndent, ln, allowSeqSame) {
      const nx = lines[p];
      if (!nx) return null;
      if (nx.indent > parentIndent || (allowSeqSame && nx.indent === parentIndent && (nx.text.startsWith("- ") || nx.text === "-"))) return block(nx.indent);
      return null;
    }
    function blockScalar(style, indent) {
      const out = [];
      while (p < lines.length && (lines[p].indent > indent || lines[p].blank)) { out.push(lines[p].raw); p++; }
      const cut = Math.min(...out.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length), 99);
      const body = out.map((l) => l.slice(cut)).join(style === ">" ? " " : "\n").replace(/\s+$/, "");
      return body + "\n";
    }
    function map(indent) {
      const o = {};
      while (p < lines.length) {
        const l = lines[p];
        if (l.blank) { p++; continue; }
        if (l.indent < indent) break;
        if (l.indent > indent) throw new YErr(l.n, "did not find expected key");
        if (l.text.startsWith("- ")) break;
        const kv = splitKey(l.text);
        if (!kv) throw new YErr(l.n, l.text.includes(":") ? "mapping values are not allowed in this context" : "could not find expected ':'");
        const [k, rest] = kv;
        if (k in o) throw new YErr(l.n, `key "${k}" already set in map`);
        p++;
        const r = rest.trim();
        if (r === "|" || r === ">" || r === "|-" || r === ">-") o[k] = blockScalar(r[0], indent);
        else if (r === "") o[k] = nested(indent, l.n, true);
        else o[k] = valueOf(r, l.n);
      }
      return o;
    }
    function seq(indent) {
      const a = [];
      while (p < lines.length) {
        const l = lines[p];
        if (l.blank) { p++; continue; }
        if (l.indent < indent) break;
        if (l.indent > indent) throw new YErr(l.n, "did not find expected '-' indicator");
        if (!(l.text.startsWith("- ") || l.text === "-")) break;
        const rest = l.text === "-" ? "" : l.text.slice(2);
        if (rest.trim() === "") { p++; a.push(nested(indent, l.n, false)); continue; }
        const kv = splitKey(rest.trim());
        if (kv) {
          // "- key: value" starts a map whose keys sit two columns in
          const inner = indent + 2 + (rest.length - rest.trimStart().length);
          lines[p] = { ...l, indent: inner, text: rest.trim() };
          a.push(map(inner));
        } else { p++; a.push(valueOf(rest, l.n)); }
      }
      return a;
    }
    while (p < lines.length && lines[p].blank) p++;
    if (p >= lines.length) return null;
    const v = block(lines[p].indent);
    while (p < lines.length && lines[p].blank) p++;
    if (p < lines.length) throw new YErr(lines[p].n, "did not find expected key");
    return v;
  }
  function parseAll(text) {
    const docs = [[]];
    String(text).replace(/\r/g, "").split("\n").forEach((raw, k) => {
      const n = k + 1;
      if (/^---\s*(#.*)?$/.test(raw)) { docs.push([]); return; }
      if (/^\t| \t/.test(raw.match(/^\s*/)[0])) throw new YErr(n, "found a tab character that violates indentation");
      const code = stripComment(raw).replace(/\s+$/, "");
      const indent = code.match(/^ */)[0].length;
      docs[docs.length - 1].push({ n, raw, indent, text: code.trim(), blank: code.trim() === "" });
    });
    return docs.map(parseDoc).filter((d) => d !== null);
  }
  // { a: { b: [1, 2] } } → { "a.b[0]": 1, "a.b[1]": 2 }
  function flatten(v, pre = "", out = {}) {
    if (Array.isArray(v)) { if (!v.length) out[pre] = "[]"; v.forEach((x, i) => flatten(x, `${pre}[${i}]`, out)); }
    else if (v && typeof v === "object") { const ks = Object.keys(v); if (!ks.length && pre) out[pre] = "{}"; ks.forEach((k) => flatten(v[k], pre ? `${pre}.${k}` : k, out)); }
    else out[pre] = v;
    return out;
  }
  const get = (o, path) => path.split(/\.|\[(\d+)\]/).filter((x) => x !== undefined && x !== "").reduce((a, k) => (a == null ? a : a[k]), o);
  return { parseAll, parse: (t) => parseAll(t)[0], flatten, get, YErr };
})();
