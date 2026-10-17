/* Pure offline analysis shared by the dashboard and Node checks/report. Source data is never mutated. */
((root) => {
'use strict';
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const num = x => typeof x === 'number' && Number.isFinite(x);
function pearson(xs, ys) {
  if (xs.length < 3) return null;
  const mx = mean(xs), my = mean(ys);
  const xx = xs.reduce((s, x) => s + (x - mx) ** 2, 0), yy = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  return xx > 1e-20 && yy > 1e-20 ? Math.max(-1, Math.min(1, xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / Math.sqrt(xx * yy))) : null;
}
function interval(r, n) {
  if (r === null || n <= 3) return null;
  if (Math.abs(r) === 1) return [r, r];
  const z = Math.atanh(r), d = 1.959963984540054 / Math.sqrt(n - 3);
  return [Math.tanh(z - d), Math.tanh(z + d)];
}
// OLS with intercept: sector-adjusted move = alpha + gamma*EPS (+ theta*gap).
// Centered two-predictor normal equations; singular designs explicitly return null.
function fit(rows, gap = false) {
  const xs = rows.map(q => q.eps_surprise), ys = rows.map(q => q.ret_5d - (q.beta ?? 1) * q.sector_5d), gs = rows.map(q => q.mgmt - q.qa);
  const mx = mean(xs), my = mean(ys), mg = mean(gs);
  let xx = 0, xy = 0, gg = 0, gy = 0, xg = 0;
  rows.forEach((_, i) => { const x = xs[i] - mx, y = ys[i] - my, g = gs[i] - mg; xx += x*x; xy += x*y; gg += g*g; gy += g*y; xg += x*g; });
  if (xx <= 1e-20) return null;
  let gamma = xy / xx, theta = 0;
  if (gap) {
    const det = xx * gg - xg * xg;
    if (det <= 1e-12 * xx * gg || gg <= 1e-20) return null;
    gamma = (xy * gg - gy * xg) / det; theta = (gy * xx - xy * xg) / det;
  }
  return { alpha: my - gamma * mx - theta * mg, gamma, theta };
}
const predict = (f, q) => f.alpha + f.gamma * q.eps_surprise + f.theta * (q.mgmt - q.qa);
const rmse = xs => Math.sqrt(mean(xs.map(x => x*x)));
function analyze(source, sensitivity = true) {
  const data = JSON.parse(JSON.stringify(source));
  const rows = Object.values(data).flatMap(c => c.quarters.map(q => ({ ...q, beta: c.beta })));
  const unavailable = reason => ({ data, summary: null, reason });
  if (rows.length < 4) return unavailable('At least four complete calls are needed for leave-one-out analysis.');
  if (!rows.every(q => ['beta', 'ret_5d', 'sector_5d', 'eps_surprise', 'mgmt', 'qa'].every(k => num(q[k])))) return unavailable('Sector return, beta, EPS surprise and tone must be present for every call.');
  const folds = rows.map((q, i) => {
    const train = rows.filter((_, j) => i !== j), f = fit(train), full = fit(train, true);
    if (!f) return null;
    const y = q.ret_5d - q.beta * q.sector_5d;
    return { ...f, residual: y - predict(f, q), meanError: y - mean(train.map(t => t.ret_5d - t.beta * t.sector_5d)), gapError: full ? y - predict(full, q) : null };
  });
  if (folds.some(f => !f)) return unavailable('EPS variation is insufficient in a training fold; no fitted residual is available.');
  let i = 0;
  for (const c of Object.values(data)) {
    if (typeof c.note === 'string' && num(c.gamma)) c.note = `Historical source note (describes the former γ = ${c.gamma} residuals; EPS caveats still apply): ${c.note}`;
    // No company-wide gamma: every call has a different out-of-sample fit.
    delete c.gamma;
    for (const q of c.quarters) {
      const f = folds[i++]; q.gamma = f.gamma; q.alpha = f.alpha; q.residual_5d = f.residual;
    }
  }
  const r = pearson(rows.map(q => q.mgmt - q.qa), folds.map(f => f.residual));
  const summary = { n: rows.length, companies: Object.keys(data).length, r, ci: interval(r, rows.length),
    gamma_range: [Math.min(...folds.map(f => f.gamma)), Math.max(...folds.map(f => f.gamma))],
    rmse_mean: rmse(folds.map(f => f.meanError)), rmse_eps: rmse(folds.map(f => f.residual)),
    rmse_gap: folds.every(f => f.gapError !== null) ? rmse(folds.map(f => f.gapError)) : null, loo_range: null };
  if (sensitivity && rows.length > 4) {
    const rs = [];
    for (const [t, c] of Object.entries(source)) for (let j = 0; j < c.quarters.length; j++) {
      const copy = JSON.parse(JSON.stringify(source)); copy[t].quarters.splice(j, 1);
      const s = analyze(copy, false).summary; if (s && s.r !== null) rs.push(s.r);
    }
    if (rs.length === rows.length) summary.loo_range = [Math.min(...rs), Math.max(...rs)];
  }
  return { data, summary, reason: null };
}
function verdict(s) {
  if (!s || !s.ci) return 'Insufficient data to assess the association.';
  return s.ci[0] <= 0 && s.ci[1] >= 0 ? 'No reliable evidence that analyst pushback explains the post-call move.' : 'An exploratory association appears; this sample cannot establish a predictive signal.';
}
const impossible = q => Math.abs(q.residual_5d) > 1;
const api = { fit, interval, analyze, verdict, impossible };
if (typeof module !== 'undefined') module.exports = api;
else root.CALLDELTA_ANALYSIS = api;
})(typeof window === 'undefined' ? globalThis : window);
