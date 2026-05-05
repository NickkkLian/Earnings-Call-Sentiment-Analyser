import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Cell, ResponsiveContainer,
  ComposedChart, ZAxis,
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, MessageSquareQuote, Shield, Crosshair, Upload, Download, RotateCcw, Check, X } from 'lucide-react';

// =========================================================================
// SAMPLE DATA — 4 tickers × 8 quarters, Q2 2024 → Q1 2026
// This is the demo default. Replace at runtime by loading a JSON file
// produced by `src/export_dashboard.py` from real pipeline output.
// =========================================================================

const SAMPLE_DATA = {
  NVDA: {
    company: 'NVIDIA Corporation',
    sector: 'Semiconductors',
    quarters: [
      { label: 'Q2 24', date: 'Aug 28, 2024', mgmt: 0.74, qa: 0.52, hedging: 0.16, guidance: 0.84, eps_surprise: 0.061, ret_5d: 0.071, residual_5d: 0.038 },
      { label: 'Q3 24', date: 'Nov 20, 2024', mgmt: 0.78, qa: 0.58, hedging: 0.14, guidance: 0.86, eps_surprise: 0.082, ret_5d: 0.041, residual_5d: -0.012 },
      { label: 'Q4 24', date: 'Feb 26, 2025', mgmt: 0.71, qa: 0.49, hedging: 0.21, guidance: 0.79, eps_surprise: 0.045, ret_5d: -0.028, residual_5d: -0.051 },
      { label: 'Q1 25', date: 'May 28, 2025', mgmt: 0.69, qa: 0.45, hedging: 0.24, guidance: 0.76, eps_surprise: 0.038, ret_5d: 0.012, residual_5d: -0.018 },
      { label: 'Q2 25', date: 'Aug 27, 2025', mgmt: 0.72, qa: 0.48, hedging: 0.22, guidance: 0.78, eps_surprise: 0.052, ret_5d: 0.034, residual_5d: 0.005 },
      { label: 'Q3 25', date: 'Nov 19, 2025', mgmt: 0.68, qa: 0.41, hedging: 0.27, guidance: 0.72, eps_surprise: 0.029, ret_5d: -0.041, residual_5d: -0.058 },
      { label: 'Q4 25', date: 'Feb 25, 2026', mgmt: 0.66, qa: 0.38, hedging: 0.31, guidance: 0.68, eps_surprise: 0.018, ret_5d: -0.067, residual_5d: -0.072 },
      { label: 'Q1 26', date: 'May 27, 2026', mgmt: 0.62, qa: 0.35, hedging: 0.34, guidance: 0.65, eps_surprise: 0.024, ret_5d: -0.052, residual_5d: -0.061 },
    ],
    topics: [
      { name: 'Data Center', weight: 0.42, mgmt: 0.78, qa: 0.55 },
      { name: 'China', weight: 0.18, mgmt: -0.20, qa: -0.45 },
      { name: 'Blackwell ramp', weight: 0.16, mgmt: 0.82, qa: 0.60 },
      { name: 'Margins', weight: 0.12, mgmt: 0.55, qa: 0.30 },
      { name: 'Sovereign AI', weight: 0.12, mgmt: 0.70, qa: 0.40 },
    ],
    extracts: [
      { tag: 'confident', speaker: 'Colette Kress, CFO', text: 'Blackwell demand exceeds our most aggressive supply forecasts.' },
      { tag: 'hedging', speaker: 'Jensen Huang, CEO', text: "We're cautiously monitoring the regulatory environment in certain regions." },
      { tag: 'evasion', speaker: 'Management response', text: 'On forward China revenue: "We don\'t break out forward expectations by geography."' },
    ],
  },
  META: {
    company: 'Meta Platforms, Inc.',
    sector: 'Internet & Direct Marketing',
    quarters: [
      { label: 'Q2 24', date: 'Jul 31, 2024', mgmt: 0.42, qa: 0.31, hedging: 0.28, guidance: 0.61, eps_surprise: 0.071, ret_5d: 0.049, residual_5d: 0.018 },
      { label: 'Q3 24', date: 'Oct 30, 2024', mgmt: 0.51, qa: 0.39, hedging: 0.24, guidance: 0.66, eps_surprise: 0.044, ret_5d: 0.022, residual_5d: 0.001 },
      { label: 'Q4 24', date: 'Jan 29, 2025', mgmt: 0.58, qa: 0.45, hedging: 0.21, guidance: 0.71, eps_surprise: 0.082, ret_5d: 0.061, residual_5d: 0.020 },
      { label: 'Q1 25', date: 'Apr 30, 2025', mgmt: 0.62, qa: 0.48, hedging: 0.19, guidance: 0.74, eps_surprise: 0.058, ret_5d: 0.038, residual_5d: 0.012 },
      { label: 'Q2 25', date: 'Jul 30, 2025', mgmt: 0.65, qa: 0.51, hedging: 0.22, guidance: 0.72, eps_surprise: 0.041, ret_5d: 0.029, residual_5d: 0.011 },
      { label: 'Q3 25', date: 'Oct 29, 2025', mgmt: 0.61, qa: 0.42, hedging: 0.29, guidance: 0.68, eps_surprise: 0.025, ret_5d: -0.038, residual_5d: -0.052 },
      { label: 'Q4 25', date: 'Jan 28, 2026', mgmt: 0.66, qa: 0.45, hedging: 0.27, guidance: 0.71, eps_surprise: 0.067, ret_5d: 0.044, residual_5d: 0.010 },
      { label: 'Q1 26', date: 'Apr 29, 2026', mgmt: 0.69, qa: 0.48, hedging: 0.25, guidance: 0.74, eps_surprise: 0.054, ret_5d: 0.057, residual_5d: 0.028 },
    ],
    topics: [
      { name: 'AI Infrastructure', weight: 0.32, mgmt: 0.72, qa: 0.40 },
      { name: 'Ad Revenue', weight: 0.28, mgmt: 0.78, qa: 0.65 },
      { name: 'Reality Labs', weight: 0.18, mgmt: 0.30, qa: -0.10 },
      { name: 'Capex', weight: 0.12, mgmt: 0.45, qa: 0.20 },
      { name: 'Regulatory', weight: 0.10, mgmt: 0.20, qa: 0.10 },
    ],
    extracts: [
      { tag: 'confident', speaker: 'Susan Li, CFO', text: 'Ad performance continues to compound on improved targeting and ranking models.' },
      { tag: 'hedging', speaker: 'Mark Zuckerberg, CEO', text: 'AI infrastructure investments will continue at elevated levels for the foreseeable future.' },
      { tag: 'evasion', speaker: 'Management response', text: 'On Reality Labs path to profitability: "We see this as a multi-decade investment."' },
    ],
  },
  TSLA: {
    company: 'Tesla, Inc.',
    sector: 'Automobiles',
    quarters: [
      { label: 'Q2 24', date: 'Jul 23, 2024', mgmt: 0.61, qa: 0.18, hedging: 0.32, guidance: 0.55, eps_surprise: -0.041, ret_5d: -0.082, residual_5d: -0.045 },
      { label: 'Q3 24', date: 'Oct 23, 2024', mgmt: 0.65, qa: 0.21, hedging: 0.34, guidance: 0.58, eps_surprise: 0.058, ret_5d: 0.071, residual_5d: 0.022 },
      { label: 'Q4 24', date: 'Jan 29, 2025', mgmt: 0.71, qa: 0.25, hedging: 0.38, guidance: 0.62, eps_surprise: -0.022, ret_5d: -0.051, residual_5d: -0.038 },
      { label: 'Q1 25', date: 'Apr 22, 2025', mgmt: 0.58, qa: 0.10, hedging: 0.41, guidance: 0.51, eps_surprise: -0.085, ret_5d: -0.118, residual_5d: -0.061 },
      { label: 'Q2 25', date: 'Jul 23, 2025', mgmt: 0.62, qa: 0.15, hedging: 0.39, guidance: 0.54, eps_surprise: -0.038, ret_5d: -0.058, residual_5d: -0.029 },
      { label: 'Q3 25', date: 'Oct 22, 2025', mgmt: 0.55, qa: 0.05, hedging: 0.45, guidance: 0.48, eps_surprise: -0.061, ret_5d: -0.092, residual_5d: -0.048 },
      { label: 'Q4 25', date: 'Jan 28, 2026', mgmt: 0.68, qa: 0.18, hedging: 0.42, guidance: 0.58, eps_surprise: 0.012, ret_5d: 0.038, residual_5d: 0.025 },
      { label: 'Q1 26', date: 'Apr 22, 2026', mgmt: 0.72, qa: 0.20, hedging: 0.44, guidance: 0.61, eps_surprise: -0.018, ret_5d: -0.041, residual_5d: -0.025 },
    ],
    topics: [
      { name: 'Robotaxi', weight: 0.30, mgmt: 0.85, qa: 0.10 },
      { name: 'Deliveries', weight: 0.22, mgmt: 0.45, qa: 0.05 },
      { name: 'FSD', weight: 0.18, mgmt: 0.80, qa: 0.25 },
      { name: 'Margins', weight: 0.16, mgmt: 0.40, qa: 0.10 },
      { name: 'Energy', weight: 0.14, mgmt: 0.65, qa: 0.55 },
    ],
    extracts: [
      { tag: 'confident', speaker: 'Elon Musk, CEO', text: 'Unsupervised FSD will be available in most markets this year.' },
      { tag: 'hedging', speaker: 'Vaibhav Taneja, CFO', text: 'Timing of robotaxi commercial launch depends on regulatory approvals across jurisdictions.' },
      { tag: 'evasion', speaker: 'Management response', text: 'On Q2 delivery guidance: "We don\'t typically provide specific quarterly numbers."' },
    ],
  },
  INTC: {
    company: 'Intel Corporation',
    sector: 'Semiconductors',
    quarters: [
      { label: 'Q2 24', date: 'Aug 1, 2024', mgmt: 0.21, qa: 0.15, hedging: 0.42, guidance: 0.38, eps_surprise: -0.121, ret_5d: -0.265, residual_5d: -0.122 },
      { label: 'Q3 24', date: 'Oct 31, 2024', mgmt: 0.15, qa: 0.05, hedging: 0.45, guidance: 0.34, eps_surprise: -0.082, ret_5d: -0.091, residual_5d: -0.018 },
      { label: 'Q4 24', date: 'Jan 30, 2025', mgmt: 0.08, qa: -0.05, hedging: 0.48, guidance: 0.30, eps_surprise: -0.045, ret_5d: -0.071, residual_5d: -0.041 },
      { label: 'Q1 25', date: 'Apr 24, 2025', mgmt: -0.05, qa: -0.18, hedging: 0.52, guidance: 0.25, eps_surprise: -0.158, ret_5d: -0.182, residual_5d: -0.058 },
      { label: 'Q2 25', date: 'Jul 31, 2025', mgmt: -0.12, qa: -0.25, hedging: 0.55, guidance: 0.22, eps_surprise: -0.092, ret_5d: -0.108, residual_5d: -0.025 },
      { label: 'Q3 25', date: 'Oct 30, 2025', mgmt: -0.18, qa: -0.31, hedging: 0.58, guidance: 0.18, eps_surprise: -0.071, ret_5d: -0.092, residual_5d: -0.028 },
      { label: 'Q4 25', date: 'Jan 29, 2026', mgmt: -0.10, qa: -0.22, hedging: 0.51, guidance: 0.28, eps_surprise: 0.012, ret_5d: 0.034, residual_5d: 0.022 },
      { label: 'Q1 26', date: 'Apr 23, 2026', mgmt: -0.05, qa: -0.18, hedging: 0.48, guidance: 0.32, eps_surprise: -0.025, ret_5d: -0.018, residual_5d: 0.001 },
    ],
    topics: [
      { name: 'Foundry', weight: 0.32, mgmt: 0.10, qa: -0.40 },
      { name: 'Client (PC)', weight: 0.20, mgmt: 0.05, qa: -0.10 },
      { name: 'Data Center', weight: 0.18, mgmt: -0.15, qa: -0.30 },
      { name: 'Cost reduction', weight: 0.16, mgmt: 0.20, qa: 0.05 },
      { name: 'Strategy', weight: 0.14, mgmt: 0.15, qa: -0.20 },
    ],
    extracts: [
      { tag: 'hedging', speaker: 'Lip-Bu Tan, CEO', text: 'We continue to make progress on our turnaround across all segments.' },
      { tag: 'evasion', speaker: 'Management response', text: 'On foundry customer wins: "We have ongoing discussions with several customers we cannot disclose."' },
      { tag: 'admission', speaker: 'David Zinsner, CFO', text: 'We acknowledge our execution has not met our own expectations.' },
    ],
  },
};

