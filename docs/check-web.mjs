// check-web.mjs — the static dashboard's own checks: no external scripts, demo data passes the loader's validation,
// a mutated file is rejected (negative control), and the Pearson helper matches a hand-computed value.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const HERE = path.dirname(new URL(import.meta.url).pathname);
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
check('pearson([1,2,3],[2,4,6]) = 1 and < 3 points → null', Math.abs(ctx.__p([1, 2, 3], [2, 4, 6]) - 1) < 1e-12 && ctx.__p([1, 2], [1, 2]) === null);
console.log(`check-web · ${new Date().toISOString()} · node ${process.version}`);
for (const [st, name, d] of results) console.log(`${st}  ${name}${d ? '  · ' + d : ''}`);
console.log(failed ? `RESULT: ${failed} FAILED` : 'RESULT: ALL PASS');
process.exit(failed ? 1 : 0);
