import { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import ErrorBanner from '../components/ErrorBanner';

const TYPE_COLORS = {
  rename:     { bg: 'var(--info-light)',    color: '#1e40af' },
  hierarchy:  { bg: 'var(--primary-light)', color: '#3730a3' },
  new:        { bg: 'var(--success-light)', color: '#065f46' },
  retirement: { bg: 'var(--danger-light)',  color: '#991b1b' },
  split:      { bg: 'var(--warning-light)', color: '#92400e' },
  merge:      { bg: 'var(--purple-light)',  color: '#5b21b6' },
};

const TYPE_DESCRIPTIONS = {
  rename:     'The PT code stayed the same but its preferred name changed in the new version.',
  hierarchy:  'The PT code stayed the same but its SOC/HLT/HLGT placement in the hierarchy changed.',
  new:        'A brand-new PT code introduced in the new version — no equivalent existed before.',
  retirement: 'The PT was removed and has no matching replacement in the new version. Records must be reviewed manually.',
  split:      'One PT was retired and its concept was divided into two or more distinct PTs in the new version.',
  merge:      'Two or more PTs were consolidated into a single PT in the new version.',
};

function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] || { bg: 'var(--slate-100)', color: 'var(--slate-700)' };
  const desc = TYPE_DESCRIPTIONS[type];
  const ref = useRef();
  const [tip, setTip] = useState(null);

  const show = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setTip({ x: r.left + r.width / 2, y: r.top - 10 });
  };

  return (
    <span ref={ref} style={{ display: 'inline-block' }}
      onMouseEnter={show} onMouseLeave={() => setTip(null)}>
      <span style={{ background: c.bg, color: c.color, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'default' }}>
        {type}
      </span>
      {tip && desc && (
        <span style={{
          position: 'fixed',
          left: tip.x, top: tip.y,
          transform: 'translate(-50%, -100%)',
          background: '#0f172a', color: '#e2e8f0',
          padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 400,
          lineHeight: 1.6, width: 250,
          boxShadow: '0 8px 24px rgb(0 0 0 / 0.3)',
          zIndex: 9999, pointerEvents: 'none',
        }}>
          <strong style={{ display: 'block', marginBottom: 4, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em', color: c.bg }}>{type}</strong>
          {desc}
        </span>
      )}
    </span>
  );
}

export default function VersionShifts() {
  const [versions, setVersions] = useState([]);
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');
  const [shifts, setShifts]     = useState([]);
  const [summary, setSummary]   = useState(null);
  const [err, setErr]           = useState(null);
  const [running, setRunning]   = useState(false);

  useEffect(() => {
    api.versions().then(r => {
      setVersions(r.items);
      if (r.items.length >= 2) {
        const sorted = [...r.items].sort((a, b) => a.version_number.localeCompare(b.version_number));
        setFrom(sorted[0].version_number);
        setTo(sorted[sorted.length - 1].version_number);
      }
    }).catch(setErr);
  }, []);

  const loadShifts = () => {
    if (!from || !to) return;
    api.listShifts({ from_version: from, to_version: to })
      .then(r => setShifts(r.items)).catch(setErr);
  };
  useEffect(() => { loadShifts(); /* eslint-disable-next-line */ }, [from, to]);

  const apply = async () => {
    setRunning(true); setErr(null); setSummary(null);
    try {
      const s = await api.applyShift({ from_version: from, to_version: to });
      setSummary(s); loadShifts();
    } catch (e) { setErr(e); }
    finally { setRunning(false); }
  };

  const counts = shifts.reduce((m, s) => { m[s.change_type] = (m[s.change_type] || 0) + 1; return m; }, {});

  return (
    <div className="fade-in" style={{ maxWidth: 1100 }}>
      <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>VERSION MANAGEMENT</div>
      <h2>Version Shifts</h2>

      <ErrorBanner error={err} />

      {/* Controls */}
      <div className="card">
        <h3>Apply migration</h3>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <span className="label">From version</span>
            <select value={from} onChange={e => setFrom(e.target.value)} style={{ minWidth: 140 }}>
              {versions.map(v => <option key={v.version_id} value={v.version_number}>{v.version_number}</option>)}
            </select>
          </div>
          <div style={{ color: 'var(--slate-400)', fontSize: 20, paddingBottom: 8 }}>→</div>
          <div>
            <span className="label">To version</span>
            <select value={to} onChange={e => setTo(e.target.value)} style={{ minWidth: 140 }}>
              {versions.map(v => <option key={v.version_id} value={v.version_number}>{v.version_number}</option>)}
            </select>
          </div>
          <button onClick={apply} disabled={running || !from || !to || from === to} style={{ minWidth: 160 }}>
            {running ? 'Applying…' : 'Apply shifts'}
          </button>
        </div>
        {summary && (
          <div className="ok" style={{ marginTop: 16 }}>
            <strong>Migration complete:</strong> {summary.from_version} → {summary.to_version} ·{' '}
            <strong>{summary.records_migrated}</strong> records auto-migrated ·{' '}
            <strong style={{ color: summary.records_flagged > 0 ? 'var(--warning)' : 'inherit' }}>
              {summary.records_flagged}
            </strong> flagged for review
          </div>
        )}
      </div>

      {/* Type summary pills */}
      {Object.keys(counts).length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          {Object.entries(counts).map(([type, count]) => (
            <div key={type} style={{ ...TYPE_COLORS[type], borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600 }}>
              {count} {type}
            </div>
          ))}
        </div>
      )}

      {/* Shifts table */}
      {shifts.length > 0 && (
        <div className="card flush">
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--slate-100)', background: 'var(--slate-50)' }}>
            <h3 style={{ margin: 0 }}>{shifts.length} shift records — {from} → {to}</h3>
          </div>
          <table>
            <thead>
              <tr><th>Type</th><th>Old PT</th><th>New PT</th><th>Auto-resolved</th><th>Detected</th></tr>
            </thead>
            <tbody>
              {shifts.map(s => (
                <tr key={s.shift_id}>
                  <td><TypeBadge type={s.change_type} /></td>
                  <td>{s.pt_code_old ? <span className="mono">{s.pt_code_old}</span> : <span className="muted">—</span>}</td>
                  <td>{s.pt_code_new ? <span className="mono">{s.pt_code_new}</span> : <span className="muted">—</span>}</td>
                  <td>
                    {s.auto_resolved
                      ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Auto</span>
                      : <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Manual</span>}
                  </td>
                  <td className="muted">{new Date(s.detected_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {shifts.length === 0 && !err && (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--slate-400)' }}>
          No shifts detected yet for this version pair. Click "Apply shifts" to run the detection.
        </div>
      )}
    </div>
  );
}
