/* app.js — CallDelta dashboard. Renders the JSON shape produced by src/export_dashboard.py. Opens on real model output for
   three earnings calls (real-data.js, written by src/ir_run.py); the synthetic demo file is only the Sample JSON download.
   No dependencies, no network requests (fonts aside). Charts are hand-drawn SVG. */
(() => {
'use strict';
const DEMO = window.CALLDELTA_DEMO, REAL = window.CALLDELTA_REAL, META = window.CALLDELTA_REAL_META;
const SVG_TAGS = new Set(['svg', 'rect', 'line', 'text', 'defs', 'pattern', 'path', 'g', 'title', 'circle', 'polyline', 'polygon']);
const $ = (s, r = document) => r.querySelector(s);
const h = (tag, attrs = {}, ...kids) => { const el = SVG_TAGS.has(tag) ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v === null || v === undefined || v === false) continue; if (k === 'class') el.setAttribute('class', v); else if (k === 'html') el.innerHTML = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v); } for (const kid of kids.flat(Infinity)) { if (kid === null || kid === undefined || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); } return el; };
const pct = (v, d = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`;
const tone = v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
const cls = v => v > 0.05 ? 'pos' : v < -0.05 ? 'neg' : 'neu';
const REQ_Q = ['label', 'mgmt', 'qa', 'hedging', 'guidance', 'eps_surprise', 'ret_5d', 'residual_5d'], REQ_T = ['company', 'sector', 'quarters', 'topics', 'extracts'];
function validate(obj) { // same rules the old React dashboard applied, plus numeric range checks
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return 'Root must be an object keyed by ticker symbol';
  const ts = Object.keys(obj); if (!ts.length) return 'No tickers found';
  for (const t of ts) { const c = obj[t]; if (!c || typeof c !== 'object' || Array.isArray(c)) return `${t}: must be an object`;
    for (const f of REQ_T) if (!(f in c)) return `${t}: missing field "${f}"`;
    if (!Array.isArray(c.quarters) || !c.quarters.length) return `${t}: "quarters" must be a non-empty array`;
    for (const [i, q] of c.quarters.entries()) { for (const f of REQ_Q) if (!(f in q)) return `${t} quarter ${i}: missing "${f}"`; for (const f of REQ_Q.slice(1)) if (typeof q[f] !== 'number' || !Number.isFinite(q[f])) return `${t} quarter ${i}: "${f}" must be a finite number`; if (q.mgmt < -1 || q.mgmt > 1 || q.qa < -1 || q.qa > 1) return `${t} quarter ${i}: tone must be within -1..1`;
      if ('sector_5d' in q && (typeof q.sector_5d !== 'number' || !Number.isFinite(q.sector_5d))) return `${t} quarter ${i}: "sector_5d" must be a finite number when present`; }
    for (const f of ['beta', 'gamma']) if (f in c && (typeof c[f] !== 'number' || !Number.isFinite(c[f]))) return `${t}: "${f}" must be a finite number when present`;
    if (!Array.isArray(c.topics)) return `${t}: "topics" must be an array`; if (!Array.isArray(c.extracts)) return `${t}: "extracts" must be an array`;
    // every topic and extract is checked too: a topic with only a name used to pass and then broke the page while drawing
    for (const [i, tp] of c.topics.entries()) { const at = `${t} topic ${i}`;
      if (!tp || typeof tp !== 'object' || Array.isArray(tp)) return `${at}: must be an object`;
      if (typeof tp.name !== 'string' || !tp.name.trim()) return `${at}: "name" must be a non-empty string`;
      for (const f of ['weight', 'mgmt', 'qa']) { if (!(f in tp)) return `${at} (${tp.name}): missing "${f}"`; if (typeof tp[f] !== 'number' || !Number.isFinite(tp[f])) return `${at} (${tp.name}): "${f}" must be a finite number`; }
      if (tp.weight < 0 || tp.weight > 1) return `${at} (${tp.name}): "weight" must be within 0..1`;
      if (tp.mgmt < -1 || tp.mgmt > 1 || tp.qa < -1 || tp.qa > 1) return `${at} (${tp.name}): tone must be within -1..1`; }
    for (const [i, e] of c.extracts.entries()) { const at = `${t} extract ${i}`;
      if (!e || typeof e !== 'object' || Array.isArray(e)) return `${at}: must be an object`;
      for (const f of ['tag', 'speaker', 'text']) { if (!(f in e)) return `${at}: missing "${f}"`; if (typeof e[f] !== 'string') return `${at}: "${f}" must be text`; } } }
  return null;
}
// an error toast that carries its fix as a button (`action`: { label, run }) stays until it is dismissed
function toast(msg, kind, action) { const box = $('#toasts'); const el = h('div', { class: 'toast enter', role: kind === 'error' ? 'alert' : 'status' }, h('span', {}, msg), action ? h('button', { class: 'btn btn-sm', onclick: () => { if (action.focus) action.focus().focus(); el.remove(); action.run(); } }, action.label) : null, h('button', { class: 'btn btn-ghost btn-sm', 'aria-label': 'Dismiss', onclick: () => el.remove() }, '×')); box.append(el); requestAnimationFrame(() => el.classList.remove('enter')); if (!action) setTimeout(() => el.remove(), kind === 'error' ? 8000 : 4000); }

const S = { data: REAL, custom: false, ticker: Object.keys(REAL)[0], view: {} };
const esc = s => String(s ?? '');
const fromHash = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch (e) { return location.hash.slice(1); } };   // a stray % must not stop the page

/* ---------- charts ---------- */
function trajectory(quarters) {
  const W = 640, H = 260, L = 36, R = 24, T = 14, B = 34, n = quarters.length;   // R leaves half a quarter label of room (the last one was cut)
  const x = i => L + (n > 1 ? i / (n - 1) : 0.5) * (W - L - R), y = v => T + (1 - (v + 0.5) / 1.5) * (H - T - B);
  const pathOf = key => quarters.map((q, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(q[key]).toFixed(1)}`).join(' ');
  const gap = quarters.map((q, i) => `${x(i).toFixed(1)},${y(q.mgmt).toFixed(1)}`).concat(quarters.map((q, i) => `${x(i).toFixed(1)},${y(q.qa).toFixed(1)}`).reverse()).join(' ');
  return h('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Management and analyst tone by quarter: ' + quarters.map(q => `${q.label} management ${tone(q.mgmt)}, analysts ${tone(q.qa)}`).join('; ') },
    [-0.5, 0, 0.5, 1].map(v => [h('line', { class: v === 0 ? 'zero' : 'grid', x1: L, x2: W - R, y1: y(v), y2: y(v) }), h('text', { x: L - 6, y: y(v) + 3, 'text-anchor': 'end' }, v.toFixed(1))]),
    h('polygon', { class: 'gapfill', points: gap }),
    h('path', { class: 'mgmt', d: pathOf('mgmt') }), h('path', { class: 'qa', d: pathOf('qa') }),
    quarters.map((q, i) => [h('circle', { class: 'dot-mgmt', cx: x(i), cy: y(q.mgmt), r: 3.5 }, h('title', {}, `${q.label} management ${tone(q.mgmt)}`)), h('circle', { class: 'dot-qa', cx: x(i), cy: y(q.qa), r: 3.5 }, h('title', {}, `${q.label} analysts ${tone(q.qa)}`)), h('text', { x: x(i), y: H - 12, 'text-anchor': 'middle' }, q.label)]));
}
function scatter(quarters) {
  const W = 420, H = 260, L = 44, R = 14, T = 14, B = 40;
  const xs = quarters.map(q => q.mgmt - q.qa), ys = quarters.map(q => q.residual_5d);
  const xmin = Math.min(0, ...xs) - 0.05, xmax = Math.max(0, ...xs) + 0.05, ymin = Math.min(0, ...ys) - 0.02, ymax = Math.max(0, ...ys) + 0.02;
  const x = v => L + (v - xmin) / (xmax - xmin) * (W - L - R), y = v => T + (1 - (v - ymin) / (ymax - ymin)) * (H - T - B);
  const yt = [], step = (ymax - ymin) > 0.2 ? 0.05 : 0.02; for (let v = Math.ceil(ymin / step) * step; v <= ymax + 1e-9; v += step) yt.push(+v.toFixed(3));
  return h('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Sentiment gap versus 5-day residual return, one point per call' },
    yt.map(v => [h('line', { class: 'grid', x1: L, x2: W - R, y1: y(v), y2: y(v) }), h('text', { x: L - 6, y: y(v) + 3, 'text-anchor': 'end' }, `${(v * 100).toFixed(0)}%`)]),
    h('line', { class: 'zero', x1: L, x2: W - R, y1: y(0), y2: y(0) }), h('line', { class: 'zero', y1: T, y2: H - B, x1: x(0), x2: x(0) }),
    quarters.map((q, i) => h('circle', { class: 'pt ' + (q.residual_5d > 0 ? 'up' : 'down'), cx: x(q.mgmt - q.qa), cy: y(q.residual_5d), r: 5, opacity: 0.45 + 0.55 * (i / Math.max(1, quarters.length - 1)) }, h('title', {}, `${q.label}: gap ${tone(q.mgmt - q.qa)}, residual ${pct(q.residual_5d)}, EPS surprise ${pct(q.eps_surprise)}`))),
    h('text', { x: (L + W - R) / 2, y: H - 8, 'text-anchor': 'middle' }, 'sentiment gap (management − analysts) →'),
    h('text', { x: 12, y: (T + H - B) / 2, transform: `rotate(-90 12 ${(T + H - B) / 2})`, 'text-anchor': 'middle' }, '5-day residual return'));
}
// What the default data is: which calls, where each transcript came from, which model scored it and when
function provenance() {
  const calls = META.calls.map((c, i) => [i ? ' · ' : '', h('a', { href: c.source_page, rel: 'noopener' }, `${c.company} ${c.label}`), ` (call ${c.call_date})`]);
  return h('p', { class: 'provenance' }, h('b', {}, 'Real data: '), calls, `. Scored from each company's own transcript by ${META.model}, run ${META.run_date}. EPS estimates and prices: Yahoo Finance.`);
}
function pearson(xs, ys) { const n = xs.length; if (n < 3) return null; const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null; }

