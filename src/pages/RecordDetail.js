import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import Pill from '../components/Pill';
import ErrorBanner from '../components/ErrorBanner';

const STATUSES = ['auto', 'spot_check', 'review', 'escalated', 'approved', 'overridden'];

export default function RecordDetail() {
  const { id } = useParams();
  const [rec, setRec] = useState(null);
  const [err, setErr] = useState(null);
  const [pt, setPt] = useState('');
  const [status, setStatus] = useState('');
  const [coder, setCoder] = useState('');

  const load = useCallback(() => {
    api.getRecord(id).then(r => {
      setRec(r); setPt(r.pt_code || ''); setStatus(r.status); setCoder(r.coder_id || '');
    }).catch(setErr);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setErr(null);
    try {
      await api.updateRecord(id, { pt_code: pt || null, status, coder_id: coder || null });
      load();
    } catch (e) { setErr(e); }
  };
  const toggleLock = async () => {
    setErr(null);
    try {
      await (rec.is_locked ? api.unlockRecord(id) : api.lockRecord(id));
      load();
    } catch (e) { setErr(e); }
  };

  if (!rec) return <div><h2>Record</h2><ErrorBanner error={err} /></div>;

  return (
    <div>
      <h2>Record <span className="mono" style={{ fontSize: 14 }}>{rec.record_id}</span></h2>
      <ErrorBanner error={err} />
      <div className="row">
        <div className="card">
          <h3>Text</h3>
          <div className="mono" style={{ whiteSpace: 'pre-wrap' }}>{rec.input_text_masked}</div>
          <div className="muted" style={{ marginTop: 8 }}>
            Coded {new Date(rec.coded_at).toLocaleString()} · version {rec.version_id} · SAE {rec.is_sae ? 'yes' : 'no'} · locked {rec.is_locked ? 'yes' : 'no'}
          </div>
        </div>
        <div className="card">
          <h3>Current coding</h3>
          <div><b>{rec.pt_code}</b> {rec.pt_name}</div>
          <div>SOC {rec.soc_code}</div>
          <div style={{ marginTop: 8 }}>
            <Pill value={rec.confidence_level} /> <Pill value={rec.status} />
          </div>
          <div className="muted" style={{ marginTop: 8 }}>
            xenc={rec.cross_encoder_score?.toFixed(3) ?? '—'} · llm={rec.llm_confirmed ? '✓' : '—'}
          </div>
          {rec.llm_reasoning && <div className="muted" style={{ marginTop: 8 }}><i>{rec.llm_reasoning}</i></div>}
        </div>
      </div>

      <div className="card">
        <h3>Override</h3>
        <div className="filters">
          <label>PT code<input value={pt} onChange={e => setPt(e.target.value)} disabled={rec.is_locked} /></label>
          <label>Status<select value={status} onChange={e => setStatus(e.target.value)} disabled={rec.is_locked}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select></label>
          <label>Coder ID<input value={coder} onChange={e => setCoder(e.target.value)} disabled={rec.is_locked} /></label>
          <button onClick={save} disabled={rec.is_locked}>Save</button>
          <button className={rec.is_locked ? 'secondary' : 'danger'} onClick={toggleLock}>
            {rec.is_locked ? 'Unlock' : 'Lock'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Top-5 candidates</h3>
        <table>
          <thead><tr><th>PT</th><th>SOC</th><th>bi</th><th>xenc</th></tr></thead>
          <tbody>
            {(rec.top_5_candidates || []).map((c, i) => (
              <tr key={i}>
                <td><span className="mono">{c.pt_code}</span> {c.pt_name}</td>
                <td>{c.soc_name}</td>
                <td className="mono">{c.bi_encoder_similarity?.toFixed(3)}</td>
                <td className="mono">{c.cross_encoder_score?.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
