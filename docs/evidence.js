/* Approved evidence view, recalculated through the repository analysis engine. */
(() => {
let sample;
const $ = selector => document.querySelector(selector);
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item===button)));
  for (const name of ['chart','table','sources']) $(`#${name}-view`).hidden = name!==button.dataset.view;
  ui.fade($(`#${button.dataset.view}-view`));
}));
const signed = (value,places) => `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(places)}`;
function renderCalls() {
  const company=$('#company').value;
  $('#call-rows').closest('table').querySelectorAll('th').forEach(head => head.removeAttribute('aria-sort'));
  $('#call-rows').innerHTML=Object.entries(sample.analysis.data).filter(([ticker]) => company==='all'||ticker===company).flatMap(([ticker,data]) => data.quarters.map(call => {
    const y = value => (24-(value+1)*10).toFixed(1);
    const trace = `<svg class="tone-trace" viewBox="0 0 72 28" role="img" aria-label="Management ${call.mgmt}, analysts ${call.qa}"><path d="M8 ${y(call.mgmt)}L64 ${y(call.qa)}"/><circle cx="8" cy="${y(call.mgmt)}" r="3"/><circle cx="64" cy="${y(call.qa)}" r="3"/></svg>`;
    return `<tr tabindex="0" data-detail="${escapeText(ticker)} ${escapeText(call.label)}. Management minus analyst tone ${signed(call.mgmt-call.qa,2)}. Open Source for the company transcript."><td>${escapeText(ticker)}</td><td>${escapeText(call.label)}</td><td>${trace}</td><td class="num">${signed(call.mgmt,2)}</td><td class="num">${signed(call.qa,2)}</td><td class="num">${signed(call.ret_5d*100,1)}%</td><td>${safeSource(call.source_page)}</td></tr>`;
  })).join('');
  ui.enhanceTables($('#calls'));
  ui.fade($('#call-rows'));
}
$('#company').addEventListener('change',renderCalls);
for (const id of ['inspect','sources-register']) $(`#${id}`).addEventListener('click',()=>$('#calls').showModal());
$('#learn').addEventListener('click',()=>$('#method').showModal());

function escapeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
function safeSource(value) {
  try { const url = new URL(value); if (url.protocol === 'https:' || url.protocol === 'http:') return `<a href="${escapeText(url.href)}" rel="noopener">Source</a>`; } catch {}
  return 'Not supplied';
}
$('#open-details').addEventListener('click', () => $('#details').showModal());
window.addEventListener('call-render', event => {
  sample = { analysis: event.detail.result };
  const summary = sample.analysis.summary;
  const count = Object.values(sample.analysis.data).reduce((sum, company) => sum + company.quarters.length, 0);
  $('.sample-chip').textContent = `${count}-call ${event.detail.custom ? 'file' : 'sample'}`;
  $('#inspect').firstChild.textContent = `Inspect the ${count} calls `;
  $('.header-context').textContent = event.detail.custom ? 'Your file, analysed locally' : 'Microsoft, Alphabet and Meta';
  const company = $('#company');
  const previous = company.value;
  company.replaceChildren(new Option('All companies', 'all'), ...Object.entries(sample.analysis.data).map(([ticker, data]) => new Option(data.company, ticker)));
  company.value = [...company.options].some(option => option.value === previous) ? previous : 'all';
  company.dispatchEvent(new Event('ui-sync'));
  renderCalls();
  $('#correlation-value').textContent = summary?.r === null || !summary ? 'n/a' : summary.r.toFixed(2);
  const interval = summary?.ci;
  $('.interval-range').hidden = !interval;
  $('.interval-point').hidden = summary?.r === null || !summary;
  if (interval) {
    $('.interval-range').style.left = `${(interval[0]+1)*50}%`;
    $('.interval-range').style.width = `${(interval[1]-interval[0])*50}%`;
    $('.interval-tooltip').textContent = `95% interval ${interval.map(value => signed(value,2)).join(' to ')}`;
  }
  if (summary?.r !== null && summary) $('.interval-point').style.left = `${(summary.r+1)*50}%`;
  $('.interval-chart').setAttribute('aria-label', summary ? `Correlation ${summary.r ?? 'unavailable'}, approximate interval ${interval?.join(' to ') ?? 'unavailable'}, full scale minus 1 to plus 1` : sample.analysis.reason);
  const original = !event.detail.custom;
  $('.finding h1').textContent = original ? 'Analyst pushback adds no clear explanation' : summary ? window.CALLDELTA_ANALYSIS.verdict(summary).replace(/\.$/,'') : 'Fitted analysis unavailable';
  $('.lede').textContent = original ? 'The tone gap explains almost none of the post-call move left after accounting for earnings.' : summary ? 'The pooled result is recalculated from your file with each call held out in turn.' : sample.analysis.reason;
  $('.exhibit h2').textContent = original ? 'Adding tone made prediction less accurate' : !summary || summary.rmse_gap === null ? 'Prediction comparison unavailable' : summary.rmse_gap >= summary.rmse_eps ? 'Adding tone made prediction less accurate' : 'Adding tone reduced the prediction error';
  $('.correlation p').textContent = original ? 'Only four calls per company. The interval assumes independent calls.' : 'The interval assumes independent calls. Loaded data is validated for shape.';
  $('.qualification p').textContent = `Repeated companies and overlapping training sets weaken independence. ${summary?.loo_range ? 'Removing one call moves r from ' + summary.loo_range.map(value => signed(value,2)).join(' to ') + '.' : 'Delete-one sensitivity is unavailable for this file.'}`;
  $('#sources-view p').textContent = original ? '12 real calls, scored 25 September 2026. Open the register for the transcript behind every observation.' : `${count} calls from your file, analysed locally. Sources are shown when supplied.`;
  $('#chart-readout').textContent = `Each call was predicted using the other ${count-1} calls.`;
  const errors = summary ? [['Training mean', summary.rmse_mean], ['Earnings only', summary.rmse_eps], ['Earnings + tone', summary.rmse_gap]] : [];
  const maximum = Math.max(.15, ...errors.map(([, value]) => value ?? 0));
  const scale = [...document.querySelectorAll('.chart-scale span')];
  scale.forEach((node, index) => node.textContent = `${(maximum*100*index/3).toFixed(maximum === .15 ? 0 : 1)}${index === 3 ? ' pp' : ''}`);
  $('#errors').innerHTML = errors.map(([name,value]) => `<div class="error-row" tabindex="0" data-name="${name}" data-error="${value === null ? 'Unavailable' : (value*100).toFixed(2)}"><span>${name}</span><div class="error-track"><div class="error-bar" style="width:${value === null ? 0 : value/maximum*100}%"></div></div><strong>${value === null ? 'n/a' : (value*100).toFixed(2)}</strong></div>`).join('');
  $('#error-rows').innerHTML = errors.map(([name,value]) => `<tr tabindex="0"><td>${name}</td><td class="num">${value === null ? 'Unavailable: singular fit' : (value*100).toFixed(2)}</td></tr>`).join('');
  if (!summary) $('#errors').textContent = sample.analysis.reason;
  document.querySelectorAll('.error-row').forEach(row => {
    const readout = () => $('#chart-readout').textContent = `${row.dataset.name} · ${row.dataset.error} percentage points of prediction error`;
    row.addEventListener('pointerenter', readout);
    row.addEventListener('focus', readout);
  });
  document.querySelector('footer span:last-child').textContent = `${count} observations, with uncertainty kept in view`;
  document.querySelector('#method p').textContent = `There are ${count} observations. The approximate interval assumes independent calls. Repeated companies and overlapping training samples weaken that assumption.`;
  document.querySelectorAll('.error-bar').forEach(bar => ui.animate(bar, [{transform:'scaleX(.1)',opacity:.3},{transform:'scaleX(1)',opacity:1}], 220));
  ui.animate(document.querySelector('.key-number'), [{opacity:.3,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],180);
  document.documentElement.dataset.ready = 'true';
  ui.enhanceTables(document.querySelector('#evidence'));
  ui.enhanceTables(document.querySelector('#calls'));
});

})();