// The residual is the file's number; the page re-derives it from the file's own parts so a reader can check it:
// residual = 5-day return − β × sector 5-day return − γ × EPS surprise (src/prices.py residual_return). Values are fractions;
// a difference within 0.05 percentage points counts as reconciled. Without sector_5d, β and γ the residual is not checkable.
function recSummary(data, tickers, calls) {
  const recs = tickers.flatMap(t => data[t].quarters.map(q => reconcile(data[t], q))), checkable = recs.filter(r => r.checkable), passing = checkable.filter(r => r.ok).length;
  const text = checkable.length === 0 ? `0/${calls} checkable` : checkable.length === calls ? `${passing}/${calls} reconcile` : `${passing}/${checkable.length} reconcile · ${calls - checkable.length} not checkable`;
  return h('span', { class: passing < checkable.length ? 'bad' : '' }, text);
}
function reconcile(c, q) {
  const num = v => typeof v === 'number' && Number.isFinite(v);
  const missing = [!num(q.sector_5d) && 'sector return', !num(c.beta) && 'β', !num(c.gamma) && 'γ'].filter(Boolean);
  if (missing.length) return { checkable: false, missing };
  const sectorPart = c.beta * q.sector_5d, surprisePart = c.gamma * q.eps_surprise, off = (q.ret_5d - sectorPart - surprisePart) - q.residual_5d;
  return { checkable: true, ok: Math.abs(off) <= 0.0005, off, sectorPart, surprisePart, beta: c.beta, gamma: c.gamma };
}

