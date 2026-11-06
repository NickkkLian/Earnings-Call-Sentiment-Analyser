// Executed against the served dashboard by the workspace browser check.
async function portfolioBrowserTest() {
  const assert = (ok, message) => { if (!ok) throw Error(message); };
  const $ = s => document.querySelector(s);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  assert(/−0\.56 to \+0\.59/.test($('#interval-value').textContent), 'visible confidence interval');
  assert(/independent/.test($('.correlation p').textContent), 'independence near interval');
  $('#inspect').click();
  assert($('#calls').open && document.querySelectorAll('.open-call').length === 12, 'analysis action on every call');
  const call = window.CALLDELTA_REAL.GOOGL.quarters[0];
  $('[data-ticker="GOOGL"][data-quarter="0"]').click();
  await wait(300);
  assert($('#details').open && !$('#calls').open, 'register opens company sheet');
  const selected = $('.selected-evidence');
  assert(selected.textContent.includes(call.label) && selected.textContent.includes('historical call'), 'selected historical quarter and latest-call distinction');
  assert(selected.querySelector('a').href === call.source_page, 'selected transcript');
  assert(selected.querySelector('svg') && selected.querySelector('[stroke-dasharray]'), 'selected score trace');
  assert(getComputedStyle(selected.querySelector('.gapfill')).fill !== 'rgb(0, 0, 0)' && getComputedStyle(selected.querySelector('.mgmt')).fill === 'none', 'trace uses visible chart styling');
  assert(!$('.pooled-summary').open && $('#main').firstElementChild.classList.contains('ticker-tabs'), 'pooled summary collapsed after company evidence');
  $('#tab-META').click();
  assert($('.selected-evidence').textContent.includes(window.CALLDELTA_REAL.META.quarters.at(-1).label), 'changing companies resets to latest');
  return 'CallDelta: interval, row navigation, source, trace, historical labels, collapsed summary and tab reset passed';
}
