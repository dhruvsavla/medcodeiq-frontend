import { useEffect, useState } from 'react';
import { api } from '../api';
import ErrorBanner from '../components/ErrorBanner';

export default function VersionShifts() {
  const [versions, setVersions] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [shifts, setShifts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    api.versions().then(r => {
      setVersions(r.items);
      if (r.items.length >= 2) {
        setFrom(r.items[1].version_number);
        setTo(r.items[0].version_number);
      }
    }).catch(setErr);
  }, []);

  const loadShifts = () => {
    api.listShifts({ from_version: from || undefined, to_version: to || undefined })
      .then(r => setShifts(r.items)).catch(setErr);
  };
  useEffect(() => { if (from && to) loadShifts(); /* eslint-disable-next-line */ }, [from, to]);

  const apply = async () => {
    setRunning(true); setErr(null);
    try {
      const s = await api.applyShift({ from_version: from, to_version: to });
      setSummary(s); loadShifts();
    } catch (e) { setErr(e); }
    finally { setRunning(false); }
  };

  const counts = shifts.reduce((m, s) => { m[s.change_type] = (m[s.change_type] || 0) + 1; return m; }, {});

  return (
    <div>
      <h2>Version shifts</h2>
      <ErrorBanner error={err} />
      <div className="card">
        <div className="filters">
          <label>From<select value={from} onChange={e => setFrom(e.target.value)}>
            {versions.map(v => <option key={v.version_id} value={v.version_number}>{v.version_number}</option>)}
          </select></label>
          <label>To<select value={to} onChange={e => setTo(e.target.value)}>
            {versions.map(v => <option key={v.version_id} value={v.version_number}>{v.version_number}</option>)}
          </select></label>
          <button onClick={apply} disabled={running || !from || !to}>
            {running ? 'Applying…' : 'Apply shifts'}
          </button>
        </div>
        {summary && (
          <div className="ok" style={{ marginTop: 12 }}>
            Applied {summary.from_version} → {summary.to_version}: migrated {summary.records_migrated}, flagged {summary.records_flagged}.
          </div>
        )}
      </div>

      <div className="card">
        <h3>Shifts ({shifts.length})</h3>
        <div className="muted" style={{ marginBottom: 8 }}>
          {Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(' · ')}
        </div>
        <table>
          <thead><tr><th>Type</th><th>Old PT</th><th>New PT</th><th>Auto</th><th>Detected</th></tr></thead>
          <tbody>
            {shifts.map(s => (
              <tr key={s.shift_id}>
                <td><b>{s.change_type}</b></td>
                <td className="mono">{s.pt_code_old || '—'}</td>
                <td className="mono">{s.pt_code_new || '—'}</td>
                <td>{s.auto_resolved ? '✓' : ''}</td>
                <td className="muted">{new Date(s.detected_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