/* ---------- render ---------- */
// Every render replaces the page's elements, so the control a keyboard user was on disappears and focus drops to <body>:
// no focus ring, and Tab starts again from the top of the page (found 2026-09-16 with real key presses). The wrapper puts
// focus back on the same control (same attribute, or the same kind of control at the same position) or, when that control
// is gone, on the first visible heading of the page.
function focusKey(el) {
  if (!el || el === document.body || el === document.documentElement) return null;
  const scope = el.parentElement && el.parentElement.closest('[id]'), within = scope ? '#' + CSS.escape(scope.id) + ' ' : '', tag = el.tagName.toLowerCase();
  const quote = v => '"' + v.replace(/["\\]/g, '\\$&') + '"';
  const tries = ['id', 'data-id', 'data-key', 'data-sort', 'href', 'name'].filter(a => el.getAttribute(a)).map(a => within + tag + '[' + a + '=' + quote(el.getAttribute(a)) + ']');
  const kind = tag + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).map(c => CSS.escape(c)).join('.') : '');
  // a control inside a record (an element with data-id, such as a table row) is looked for in that same record first, then in
  // the record now at its place in the list (the next one moved up), and only then does focus go to the heading
  const rec = el.parentElement && el.parentElement.closest('[data-id]'), recs = rec ? within + rec.tagName.toLowerCase() + '[data-id]' : null;
  const recId = rec && rec.getAttribute('data-id'), recAt = rec ? [...document.querySelectorAll(recs)].indexOf(rec) : -1, inRec = rec ? [...rec.querySelectorAll(kind)].indexOf(el) : -1;
  const index = [...document.querySelectorAll(within + kind)].indexOf(el);
  const find = () => {
    for (const s of tries) { const x = document.querySelector(s); if (x) return x; }
    if (rec) { const r = document.querySelector(within + rec.tagName.toLowerCase() + '[data-id=' + quote(recId) + ']') || document.querySelectorAll(recs)[recAt]; return r ? r.querySelectorAll(kind)[inRec] || null : null; }
    return index < 0 ? null : document.querySelectorAll(within + kind)[index] || null;
  };
  find.caret = typeof el.selectionStart === 'number' ? [el.selectionStart, el.selectionEnd] : null;   // a text field keeps its caret
  return find;
}
// Where focus goes when there is no control to go back to, and where the skip link sends it: the first visible h1 in main,
// else the first visible h2, else main itself (one query for 'main h1, main h2, main' used to
// return main first, whose ring was off screen)
function firstHeading() {
  const seen = x => { const r = x.getBoundingClientRect(), cs = getComputedStyle(x); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && !/inset\(50%\)|rect\(0/.test(cs.clipPath + cs.clip); };
  const x = [...document.querySelectorAll('main h1')].find(seen) || [...document.querySelectorAll('main h2')].find(seen) || $('#main');
  if (x && !x.hasAttribute('tabindex')) x.setAttribute('tabindex', '-1');
  return x;
}
function restoreFocus(find) {
  if (!find || (document.activeElement && document.activeElement !== document.body)) return;
  let el = find();
  if (!el || !el.getClientRects().length) el = firstHeading();
  if (el) { el.focus(); if (document.activeElement !== el && (el = firstHeading())) el.focus(); }   // a disabled control does not take focus
  if (el && find.caret && el.setSelectionRange) try { el.setSelectionRange(find.caret[0], find.caret[1]); } catch (e) { /* not a text field */ }
}
function render() { const find = focusKey(document.activeElement); renderPage(); restoreFocus(find); }
// Arrow keys, Home and End move between the company tabs and open the one they land on (the WAI-ARIA tabs pattern).
function roving(e) {
  const opt = e.target.closest && e.target.closest('[role="radio"], [role="tab"]'), group = opt && opt.closest('[role="radiogroup"], [role="tablist"]');
  if (!group || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
  const all = [...group.querySelectorAll('[role="radio"], [role="tab"]')].filter(b => !b.disabled), i = all.indexOf(opt);
  const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  const next = move ? all[(i + move + all.length) % all.length] : e.key === 'Home' ? all[0] : e.key === 'End' ? all[all.length - 1] : null;
  if (!next) return false;
  e.preventDefault(); next.focus(); if (next !== opt) next.click(); return true;
}
function renderPage() {
  const main = $('#main'); main.innerHTML = '';
  const data = S.data, tickers = Object.keys(data); if (!data[S.ticker]) S.ticker = tickers[0];
  const c = data[S.ticker], qs = c.quarters, cur = qs[qs.length - 1], prev = qs[qs.length - 2] || cur;
  const calls = tickers.reduce((a, t) => a + data[t].quarters.length, 0);
  $('#pill-short').textContent = S.custom ? 'Your file' : 'Real calls';
  $('#pill-long').textContent = S.custom ? ' · loaded in this tab' : ` · ${META.calls.length} calls · ${META.model} · run ${META.run_date}`;
  $('#reset').hidden = !S.custom;
  // the address always names the company on screen, so a reload or a shared link opens the same one
  if (fromHash() !== S.ticker) history.replaceState(null, '', '#' + encodeURIComponent(S.ticker));
  main.append(h('div', { class: 'ticker-tabs', role: 'tablist', 'aria-label': 'Companies' }, tickers.map(t => h('button', { role: 'tab', id: 'tab-' + t, 'aria-controls': 'ticker-panel', 'aria-selected': t === S.ticker ? 'true' : 'false', onclick: () => { if (t === S.ticker) return; S.ticker = t; history.pushState(null, '', '#' + encodeURIComponent(t)); render(); } }, t)), h('span', { class: 'meta' }, `${qs.length} quarters · ${tickers.length} tickers · ${calls} calls · `, recSummary(data, tickers, calls))));
  if (!S.custom) main.append(provenance());
  const panel = h('div', { id: 'ticker-panel', role: 'tabpanel', 'aria-labelledby': 'tab-' + S.ticker }); main.append(panel);
  const gap = cur.mgmt - cur.qa, gapPrev = prev.mgmt - prev.qa, rec = reconcile(c, cur);
  panel.append(h('div', { class: 'company' }, h('div', {}, h('h1', {}, c.company), h('div', { class: 'sub' }, `${S.ticker} · ${c.sector} · latest call ${cur.date || cur.label}`)),
    h('div', { class: 'kpis' }, [['EPS surprise', cur.eps_surprise], ['5-day return', cur.ret_5d], ['5-day residual *', cur.residual_5d]].map(([l, v]) => h('div', { class: 'kpi' }, h('div', { class: 'lbl' }, l), h('div', { class: 'val ' + cls(v * 10) }, pct(v))))),
    rec.checkable
      ? h('div', { class: 'recon', role: 'note' }, `5-day return ${pct(cur.ret_5d)} = sector ${pct(rec.sectorPart)} (β ${rec.beta.toFixed(1)}) + surprise ${pct(rec.surprisePart)} (γ ${rec.gamma.toFixed(1)} × ${pct(cur.eps_surprise)}) + residual ${pct(cur.residual_5d)} `,
          rec.ok ? h('span', { class: 'ok' }, '✓ reconciles') : h('span', { class: 'bad' }, `✗ off by ${(Math.abs(rec.off) * 100).toFixed(2)} pp`))
      : h('div', { class: 'recon unknown', role: 'note' }, `${rec.missing.join(' and ')} not in this file — residual not checkable`),
    typeof c.note === 'string' && c.note ? h('p', { class: 'company-note', role: 'note' }, c.note) : null));
  // colour may repeat what a sign already says, never stand alone for good or bad: the strip's
  // unsigned figures and these deltas carry no colour classes
  const delta = v => qs.length < 2 ? h('small', {}, 'one quarter') : h('small', {}, `${v > 0 ? '▲' : v < 0 ? '▼' : '·'} ${tone(v)} vs prior`);
  panel.append(h('div', { class: 'strip', role: 'group', 'aria-label': 'Current quarter signals' },
    h('div', {}, h('div', { class: 'lbl' }, 'Management tone'), h('div', { class: 'val' }, h('b', { class: cls(cur.mgmt) }, tone(cur.mgmt)), delta(cur.mgmt - prev.mgmt))),
    h('div', {}, h('div', { class: 'lbl' }, 'Analyst Q&A tone'), h('div', { class: 'val' }, h('b', { class: cls(cur.qa) }, tone(cur.qa)), delta(cur.qa - prev.qa))),
    h('div', {}, h('div', { class: 'lbl' }, h('span', {}, 'Sentiment gap'), h('span', { class: 'tag ' + (gap > 0.2 ? 'tag-warning' : 'tag-neutral') }, gap > 0.2 ? 'wide' : 'normal')), h('div', { class: 'val' }, h('b', {}, tone(gap)), delta(gap - gapPrev))),
    h('div', {}, h('div', { class: 'lbl' }, 'Hedging density'), h('div', { class: 'val' }, h('b', {}, cur.hedging.toFixed(2)), delta(cur.hedging - prev.hedging))),
    h('div', {}, h('div', { class: 'lbl' }, 'Guidance confidence'), h('div', { class: 'val' }, h('b', {}, cur.guidance.toFixed(2)), delta(cur.guidance - prev.guidance)))));
  const maxW = Math.max(0.001, ...c.topics.map(t => t.weight));
  panel.append(h('div', { class: 'panels' },
    h('div', { class: 'chart' }, h('div', { class: 'ch-head' }, h('h2', {}, 'Multi-quarter sentiment trajectory'), h('p', {}, `Management prepared remarks vs analyst Q&A · ${qs.length} quarters · shaded band = framing gap`)), trajectory(qs), h('div', { class: 'legend' }, h('span', {}, h('i', { style: 'background:var(--viz-1)' }), 'Management'), h('span', {}, h('i', { style: 'background:var(--viz-2)' }), 'Analyst Q&A'), h('span', {}, h('i', { style: 'background:var(--viz-1);opacity:.25;height:8px' }), 'Framing gap'))),
    h('div', { class: 'chart' }, h('div', { class: 'ch-head' }, h('h2', {}, 'Topic emphasis'), h('p', {}, `${cur.label} · themes extracted by the model; bar = share of airtime`)), h('div', { class: 'topics' }, c.topics.length ? c.topics.map(t => { const g = t.mgmt - t.qa; return h('div', { class: 'topic' }, h('div', { class: 'head' }, h('b', {}, t.name), h('span', { class: 'mono muted' }, `${(t.weight * 100).toFixed(0)}% of call`)), h('div', { class: 'bar' }, h('i', { style: `width:${Math.min(100, t.weight / maxW * 100)}%` })), h('div', { class: 'tones' }, h('span', { class: cls(t.mgmt) }, 'M ' + tone(t.mgmt)), h('span', { class: cls(t.qa) }, 'Q ' + tone(t.qa)), Math.abs(g) > 0.25 ? h('span', { class: 'tag tag-warning' }, 'gap ' + tone(g)) : null)); }) : h('p', { class: 'muted' }, 'No topics in this file.')), h('p', { class: 'hint', style: 'margin-top:12px' }, 'Wide gaps show where analysts push back against management framing.'))));
  const r = pearson(qs.map(q => q.mgmt - q.qa), qs.map(q => q.residual_5d));
  panel.append(h('div', { class: 'panels-2' },
    h('div', { class: 'chart' }, h('div', { class: 'ch-head' }, h('h2', {}, 'Sentiment gap vs residual return'), h('p', {}, `5-day post-call return after controlling for sector and EPS surprise · one point per call · Pearson r = ${r === null ? 'n/a' : r.toFixed(2)} (n = ${qs.length}, illustrative, not a signal)`)), scatter(qs), h('p', { class: 'hint', style: 'margin-top:8px' }, 'Quadrant of interest: wide gap and negative residual — management rosy, market unconvinced.')),
    h('div', { class: 'card' }, h('h2', {}, 'Notable extracts'), h('p', { class: 'hint', style: 'margin-bottom:12px' }, S.custom ? `${cur.label} · passages the model tagged` : `${cur.label} · passages the model tagged in the prepared remarks, word for word, 25 words at most`), c.extracts.length ? c.extracts.map(e => h('div', { class: 'extract' }, h('div', {}, h('span', { class: 'cat' }, e.tag)), h('div', {}, h('q', {}, esc(e.text)), h('div', { class: 'who' }, '— ' + esc(e.speaker))))) : h('p', { class: 'muted' }, 'No extracts in this file.'))));
  main.append(h('div', { class: 'card' }, h('h2', {}, 'Methodology'), h('div', { class: 'method' }, h('div', {}, h('p', {}, 'Each transcript is split into prepared remarks and analyst Q&A and scored separately by the model against a fixed JSON schema, written into the prompt and validated, with one repair round (Anthropic, OpenAI, Gemini or an OpenAI-compatible server; native structured output is an option for Anthropic and OpenAI). Tone, hedging density, guidance confidence, topics and tagged passages come back as structured fields, so quarters are comparable.'), h('p', {}, '* Residual = 5-day return − β·sector-ETF return − γ·EPS surprise (β = 1, γ = 1.5 in the pipeline). What is left is what the tone of the call added beyond what was reported.'), h('p', {}, 'The data on this page is one run of this pipeline on three real calls, scored from the transcripts the companies publish themselves (', h('code', {}, 'python -m src.ir_run'), '). Analyst questions are scored as part of the Q&A section but never quoted, and no analyst is named. Load a JSON file produced by ', h('code', {}, 'python -m src.export_dashboard signals.csv'), ' to see your own run; the loader validates the shape and rejects malformed files with a specific message.')),
    h('div', {}, h('pre', { tabindex: '0', role: 'region', 'aria-label': 'Model output schema' }, `{
  "section": "prepared" | "qa",
  "tone": -1.0..1.0,
  "hedging_density": 0.0..1.0,
  "guidance_confidence": 0.0..1.0,
  "guidance_change": "raise" | "hold" | "lower" | "none",
  "topics": [ { "name", "weight": 0..1, "tone": -1..1 } ],
  "notable_passages": [ { "tag": "confident" | "hedging" | "evasion" | "admission" | "contradiction", "speaker", "text" } ]
}`), h('p', { class: 'sample-row' }, h('button', { class: 'btn btn-sm', id: 'sample', title: 'Download a synthetic example file to see the expected JSON shape', onclick: downloadSample }, 'Sample JSON'), h('span', {}, 'downloads a synthetic example (fictional companies, invented numbers) in the shape Load JSON reads.'))))));
}
// A file replaces what is on screen only after it has passed validation and been drawn without an error; otherwise the current
// data stays and the message names what is wrong (2026-09-16: a topic with only a name passed, replaced the data,
// and left a half-drawn page behind "Parse error: Cannot read properties of undefined").
function loadFile(file) { if (!file) return; const rd = new FileReader(); rd.onload = ev => {
  // each message says what is wrong and where the right shape is, keeps the current data, and offers to choose another file;
  // a script's own exception text is never shown
  // the message goes away with the button, so focus moves to Load JSON first rather than falling to <body>
  const again = { label: 'Choose another file', run: () => $('#file').click(), focus: () => $('#load') }, shape = 'Sample JSON, under the schema in the Methodology section, shows the shape the dashboard reads. Nothing was changed.';
  let parsed; try { parsed = JSON.parse(ev.target.result); } catch (e) { return toast(`${file.name} is not valid JSON. ${shape}`, 'error', again); }
  const err = validate(parsed); if (err) return toast(`${file.name} does not have the dashboard's shape: ${err}. ${shape}`, 'error', again);
  const before = { data: S.data, custom: S.custom, ticker: S.ticker };
  Object.assign(S, { data: parsed, custom: true, ticker: Object.keys(parsed)[0] });
  try { render(); } catch (e) { Object.assign(S, before); render(); console.error(e); return toast(`${file.name} passed the checks but could not be drawn. ${shape}`, 'error', again); }
  toast(`Loaded ${Object.keys(parsed).length} tickers, ${Object.values(parsed).reduce((a, c) => a + c.quarters.length, 0)} calls from ${file.name}`); };
  rd.onerror = () => toast(`Could not read ${file.name}. Nothing was changed.`, 'error', { label: 'Choose another file', run: () => $('#file').click(), focus: () => $('#load') }); rd.readAsText(file); }
// Sample JSON sits next to the schema in the Methodology card (re-rendered with the page), so its handler is attached there
function downloadSample() { const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(DEMO, null, 2)], { type: 'application/json' })), download: 'dashboard_sample_synthetic.json' }); document.body.append(a); a.click(); a.remove(); }
function init() {
  const root = document.documentElement, tb = $('#theme');
  Appearance.bindToggle(tb);   // ◐ switches light/dark only (appearance.js)
  Appearance.bindSettings($('#nl-settings-button'));   // the gear: palette + light/dark
  $('#load').addEventListener('click', () => $('#file').click()); $('#file').addEventListener('change', e => { loadFile(e.target.files[0]); e.target.value = ''; });
  $('#reset').addEventListener('click', () => { S.data = REAL; S.custom = false; S.ticker = Object.keys(REAL)[0]; render(); toast('Back to the real calls'); });
  document.addEventListener('dragover', e => e.preventDefault()); document.addEventListener('drop', e => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); });
  const t = fromHash(); if (t && REAL[t]) S.ticker = t;
  // any other address (the home link's "#", an old ticker) shows the first company, and render() writes its ticker back
  window.addEventListener('hashchange', () => { const t = fromHash(); S.ticker = S.data[t] ? t : Object.keys(S.data)[0]; render(); });
  $('.skip').addEventListener('click', e => { e.preventDefault(); firstHeading().focus(); });   // "#main" in the address would be read as a ticker
  document.addEventListener('keydown', roving);
  render();
}
window.CallDelta = { state: S, validate, pearson };
init();
})();
