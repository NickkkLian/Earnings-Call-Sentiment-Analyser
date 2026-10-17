// Reproduce every first-screen figure from the committed scored calls, without a browser or network.
const fs = require('node:fs'), vm = require('node:vm'), A = require('./analysis.js');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(__dirname + '/real-data.js', 'utf8'), ctx);
const out = A.analyze(ctx.window.CALLDELTA_REAL);
console.log(A.verdict(out.summary));
console.log(JSON.stringify(out.summary, null, 2));
console.log('Historical token-volume projection (not a live quote):');
// README's recorded twelve-call run: 256k input, 26k output tokens; src/ir_run.py prices.
const rate = fs.readFileSync(__dirname + '/../src/ir_run.py', 'utf8').match(/"claude-sonnet-5": \((\d+\.\d+), (\d+\.\d+)\)/);
const prior = fs.readFileSync(__dirname + '/../README.md', 'utf8').match(/about ([\d,]+) input and ([\d,]+) output tokens/);
const [tin, tout] = prior.slice(1).map(n => Number(n.replaceAll(',', '')));
const n = out.summary.n;
for (const calls of [50 - n, 50]) console.log(JSON.stringify({ calls, requests: calls * 2,
  input_tokens: Math.round(tin / n * calls), output_tokens: Math.round(tout / n * calls),
  usd: (tin / n * calls * Number(rate[1]) + tout / n * calls * Number(rate[2])) / 1e6 }));
