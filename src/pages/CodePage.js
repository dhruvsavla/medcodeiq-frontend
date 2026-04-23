import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Pill from '../components/Pill';
import ErrorBanner from '../components/ErrorBanner';

export default function CodePage() {
  const [text, setText] = useState('Patient reports nausea and severe headache since yesterday.');
  const [version, setVersion] = useState('');
  const [isSae, setIsSae] = useState(false);
  const [persist, setPersist] = useState(true);
  const [coderId, setCoderId] = useState('');
  const [versions, setVersions] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { api.versions().then(r => setVersions(r.items)).catch(setErr); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr(null); setResult(null);
    try {
      const r = await api.code({
        text, version_number: version || null, is_sae: isSae,
        coder_id: coderId || null, persist,
      });
      setResult(r);
    } catch (e) { setErr(e); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2>Code narrative</h2>
      <form className="card" onSubmit={onSubmit}>
        <label>Narrative<textarea value={text} onChange={e => setText(e.target.value)} /></label>
        <div className="filters" style={{ marginTop: 12 }}>
          <label>MedDRA version
            <select value={version} onChange={e => setVersion(e.target.value)}>
              <option value="">active</option>
              {versions.map(v => <option key={v.version_id} value={v.version_number}>{v.version_number}</option>)}
            </select>
          </label>
          <label>Coder ID<input value={coderId} onChange={e => setCoderId(e.target.value)} placeholder="optional" /></label>
          <label><input type="checkbox" checked={isSae} onChange={e => setIsSae(e.target.checked)} /> SAE (locks + escalates)</label>
          <label><input type="checkbox" checked={persist} onChange={e => setPersist(e.target.checked)} /> Persist records</label>
          <button type="submit" disabled={loading}>{loading ? 'Coding…' : 'Code'}</button>
        </div>
      </form>

      <ErrorBanner error={err} />

      {result && (
        <div className="card">
          <h3>Result</h3>
          <div className="muted mono" style={{ marginBottom: 8 }}>Masked: {result.masked_text}</div>
          {Object.keys(result.redactions).length > 0 && (
            <div className="muted">Redactions: {Object.entries(result.redactions).map(([k, v]) => `${k}×${v}`).join(', ')}</div>
          )}
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr><th>Symptom</th><th>PT</th><th>SOC</th><th>Conf</th><th>Status</th><th>Score</th><th>LLM</th><th></th></tr>
            </thead>
            <tbody>
              {result.symptoms.map((s, i) => (
                <tr key={i}>
                  <td>{s.symptom_text}</td>
                  <td><span className="mono">{s.pt_code || '—'}</span> {s.pt_name || ''}</td>
                  <td>{s.soc_code || '—'}</td>
                  <td><Pill value={s.confidence_level} /></td>
                  <td><Pill value={s.status} /></td>
                  <td className="mono">{s.cross_encoder_score?.toFixed(3) ?? '—'}</td>
                  <td>{s.llm_confirmed ? '✓' : '—'}</td>
                  <td>{s.record_id && <Link to={`/records/${s.record_id}`}>open</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
