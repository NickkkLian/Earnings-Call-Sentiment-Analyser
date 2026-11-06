// Executed against the served dashboard by the workspace browser check.
async function portfolioBrowserTest() {
  const assert = (ok, message) => { if (!ok) throw Error(message); };
  const $ = s => document.querySelector(s);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  assert(/−0\.56 to \+0\.59/.test($('#interval-value').textContent), 'visible confidence interval');
  assert(/independent/.test($('.correlation p').textContent), 'independence near interval');
  $('#inspect').click();
  assert($('#calls').open && document.querySelectorAll('.open-call').length === 12, 'analysis action on every call');
  const action = $('[data-ticker="GOOGL"][data-quarter="0"]');
  assert(action.textContent.trim() === 'Open →' && getComputedStyle(action).backgroundColor === 'rgba(0, 0, 0, 0)', 'quiet register action');
  if (innerWidth <= 700) assert(Math.abs(action.getBoundingClientRect().left - action.closest('td').querySelector('.cell-label').getBoundingClientRect().left) < 2, 'phone action aligned with label');
  const call = window.CALLDELTA_REAL.GOOGL.quarters[0];
  action.click();
  await wait(300);
  assert($('#details').open && !$('#calls').open, 'register opens company sheet');
  const selected = $('.selected-evidence');
  assert(selected.textContent.includes(call.label) && selected.textContent.includes('historical call'), 'selected historical quarter and latest-call distinction');
  assert(selected.querySelector('a').href === call.source_page, 'selected transcript');
  const band=selected.querySelector('.selected-quarter'), dot=selected.querySelector('.dot-mgmt');
  assert(band && Number(band.getAttribute('x')) < Number(dot.getAttribute('cx')) && Number(band.getAttribute('x')) + Number(band.getAttribute('width')) > Number(dot.getAttribute('cx')), 'first-quarter selection band remains visible at the axis');
  assert(selected.querySelector('.selected-label')?.textContent === call.label, 'selected quarter label highlighted');
  assert(selected.querySelector('svg').getBoundingClientRect().height <= 321, 'trace height stays capped');
  assert($('#ticker-panel').querySelectorAll('h1').length === 1 && selected.querySelector('h1').textContent.includes(call.label), 'one company title block');
  assert(!/scored by/i.test(selected.textContent) && /scored by/i.test($('#pill').textContent), 'scoring metadata appears once at top');
  assert(!$('#load').classList.contains('primary') && $('#pill').compareDocumentPosition($('#load')) & Node.DOCUMENT_POSITION_FOLLOWING, 'load action is secondary to context');
  assert(getComputedStyle(selected.querySelector('.gapfill')).fill !== 'rgb(0, 0, 0)' && getComputedStyle(selected.querySelector('.mgmt')).fill === 'none', 'trace uses visible chart styling');
  assert(!$('.pooled-summary').open && $('#main').firstElementChild.classList.contains('ticker-tabs'), 'pooled summary collapsed after company evidence');
  $('#tab-META').click();
  assert($('.selected-evidence').textContent.includes(window.CALLDELTA_REAL.META.quarters.at(-1).label), 'changing companies resets to latest');
  return 'CallDelta: interval, quiet row action, selected band, capped trace, single title, metadata, source and tab reset passed';
}
