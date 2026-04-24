import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useStudy } from '../context/StudyContext';
import Pill from '../components/Pill';
import ErrorBanner from '../components/ErrorBanner';

const BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api/v1';

const STATUSES = ['auto', 'spot_check', 'review', 'escalated', 'approved', 'overridden'];

export default function RecordDetail() {
  const { id } = useParams();
  const { studies } = useStudy();
  const [rec, setRec] = useState(null);
  const [err, setErr] = useState(null);
  const [pt, setPt] = useState('');
  const [status, setStatus] = useState('');
  const [coder, setCoder] = useState('');
  const [studyId, setStudyId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    api.getRecord(id).then(r => {
      setRec(r); setPt(r.pt_code || ''); setStatus(r.status);
      setCoder(r.coder_id || ''); setStudyId(r.study_id || '');
    }).catch(setErr);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true); setErr(null); setSaved(false);
    try {
      await api.updateRecord(id, { pt_code: pt || null, status, coder_id: coder || null, study_id: studyId || null });
      setSaved(true); load();
    } catch (e) { setErr(e); }
    finally { setSaving(false); }
  };

  const toggleLock = async () => {
    setErr(null);
    try { await (rec.is_locked ? api.unlockRecord(id) : api.lockRecord(id)); load(); }
    catch (e) { setErr(e); }
  };

  if (!rec) return (
    <div><h2>Record</h2><ErrorBanner error={err} />{!err && <div className="muted">Loading…</div>}</div>
  );

  return (
    <div className="fade-in">
      <div className="section-header">
        <div>
          <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>RECORD DETAIL</div>
          <h2 style={{ margin: 0 }}>
            <span className="mono" style={{ fontSize: 16 }}>{rec.record_id.slice(0, 8)}…</span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href={`${BASE}/records/${id}/e2b`} download
            style={{ fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 6, border: '1.5px solid var(--slate-200)', color: 'var(--slate-700)', background: 'white', textDecoration: 'none' }}>
            ⬇ E2B Export
          </a>
          <Link to="/review" style={{ color: 'var(--slate-400)', fontSize: 14 }}>← Back to queue</Link>
        </div>
      </div>

      <ErrorBanner error={err} />
      {saved && <div className="ok">Changes saved successfully.</div>}

      <div className="row">
        {/* Left: Text + meta */}
        <div style={{ flex: 2 }}>
          <div className="card">
            <h3>Narrative (masked)</h3>
            <div style={{ background: 'var(--slate-50)', borderRadius: 8, padding: '16px 20px', fontFamily: 'inherit', lineHeight: 1.7, fontSize: 15, marginBottom: 16, border: '1px solid var(--slate-200)' }}>
              {rec.input_text_masked}
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                ['Coded', new Date(rec.coded_at).toLocaleString()],
                ['Version', `v${rec.version_id}`],
                ['Entity type', { adverse_event: 'Adverse Event', medical_history: 'Medical History', concomitant_medication: 'Conmed', procedure: 'Procedure', indication: 'Indication' }[rec.entity_type] || rec.entity_type || 'Adverse Event'],
                ['Coder', rec.coder_id || '—'],
                ['SAE', rec.is_sae ? 'Yes 🔒' : 'No'],
                ['Locked', rec.is_locked ? 'Yes' : 'No'],
                ...(rec.original_language ? [['Language', rec.original_language.toUpperCase()]] : []),
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{v}</div>
                </div>
              ))}
            </div>
            {rec.original_text && (
              <div style={{ marginTop: 16 }}>
                <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Original ({rec.original_language?.toUpperCase()})</div>
                <div style={{ background: 'var(--slate-50)', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: 'var(--slate-700)', border: '1px solid var(--slate-200)', borderLeft: '4px solid #a78bfa', lineHeight: 1.6 }}>
                  {rec.original_text}
                </div>
              </div>
            )}
          </div>

          {/* Top-5 candidates */}
          <div className="card flush">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--slate-100)' }}>
              <h3 style={{ margin: 0 }}>Top-5 candidates considered</h3>
            </div>
            <table>
              <thead>
                <tr><th>#</th><th>PT Code</th><th>Preferred Term</th><th>SOC</th><th>Bi-encoder</th><th>Cross-encoder</th></tr>
              </thead>
              <tbody>
                {(rec.top_5_candidates || []).map((c, i) => (
                  <tr key={i} style={{ background: i === 0 ? 'rgba(79,70,229,0.03)' : undefined }}>
                    <td className="muted">{i + 1}</td>
                    <td><span className="mono">{c.pt_code}</span></td>
                    <td style={{ fontWeight: i === 0 ? 600 : 400 }}>{c.pt_name}</td>
                    <td className="muted">{c.soc_name}</td>
                    <td className="mono">{c.bi_encoder_similarity?.toFixed(3)}</td>
                    <td>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                        color: c.cross_encoder_score > 0.5 ? '#065f46' : 'var(--slate-700)',
                        fontWeight: c.cross_encoder_score > 0.5 ? 700 : 400,
                      }}>
                        {c.cross_encoder_score?.toFixed(3)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Coding + override */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="card">
            <h3>Current coding</h3>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
                {rec.pt_name || <span className="muted">No PT assigned</span>}
              </div>
              {rec.pt_code && <span className="mono">{rec.pt_code}</span>}
              {rec.soc_code && <div className="muted" style={{ marginTop: 6 }}>SOC: {rec.soc_code}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <Pill value={rec.confidence_level} />
              <Pill value={rec.status} />
            </div>
            <hr className="divider" />
            <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
              <div>
                <div className="muted">Cross-encoder</div>
                <div style={{ fontWeight: 700 }}>{rec.cross_encoder_score?.toFixed(3) ?? '—'}</div>
              </div>
              <div>
                <div className="muted">LLM confirmed</div>
                <div style={{ fontWeight: 700 }}>{rec.llm_confirmed ? '✓ Yes' : '— No'}</div>
              </div>
            </div>
            {rec.llm_reasoning && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--slate-50)', borderRadius: 8, fontSize: 13, color: 'var(--slate-700)', fontStyle: 'italic', borderLeft: '3px solid var(--slate-200)' }}>
                {rec.llm_reasoning}
              </div>
            )}
          </div>

          <div className="card" style={{ background: rec.is_locked ? 'var(--slate-50)' : 'white' }}>
            <h3>Override {rec.is_locked && '(locked)'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span className="label">PT Code</span>
                <input value={pt} onChange={e => setPt(e.target.value)} disabled={rec.is_locked} placeholder="e.g. 83010017" />
              </div>
              <div>
                <span className="label">Status</span>
                <select value={status} onChange={e => setStatus(e.target.value)} disabled={rec.is_locked}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <span className="label">Coder ID</span>
                <input value={coder} onChange={e => setCoder(e.target.value)} disabled={rec.is_locked} placeholder="Your ID" />
              </div>
              <div>
                <span className="label">Study</span>
                <select value={studyId} onChange={e => setStudyId(e.target.value)} disabled={rec.is_locked}>
                  <option value="">— Unassigned —</option>
                  {studies.map(s => <option key={s.study_id} value={s.study_id}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={save} disabled={rec.is_locked || saving} style={{ flex: 1 }}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button className={rec.is_locked ? 'secondary' : 'danger'} onClick={toggleLock} style={{ flex: 1 }}>
                  {rec.is_locked ? 'Unlock' : 'Lock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
