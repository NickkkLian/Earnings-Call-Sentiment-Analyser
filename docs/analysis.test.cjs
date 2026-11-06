// Offline analysis checks: synthetic fixtures have independently computed answers.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const file = __dirname + '/analysis.js';
const A = fs.existsSync(file) ? require(file) : {};
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const rows = [0, 1, 2, 3, 4, 5].map((x, i) => ({ eps_surprise: x, ret_5d: 2 + 3 * x + [1, -1, 0, 0, -1, 1][i], sector_5d: 0, mgmt: i % 2, qa: 0 }));
const data = rs => ({ X: { beta: 1, gamma: 1.5, quarters: rs, topics: [], extracts: [] } });
test('OLS estimates an intercept and EPS coefficient rather than a preset', () => {
  const f = A.fit(rows); close(f.alpha, 2); close(f.gamma, 3);
});
test('each residual uses only the other calls, including the intercept', () => {
  const out = A.analyze(data(rows));
  // Other five: x mean 3, y mean 10.8, Sxx 10, Sxy 33 -> gamma 3.3, alpha .9.
  const q = out.data.X.quarters[0]; close(q.gamma, 3.3); close(q.alpha, 0.9); close(q.residual_5d, 2.1);
  const changed = rows.map(r => ({ ...r })); changed[0].ret_5d += 100;
  const q2 = A.analyze(data(changed)).data.X.quarters[0]; close(q2.gamma, q.gamma); close(q2.alpha, q.alpha);
  assert.equal(rows[0].gamma, undefined, 'input must stay unchanged');
});
test('LOO holdout predictions beat the training-mean baseline on a linear fixture', () => {
  const rs = rows.map(r => ({ ...r, ret_5d: 2 + 3 * r.eps_surprise + 4 * r.mgmt }));
  const s = A.analyze(data(rs)).summary;
  close(s.rmse_gap, 0); assert.ok(s.rmse_mean > 0); assert.ok(s.rmse_eps > 0);
});
test('Fisher 95% interval has the reference endpoints and handles undefined correlations', () => {
  // tanh(±1.959963984540054 / sqrt(12-3)), independently checked with Python math.
  const ci = A.interval(0, 12); close(ci[0], -0.5739016170112798); close(ci[1], 0.5739016170112798);
  assert.equal(A.interval(null, 12), null); assert.equal(A.interval(0.5, 3), null);
});
test('sensitivity deletes each call and refits all remaining folds', () => {
  const out = A.analyze(data(rows));
  const rs = rows.map((_, i) => A.analyze(data(rows.filter((_, j) => i !== j)), false).summary.r).filter(r => r !== null);
  close(out.summary.loo_range[0], Math.min(...rs)); close(out.summary.loo_range[1], Math.max(...rs));
});
test('missing sector data and degenerate EPS do not silently reuse the old residual', () => {
  const missing = rows.map(r => ({ ...r })); delete missing[0].sector_5d;
  assert.equal(A.analyze(data(missing)).summary, null);
  assert.equal(A.analyze(data(rows.map(r => ({ ...r, eps_surprise: 1 })))).summary, null);
  assert.equal(A.analyze(data(rows.slice(0, 3))).summary, null);
});
test('impossible residual warning fires independently of control dominance', () => {
  assert.equal(A.impossible({ residual_5d: -3.23 }), true);
  assert.equal(A.impossible({ residual_5d: 1.14 }), true);
  assert.equal(A.impossible({ residual_5d: 0.02 }), false);
});
test('real data produces finite reconciled residuals and a measured verdict', () => {
  const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(__dirname + '/real-data.js', 'utf8'), ctx);
  const out = A.analyze(ctx.window.CALLDELTA_REAL);
  assert.equal(out.summary.n, ctx.window.CALLDELTA_REAL_META.calls.length);
  assert.ok(out.summary.ci[0] < out.summary.r && out.summary.r < out.summary.ci[1]);
  for (const c of Object.values(out.data)) for (const q of c.quarters) {
    close(q.residual_5d, q.ret_5d - c.beta * q.sector_5d - q.alpha - q.gamma * q.eps_surprise);
    assert.ok(Number.isFinite(q.residual_5d));
  }
  assert.match(A.verdict(out.summary), /evidence|association/);
});
test('pooled verdict is collapsed after company evidence and states uncertainty limitations', () => {
  const app = fs.readFileSync(__dirname + '/app.js', 'utf8');
  assert.ok(app.includes("h('details', { class: 'pooled-summary' }"));
  assert.ok(app.indexOf("h('details', { class: 'pooled-summary' }") > app.indexOf("main.append(h('div', { class: 'ticker-tabs'"));
  // Test what the summary renders, without requiring the jargon removed in review.
  const context = { A, h: (tag, attrs, ...children) => ({ tag, children: children.flat(Infinity) }) };
  vm.runInNewContext(app.slice(app.indexOf('function analysisCard('), app.indexOf('function companyNote(')) + '\nglobalThis.summaryCard = analysisCard;', context);
  const result = A.analyze(data(rows));
  const text = node => typeof node === 'object' && node !== null ? (node.children || []).map(text).join(' ') : String(node ?? '');
  const displayed = text(context.summaryCard(result));
  assert.match(displayed, /Held-out prediction error/);
  assert.match(displayed, /approximate 95% range/);
  assert.match(displayed, /independence assumption/);
  assert.match(displayed, /does not test predictions of future calls/);
  assert.match(displayed, /percentage points/);
  assert.ok(displayed.includes((result.summary.rmse_eps * 100).toFixed(2)));
  assert.doesNotMatch(displayed, /Fisher|RMSE|Folds|backtest|Delete-one-call/);
  assert.match(fs.readFileSync(__dirname + '/index.html', 'utf8'), /analysis\.js/);
});
test('historical EPS warnings remain clearly attributed to the historical fit', () => {
  const src = { ...data(rows), X: { ...data(rows).X, note: 'EPS includes a tax item. The EPS-surprise control swamps those two residuals: read them as not meaningful.' } };
  assert.match(A.analyze(src).data.X.note, /Historical source note/);
});
test('a constant gap withholds its correlation and prediction comparison', () => {
  const s = A.analyze(data(rows.map(r => ({ ...r, mgmt: 0, qa: 0 })))).summary;
  assert.equal(s.r, null); assert.equal(s.ci, null); assert.equal(s.rmse_gap, null);
});
