// check-web.mjs — the static dashboard's own checks: no external scripts, demo and real data pass the loader's validation,
// a mutated file is rejected (negative control), and the Pearson helper matches a hand-computed value.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import vm from 'node:vm';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(HERE, 'index.html'), 'utf8');
const results = []; let failed = 0;
const check = (name, ok, detail = '') => { results.push([ok ? 'PASS' : 'FAIL', name, detail]); if (!ok) failed++; };
check('index.html loads no external <script src="http…">', !/<script[^>]+src="https?:/.test(html));
check('external URLs are only fonts and GitHub', [...html.matchAll(/https?:\/\/[^"' )>]+/g)].map(m => m[0]).every(u => /fonts\.g(oogleapis|static)\.com|github\.com\/NickkkLian/.test(u)));
// run demo-data.js + the validate() function from app.js in a bare sandbox
const sandbox = { window: {}, document: null, console }; sandbox.self = sandbox.window;
vm.runInNewContext(fs.readFileSync(path.join(HERE, 'demo-data.js'), 'utf8'), sandbox);
const app = fs.readFileSync(path.join(HERE, 'app.js'), 'utf8');
const validateSrc = app.slice(app.indexOf('const REQ_Q ='), app.indexOf('function toast('));
const pearsonSrc = app.slice(app.indexOf('function pearson('), app.indexOf('/* ---------- render'));
const ctx = { console }; vm.runInNewContext(validateSrc + '\n' + pearsonSrc + '\nglobalThis.__v = validate; globalThis.__p = pearson; globalThis.__r = reconcile;', ctx);
const demo = sandbox.window.CALLDELTA_DEMO;
check('demo data has 4 fictional tickers × 8 quarters', Object.keys(demo).length === 4 && Object.values(demo).every(c => c.quarters.length === 8));
check('demo data passes the loader validation', ctx.__v(demo) === null, String(ctx.__v(demo)));
check('every demo company is labelled fictional and no speaker is a named person', Object.values(demo).every(c => /fictional/i.test(c.company) && c.extracts.every(e => /fictional|Management response/.test(e.speaker))));
const bad = JSON.parse(JSON.stringify(demo)); delete bad.NWSC.quarters[2].residual_5d;
check('negative control: a quarter missing residual_5d is rejected with a specific message', /NWSC quarter 2: missing "residual_5d"/.test(String(ctx.__v(bad))), String(ctx.__v(bad)));
const bad2 = JSON.parse(JSON.stringify(demo)); bad2.HRBS.quarters[0].mgmt = 1.7;
check('negative control: a tone outside -1..1 is rejected', /tone must be within/.test(String(ctx.__v(bad2))));
// residual reconciliation: the page re-derives residual_5d from ret_5d, sector_5d, beta, gamma and eps_surprise
const recs = Object.values(demo).flatMap(c => c.quarters.map(q => ctx.__r(c, q)));
check('every demo quarter reconciles (residual = return − β·sector − γ·surprise within 0.05 pp)', recs.length === 32 && recs.every(r => r.checkable && r.ok), `${recs.filter(r => r.checkable && r.ok).length}/${recs.length}`);
const off = JSON.parse(JSON.stringify(demo)); off.NWSC.quarters[7].residual_5d += 0.01;
const rOff = ctx.__r(off.NWSC, off.NWSC.quarters[7]);
check('negative control: a residual moved by 1 pp is flagged, with the size of the gap', rOff.checkable && !rOff.ok && Math.abs(Math.abs(rOff.off) - 0.01) < 1e-9, JSON.stringify({ ok: rOff.ok, off: rOff.off }));
const noSector = JSON.parse(JSON.stringify(demo)); delete noSector.HRBS.quarters[0].sector_5d;
check('a quarter without sector_5d is "not checkable", never a pass', ctx.__r(noSector.HRBS, noSector.HRBS.quarters[0]).checkable === false && ctx.__v(noSector) === null);
const bad3 = JSON.parse(JSON.stringify(demo)); bad3.VLTW.quarters[1].sector_5d = 'n/a';
check('negative control: a non-numeric sector_5d is rejected by the loader', /VLTW quarter 1: "sector_5d" must be a finite number/.test(String(ctx.__v(bad3))), String(ctx.__v(bad3)));
const bad4 = JSON.parse(JSON.stringify(demo)); bad4.NWSC.topics = [{ name: 'Pricing' }];
check('negative control: a topic with only a name is rejected with the field it lacks', /NWSC topic 0 \(Pricing\): missing "weight"/.test(String(ctx.__v(bad4))), String(ctx.__v(bad4)));
const bad5 = JSON.parse(JSON.stringify(demo)); delete bad5.GRFD.extracts[0].text;
check('negative control: an extract without its text is rejected', /GRFD extract 0: missing "text"/.test(String(ctx.__v(bad5))), String(ctx.__v(bad5)));
const noGamma = JSON.parse(JSON.stringify(demo)); delete noGamma.GRFD.gamma;
const rNoGamma = ctx.__r(noGamma.GRFD, noGamma.GRFD.quarters[7]);
check('a company without γ is "not checkable" and says γ is what is missing', rNoGamma.checkable === false && rNoGamma.missing.join() === 'γ', JSON.stringify(rNoGamma));
// Sample JSON lives next to the schema in the Methodology card; the load-error message has to send people there, not to the top bar
check('Sample JSON is not in the top bar, is rendered in the Methodology card, and the load error points there', !/id="sample"/.test(html) && /h\('pre'[\s\S]*?id: 'sample'/.test(app.slice(app.indexOf("'Methodology'"))) && /shape = 'Sample JSON, under the schema in the Methodology section/.test(app) && !/Sample JSON in the top bar/.test(app));
// the default view is real model output (real-data.js, written by src/ir_run.py); the synthetic file is only the Sample JSON
vm.runInNewContext(fs.readFileSync(path.join(HERE, 'real-data.js'), 'utf8'), sandbox);
const real = sandbox.window.CALLDELTA_REAL, meta = sandbox.window.CALLDELTA_REAL_META;
check('real data passes the loader validation', ctx.__v(real) === null, String(ctx.__v(real)));
check('real data covers the calls its metadata lists, with model and run date', Object.keys(real).join() === [...new Set(meta.calls.map(c => c.ticker))].join() && Object.values(real).reduce((a, c) => a + c.quarters.length, 0) === meta.calls.length && Object.values(real).every(c => c.quarters.every(q => meta.calls.some(m => m.source_page === q.source_page && m.call_date === q.date))) && /^claude-/.test(meta.model) && /^\d{4}-\d{2}-\d{2}$/.test(meta.run_date), Object.keys(real).join());
check("every transcript source is the company's own investor-relations site", meta.calls.every(c => /^https:\/\/(www\.microsoft\.com\/en-us\/investor|abc\.xyz\/investor|investor\.atmeta\.com)\//.test(c.source_page)), meta.calls.map(c => c.source_page).join(' '));
const quotes = Object.values(real).flatMap(c => c.extracts);
check('real quotes: at most 4 per company, each at most 25 words', Object.values(real).every(c => c.extracts.length <= 4) && quotes.every(e => e.text.replace(/\u2026/g, '').trim().split(/\s+/).length <= 25), quotes.map(e => e.text.split(/\s+/).length).join());
check('the page opens on the real data and Sample JSON downloads the synthetic file, named as such', /const S = \{ data: REAL,/.test(app) && /JSON\.stringify\(DEMO, null, 2\)[\s\S]{0,120}dashboard_sample_synthetic\.json/.test(app) && !/fictional companies/.test(html.split('<footer')[0]));
check('a topic one section did not discuss is flagged, so the page shows a dash instead of a 0.00 tone', Object.values(real).every(c => c.topics.every(t => (t.mgmt_missing === true) + (t.qa_missing === true) < 2)) && /t\.qa_missing === true \? h\('span', \{ class: 'muted'/.test(app));
check('with fewer than 30 calls the correlation is labelled as too few points for a finding', /qs\.length < 30 \? ` — far too few points for r to show a relationship/.test(app));
check('the residual axis picks its step so it draws at most about six gridlines', /step = \[0\.01, 0\.02, 0\.05, 0\.1, 0\.2, 0\.25, 0\.5, 1, 2, 5\]\.find\(s => \(ymax - ymin\) \/ s <= 6\)/.test(app));
check('pearson([1,2,3],[2,4,6]) = 1 and < 3 points → null', Math.abs(ctx.__p([1, 2, 3], [2, 4, 6]) - 1) < 1e-12 && ctx.__p([1, 2], [1, 2]) === null);
console.log(`check-web · ${new Date().toISOString()} · node ${process.version}`);
for (const [st, name, d] of results) console.log(`${st}  ${name}${d ? '  · ' + d : ''}`);
console.log(failed ? `RESULT: ${failed} FAILED` : 'RESULT: ALL PASS');
process.exit(failed ? 1 : 0);
