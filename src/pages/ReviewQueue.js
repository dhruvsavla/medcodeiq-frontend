import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Pill from '../components/Pill';
import ErrorBanner from '../components/ErrorBanner';

const STATUS_OPTIONS = ['', 'auto', 'spot_check', 'review', 'escalated', 'approved', 'overridden'];
const CONF_OPTIONS = ['', 'HIGH', 'MEDIUM', 'LOW', 'CONFLICT'];

export default function ReviewQueue() {
  const [status, setStatus] = useState('review');
  const [conf, setConf] = useState('');
  const [data, setData] = useState({ total: 0, items: [] });
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setErr(null);
    api.listRecords({ status: status || undefined, confidence_level: conf || undefined, limit: 100 })
      .then(setData).catch(setErr).finally(() => setLoading(false));
  }, [status, conf]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h2>Review queue</h2>
      <div className="filters">
        <label>Status<select value={status} onChange={e => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || '(any)'}</option>)}
        </select></label>
        <label>Confidence<select value={conf} onChange={e => setConf(e.target.value)}>
          {CONF_OPTIONS.map(c => <option key={c} value={c}>{c || '(any)'}</option>)}
        </select></label>
        <button className="secondary" onClick={load} disabled={loading}>{loading ? '…' : 'Refresh'}</button>
      </div>
      <ErrorBanner error={err} />
      <div className="muted">Showing {data.items.length} of {data.total}</div>
      <table>
        <thead>
          <tr><th>Record</th><th>Coded</th><th>Text</th><th>PT</th><th>Conf</th><th>Status</th><th>SAE</th></tr>
        </thead>
        <tbody>
          {data.items.map(r => (
            <tr key={r.record_id}>
              <td><Link to={`/records/${r.record_id}`} className="mono">{r.record_id.slice(0, 8)}</Link></td>
              <td className="muted">{new Date(r.coded_at).toLocaleString()}</td>
              <td>{r.input_text_masked?.slice(0, 80)}</td>
              <td><span className="mono">{r.pt_code || '—'}</span> {r.pt_name}</td>
              <td><Pill value={r.confidence_level} /></td>
              <td><Pill value={r.status} /></td>
              <td>{r.is_sae ? '🔒' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