// =========================================================================
// DESIGN TOKENS
// =========================================================================
const C = {
  bg: '#0c0a08',
  panel: '#131110',
  panel2: '#1a1715',
  border: '#2a2724',
  borderLight: '#3a3632',
  bone: '#e8dfc9',
  text: '#d4cab4',
  muted: '#7a736a',
  mutedLight: '#9c958a',
  amber: '#d4a24c',
  amberDim: '#8a6a30',
  positive: '#7fb069',
  negative: '#c66464',
  mgmt: '#d4a24c',
  analyst: '#6b9bb8',
  gap: 'rgba(212, 162, 76, 0.10)',
};

// =========================================================================
// HELPERS
// =========================================================================
const fmtPct = (v, digits = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(digits)}%`;
const fmtTone = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
const toneColor = (v) => (v > 0.05 ? C.positive : v < -0.05 ? C.negative : C.muted);

const Tag = ({ children, color }) => (
  <span
    className="inline-block px-2 py-0.5 text-xs uppercase tracking-widest"
    style={{ color, border: `1px solid ${color}`, opacity: 0.85 }}
  >
    {children}
  </span>
);

const Panel = ({ children, label, sublabel, className = '' }) => (
  <div
    className={`relative ${className}`}
    style={{ background: C.panel, border: `1px solid ${C.border}` }}
  >
    {label && (
      <div
        className="px-4 py-2 flex items-baseline justify-between"
        style={{ borderBottom: `1px solid ${C.border}` }}
      >
        <div className="text-xs uppercase" style={{ color: C.amber, letterSpacing: '0.2em' }}>{label}</div>
        {sublabel && <div className="text-xs" style={{ color: C.muted }}>{sublabel}</div>}
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

// =========================================================================
// VALIDATION — what shape we'll accept from a loaded JSON file
// =========================================================================

const REQUIRED_QUARTER_FIELDS = ['label', 'mgmt', 'qa', 'hedging', 'guidance', 'eps_surprise', 'ret_5d', 'residual_5d'];
const REQUIRED_TICKER_FIELDS = ['company', 'sector', 'quarters', 'topics', 'extracts'];

function validateData(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return 'Root must be an object keyed by ticker symbol';
  }
  const tickers = Object.keys(obj);
  if (tickers.length === 0) return 'No tickers found';
  for (const t of tickers) {
    const c = obj[t];
    if (!c || typeof c !== 'object' || Array.isArray(c)) {
      return `${t}: must be an object`;
    }
    for (const f of REQUIRED_TICKER_FIELDS) {
      if (!(f in c)) return `${t}: missing field "${f}"`;
    }
    if (!Array.isArray(c.quarters) || c.quarters.length === 0) {
      return `${t}: "quarters" must be a non-empty array`;
    }
    for (const [i, q] of c.quarters.entries()) {
      for (const f of REQUIRED_QUARTER_FIELDS) {
        if (!(f in q)) return `${t} quarter ${i}: missing "${f}"`;
      }
    }
    if (!Array.isArray(c.topics)) return `${t}: "topics" must be an array`;
    if (!Array.isArray(c.extracts)) return `${t}: "extracts" must be an array`;
  }
  return null; // ok
}

// =========================================================================
// MAIN
// =========================================================================
export default function Dashboard() {
  const [data, setData] = useState(SAMPLE_DATA);
  const [isCustom, setIsCustom] = useState(false);
  const [status, setStatus] = useState(null); // {type: 'ok'|'err', msg: string}
  const fileInputRef = useRef(null);

  // Auto-clear status messages after 4s
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const tickers = Object.keys(data);
  const [ticker, setTicker] = useState(tickers[0]);
  // If the loaded data doesn't include the previously-selected ticker, snap to first
  useEffect(() => {
    if (!data[ticker]) setTicker(Object.keys(data)[0]);
  }, [data, ticker]);

  const company = data[ticker] || data[Object.keys(data)[0]];
  const quarters = company.quarters;
  const current = quarters[quarters.length - 1];
  const prior = quarters[quarters.length - 2] || current;

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const err = validateData(parsed);
        if (err) {
          setStatus({ type: 'err', msg: `Invalid JSON: ${err}` });
          return;
        }
        setData(parsed);
        setIsCustom(true);
        const firstTicker = Object.keys(parsed)[0];
        setTicker(firstTicker);
        setStatus({ type: 'ok', msg: `Loaded ${Object.keys(parsed).length} tickers, ${Object.values(parsed).reduce((a, c) => a + c.quarters.length, 0)} calls` });
      } catch (e) {
        setStatus({ type: 'err', msg: `Parse error: ${e.message}` });
      }
    };
    reader.onerror = () => setStatus({ type: 'err', msg: 'Could not read file' });
    reader.readAsText(file);
  };

  const handleReset = () => {
    setData(SAMPLE_DATA);
    setIsCustom(false);
    setTicker(Object.keys(SAMPLE_DATA)[0]);
    setStatus({ type: 'ok', msg: 'Reset to demo data' });
  };

  const handleDownloadSample = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_DATA, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard_sample.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const trajectoryData = quarters.map((q) => ({
    label: q.label,
    Management: q.mgmt,
    'Analyst Q&A': q.qa,
    gap: q.mgmt - q.qa,
    hedging: q.hedging,
  }));

  const scatterData = quarters.map((q) => ({
    x: q.mgmt - q.qa,
    y: q.residual_5d,
    label: q.label,
    surprise: q.eps_surprise,
  }));

  const gap = current.mgmt - current.qa;
  const gapPrior = prior.mgmt - prior.qa;

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
        backgroundImage:
          'radial-gradient(ellipse at top right, rgba(212,162,76,0.04), transparent 50%), radial-gradient(ellipse at bottom left, rgba(107,155,184,0.03), transparent 50%)',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&display=swap');
        body { margin: 0; }
        .display-font { font-family: 'Fraunces', Georgia, serif; font-feature-settings: 'ss01', 'ss02'; }
        .recharts-cartesian-axis-tick-value { font-family: 'IBM Plex Mono', monospace; font-size: 10px; fill: ${C.muted}; }
        .tabular { font-variant-numeric: tabular-nums; }
        .ticker-pill { transition: all 0.15s ease; }
        .ticker-pill:hover { background: ${C.panel2}; color: ${C.bone}; }
        .extract-row { transition: all 0.2s ease; }
        .extract-row:hover { background: ${C.panel2}; }
      `}</style>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ============== HEADER ============== */}
        <header className="flex items-end justify-between pb-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div>
            <div className="text-xs uppercase" style={{ color: C.amber, letterSpacing: '0.3em' }}>
              ◆ Equity Research
            </div>
            <h1
              className="display-font text-4xl mt-1"
              style={{ color: C.bone, fontWeight: 400, letterSpacing: '-0.01em' }}
            >
              Earnings Call Sentiment
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Hidden file input driven by the Load button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = ''; // allow re-loading same file
              }}
            />

            {/* Status toast — appears next to buttons, clears after 4s */}
            {status && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 text-xs"
                style={{
                  background: C.panel,
                  border: `1px solid ${status.type === 'ok' ? C.positive : C.negative}`,
                  color: status.type === 'ok' ? C.positive : C.negative,
                  maxWidth: 320,
                }}
              >
                {status.type === 'ok' ? <Check size={12} /> : <X size={12} />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {status.msg}
                </span>
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="ticker-pill flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-widest"
              style={{
                background: C.panel,
                border: `1px solid ${C.border}`,
                color: C.amber,
              }}
              title="Load a JSON file produced by src/export_dashboard.py"
            >
              <Upload size={12} /> Load JSON
            </button>

            <button
              onClick={handleDownloadSample}
              className="ticker-pill flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-widest"
              style={{
                background: 'transparent',
                border: `1px solid ${C.border}`,
                color: C.muted,
              }}
              title="Download the demo data as JSON to see the expected schema"
            >
              <Download size={12} /> Sample
            </button>

            {isCustom && (
              <button
                onClick={handleReset}
                className="ticker-pill flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-widest"
                style={{
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  color: C.muted,
                }}
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}

            <div className="text-right ml-3">
              <div className="text-xs uppercase tracking-widest" style={{ color: C.muted }}>
                {isCustom ? 'Custom data' : 'Demo data'}
              </div>
              <div className="tabular text-sm mt-1" style={{ color: C.text }}>2026-05-04 09:42 PT</div>
            </div>
          </div>
        </header>

        {/* ============== TICKER TABS ============== */}
        <nav className="flex gap-0 mt-6" style={{ borderBottom: `1px solid ${C.border}` }}>
          {Object.keys(data).map((t) => {
            const active = t === ticker;
            return (
              <button
                key={t}
                onClick={() => setTicker(t)}
                className="ticker-pill px-5 py-3 text-sm tracking-wider"
                style={{
                  background: active ? C.panel : 'transparent',
                  color: active ? C.amber : C.muted,
                  borderTop: `1px solid ${active ? C.border : 'transparent'}`,
                  borderLeft: `1px solid ${active ? C.border : 'transparent'}`,
                  borderRight: `1px solid ${active ? C.border : 'transparent'}`,
                  borderBottom: active ? `1px solid ${C.panel}` : 'none',
                  marginBottom: '-1px',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {t}
              </button>
            );
          })}
          <div className="flex-1" />
          <div className="px-5 py-3 text-xs" style={{ color: C.muted }}>
            {quarters.length} quarters · {tickers.length} tickers · {Object.values(data).reduce((acc, c) => acc + c.quarters.length, 0)} calls analyzed
          </div>
        </nav>

        {/* ============== COMPANY HEADER ============== */}
        <section className="mt-6 flex items-end justify-between">
          <div>
            <div className="display-font text-2xl" style={{ color: C.bone }}>{company.company}</div>
            <div className="text-xs uppercase tracking-widest mt-1" style={{ color: C.muted }}>
              {ticker} · {company.sector} · Latest call: {current.date}
            </div>
          </div>
          <div className="flex gap-6">
            {[
              { label: 'EPS Surprise', value: fmtPct(current.eps_surprise) },
              { label: '5d Return', value: fmtPct(current.ret_5d) },
              { label: '5d Residual*', value: fmtPct(current.residual_5d) },
            ].map((kpi) => (
              <div key={kpi.label} className="text-right">
                <div className="text-xs uppercase tracking-widest" style={{ color: C.muted }}>{kpi.label}</div>
                <div
                  className="tabular text-2xl mt-1 display-font"
                  style={{ color: kpi.value.startsWith('-') ? C.negative : C.positive, fontWeight: 400 }}
                >
                  {kpi.value}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============== KPI STRIP ============== */}
        <section
          className="grid grid-cols-5 mt-4"
          style={{ background: C.panel, border: `1px solid ${C.border}` }}
        >
          {[
            { label: 'Management Tone', value: fmtTone(current.mgmt), color: toneColor(current.mgmt), delta: current.mgmt - prior.mgmt },
            { label: 'Analyst Q&A Tone', value: fmtTone(current.qa), color: toneColor(current.qa), delta: current.qa - prior.qa },
            { label: 'Sentiment Gap', value: fmtTone(gap), color: gap > 0.2 ? C.amber : C.text, delta: gap - gapPrior, hint: gap > 0.2 ? 'WIDE' : 'NORMAL' },
            { label: 'Hedging Density', value: current.hedging.toFixed(2), color: current.hedging > 0.35 ? C.negative : C.text, delta: current.hedging - prior.hedging, invertDelta: true },
            { label: 'Guidance Confidence', value: current.guidance.toFixed(2), color: current.guidance > 0.7 ? C.positive : current.guidance < 0.4 ? C.negative : C.text, delta: current.guidance - prior.guidance },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              className="px-4 py-3"
              style={{ borderRight: i < 4 ? `1px solid ${C.border}` : 'none' }}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest" style={{ color: C.muted }}>
                  {kpi.label}
                </div>
                {kpi.hint && (
                  <span
                    className="text-xs px-1.5 py-0.5"
                    style={{
                      color: kpi.hint === 'WIDE' ? C.amber : C.muted,
                      border: `1px solid ${kpi.hint === 'WIDE' ? C.amber : C.muted}`,
                      opacity: 0.8,
                    }}
                  >
                    {kpi.hint}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-3 mt-2">
                <div className="tabular text-3xl display-font" style={{ color: kpi.color, fontWeight: 400 }}>
                  {kpi.value}
                </div>
                <div className="tabular text-xs flex items-center gap-1" style={{ color: C.muted }}>
                  {(kpi.invertDelta ? -kpi.delta : kpi.delta) > 0 ? (
                    <ArrowUpRight size={12} style={{ color: kpi.invertDelta ? C.negative : C.positive }} />
                  ) : (
                    <ArrowDownRight size={12} style={{ color: kpi.invertDelta ? C.positive : C.negative }} />
                  )}
                  {fmtTone(kpi.delta)}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* ============== TRAJECTORY + TOPICS ============== */}
        <section className="grid grid-cols-3 gap-4 mt-4">
          {/* Trajectory chart */}
          <Panel
            label="Multi-Quarter Sentiment Trajectory"
            sublabel={`Management vs analyst Q&A · ${quarters.length} quarters`}
            className="col-span-2"
          >
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trajectoryData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke={C.border} strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="label" stroke={C.muted} tick={{ fontSize: 10 }} axisLine={{ stroke: C.border }} tickLine={false} />
                  <YAxis
                    domain={[-0.5, 1]}
                    stroke={C.muted}
                    tick={{ fontSize: 10 }}
                    axisLine={{ stroke: C.border }}
                    tickLine={false}
                    tickFormatter={(v) => v.toFixed(1)}
                  />
                  <ReferenceLine y={0} stroke={C.borderLight} strokeWidth={1} />
                  <Tooltip
                    contentStyle={{
                      background: C.panel2,
                      border: `1px solid ${C.borderLight}`,
                      fontFamily: 'IBM Plex Mono',
                      fontSize: 11,
                      color: C.text,
                    }}
                    formatter={(v) => Number(v).toFixed(2)}
                  />
                  <Area type="monotone" dataKey="Management" stroke={C.mgmt} strokeWidth={0} fill={C.gap} fillOpacity={1} />
                  <Line type="monotone" dataKey="Management" stroke={C.mgmt} strokeWidth={2} dot={{ r: 3, fill: C.mgmt, stroke: 'none' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Analyst Q&A" stroke={C.analyst} strokeWidth={2} dot={{ r: 3, fill: C.analyst, stroke: 'none' }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-6 mt-3 text-xs" style={{ color: C.muted }}>
              <span className="flex items-center gap-2">
                <span style={{ width: 12, height: 2, background: C.mgmt, display: 'inline-block' }} />
                Management prepared remarks
              </span>
              <span className="flex items-center gap-2">
                <span style={{ width: 12, height: 2, background: C.analyst, display: 'inline-block' }} />
                Analyst Q&A
              </span>
              <span className="flex items-center gap-2">
                <span style={{ width: 12, height: 8, background: C.gap, display: 'inline-block', border: `1px solid ${C.amberDim}` }} />
                Framing gap
              </span>
            </div>
          </Panel>

          {/* Topic decomposition */}
          <Panel label="Topic Emphasis" sublabel={`${current.label} · LLM-extracted themes`}>
            <div className="space-y-3">
              {(() => {
                const maxW = Math.max(...company.topics.map((t) => t.weight), 0.001);
                return company.topics.map((t) => {
                  const topicGap = t.mgmt - t.qa;
                  const barPct = Math.min(100, (t.weight / maxW) * 100);
                  return (
                  <div key={t.name}>
                    <div className="flex items-baseline justify-between text-xs mb-1">
                      <span style={{ color: C.bone, fontWeight: 500 }}>{t.name}</span>
                      <span className="tabular" style={{ color: C.muted }}>
                        {(t.weight * 100).toFixed(0)}% of call
                      </span>
                    </div>
                    {/* Bar showing weight relative to the largest topic */}
                    <div className="relative h-1.5 mb-1.5" style={{ background: C.panel2 }}>
                      <div
                        className="absolute top-0 left-0 h-full"
                        style={{ width: `${barPct}%`, background: C.amberDim }}
                      />
                    </div>
                    {/* Mgmt vs QA tone */}
                    <div className="flex items-center gap-3 text-xs tabular">
                      <span style={{ color: toneColor(t.mgmt), minWidth: 56 }}>
                        M {fmtTone(t.mgmt)}
                      </span>
                      <span style={{ color: toneColor(t.qa), minWidth: 56 }}>
                        Q {fmtTone(t.qa)}
                      </span>
                      {Math.abs(topicGap) > 0.25 && (
                        <span
                          className="text-xs px-1.5"
                          style={{
                            color: C.amber,
                            border: `1px solid ${C.amberDim}`,
                            fontSize: 9,
                            letterSpacing: '0.1em',
                          }}
                        >
                          GAP {fmtTone(topicGap)}
                        </span>
                      )}
                    </div>
                  </div>
                );
                });
              })()}
            </div>
            <div className="text-xs mt-4 pt-3" style={{ color: C.muted, borderTop: `1px solid ${C.border}` }}>
              <span style={{ color: C.amber }}>◆</span> Wide gaps signal where analysts are pushing back
              against management framing.
            </div>
              <span style={{ color: C.amber }}>◆</span> Wide gaps signal where analysts are pushing back
              against management framing.
            </div>
          </Panel>
        </section>

        {/* ============== SCATTER + EXTRACTS ============== */}
        <section className="grid grid-cols-5 gap-4 mt-4">
          <Panel
            label="Sentiment Gap vs Residual Return"
            sublabel="5-day post-call return after controlling for EPS surprise"
            className="col-span-2"
          >
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 0 }}>
                  <CartesianGrid stroke={C.border} strokeDasharray="2 4" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Sentiment Gap (M − Q)"
                    stroke={C.muted}
                    tick={{ fontSize: 10 }}
                    axisLine={{ stroke: C.border }}
                    tickLine={false}
                    tickFormatter={(v) => v.toFixed(2)}
                    label={{ value: 'Sentiment Gap (M − Q)', position: 'bottom', offset: 0, style: { fill: C.muted, fontSize: 10 } }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="5d Residual"
                    stroke={C.muted}
                    tick={{ fontSize: 10 }}
                    axisLine={{ stroke: C.border }}
                    tickLine={false}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    label={{ value: '5d Residual', angle: -90, position: 'insideLeft', style: { fill: C.muted, fontSize: 10, textAnchor: 'middle' } }}
                  />
                  <ReferenceLine y={0} stroke={C.borderLight} />
                  <ReferenceLine x={0} stroke={C.borderLight} />
                  <Tooltip
                    cursor={{ stroke: C.borderLight, strokeDasharray: '3 3' }}
                    contentStyle={{
                      background: C.panel2,
                      border: `1px solid ${C.borderLight}`,
                      fontFamily: 'IBM Plex Mono',
                      fontSize: 11,
                      color: C.text,
                    }}
                    formatter={(v, name) => {
                      if (name === 'x') return [Number(v).toFixed(2), 'Gap'];
                      if (name === 'y') return [`${(Number(v) * 100).toFixed(1)}%`, '5d Residual'];
                      return v;
                    }}
                    labelFormatter={() => ''}
                  />
                  <Scatter data={scatterData}>
                    {scatterData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.y > 0 ? C.positive : C.negative}
                        fillOpacity={0.4 + (i / scatterData.length) * 0.6}
                        stroke={d.y > 0 ? C.positive : C.negative}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs mt-2" style={{ color: C.muted }}>
              <span style={{ color: C.amber }}>◆</span> Quadrant of interest: wide gap + negative residual
              (management rosy, market unconvinced).
            </div>
          </Panel>

          {/* Notable extracts */}
          <Panel
            label="Notable Extracts"
            sublabel={`${current.label} · LLM-flagged passages`}
            className="col-span-3"
          >
            <div className="space-y-2">
              {company.extracts.map((e, i) => {
                const tagMeta = {
                  confident: { label: 'Confident', color: C.positive, Icon: Shield },
                  hedging: { label: 'Hedging', color: C.amber, Icon: AlertTriangle },
                  evasion: { label: 'Evasion', color: C.negative, Icon: Crosshair },
                  admission: { label: 'Admission', color: C.analyst, Icon: MessageSquareQuote },
                }[e.tag] || { label: e.tag, color: C.muted, Icon: MessageSquareQuote };
                const Icon = tagMeta.Icon;
                return (
                  <div
                    key={i}
                    className="extract-row p-3 flex gap-4 items-start"
                    style={{ background: C.panel2, border: `1px solid ${C.border}` }}
                  >
                    <div className="flex flex-col items-start gap-1" style={{ minWidth: 92 }}>
                      <Icon size={14} style={{ color: tagMeta.color }} />
                      <span
                        className="text-xs uppercase tracking-widest"
                        style={{ color: tagMeta.color, fontSize: 10 }}
                      >
                        {tagMeta.label}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div
                        className="display-font text-base leading-snug"
                        style={{ color: C.bone, fontStyle: 'italic' }}
                      >
                        “{e.text}”
                      </div>
                      <div className="text-xs mt-1" style={{ color: C.muted }}>
                        — {e.speaker}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </section>

        {/* ============== METHODOLOGY ============== */}
        <section className="mt-4">
          <Panel label="Methodology" sublabel="Per-call structured extraction">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm leading-relaxed" style={{ color: C.text }}>
                  Each transcript is split into <span style={{ color: C.amber }}>prepared remarks</span> and{' '}
                  <span style={{ color: C.amber }}>analyst Q&A</span>, scored separately by the LLM with a
                  fixed JSON schema. Tone, hedging density, guidance confidence, and topic-level sentiment
                  are extracted with structured outputs to ensure parseable, comparable signals across
                  quarters.
                </div>
                <div className="text-sm leading-relaxed mt-3" style={{ color: C.text }}>
                  Returns are computed against a sector-matched baseline; <span style={{ color: C.amber }}>residual</span>{' '}
                  is the post-call return net of EPS surprise — isolating the marginal information content
                  of <em>how</em> management spoke, beyond <em>what</em> they reported.
                </div>
                <div className="flex gap-2 mt-4 flex-wrap">
                  {['Python', 'Anthropic API', 'OpenAI API', 'Pandas', 'yfinance', 'FMP', 'Plotly', 'Recharts'].map((t) => (
                    <Tag key={t} color={C.mutedLight}>{t}</Tag>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.muted }}>
                  Extraction schema (excerpt)
                </div>
                <pre
                  className="text-xs p-3 leading-relaxed overflow-x-auto"
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    fontSize: 11,
                  }}
                >
{`{
  "section": "prepared" | "qa",
  "tone": -1.0..1.0,
  "hedging_density": 0.0..1.0,
  "guidance_confidence": 0.0..1.0,
  "guidance_change": "raise" | "hold" | "lower" | "none",
  "topics": [
    { "name": str, "weight": 0..1, "tone": -1..1 }
  ],
  "notable_passages": [
    { "tag": "confident" | "hedging" |
             "evasion"   | "admission",
      "speaker": str,
      "text": str }
  ]
}`}
                </pre>
              </div>
            </div>
          </Panel>
        </section>

        {/* ============== FOOTER ============== */}
        <footer className="mt-6 pt-4 flex justify-between text-xs" style={{ borderTop: `1px solid ${C.border}`, color: C.muted }}>
          <div>
            * Residual = (5-day return) − β·(sector return) − γ·(EPS surprise). Demo uses illustrative
            values; production pipeline pulls FMP transcripts + yfinance prices.
          </div>
          <div className="tabular">v0.1 · demo build</div>
        </footer>
      </div>
    </div>
  );
}
