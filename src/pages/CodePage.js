import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useStudy } from '../context/StudyContext';
import Pill from '../components/Pill';
import ErrorBanner from '../components/ErrorBanner';

export default function CodePage() {
  const { activeStudyId, activeStudy } = useStudy();
  const [tab, setTab] = useState('single'); // 'single' | 'batch'

  // ── Single narrative state ──────────────────────────────────────────────
  const [text, setText]             = useState('');
  const [version, setVersion]       = useState('');
  const [isSae, setIsSae]           = useState(false);
  const [persist, setPersist]       = useState(true);
  const [coderId, setCoderId]       = useState('');
  const [entityType, setEntityType] = useState('adverse_event');
  const [versions, setVersions]     = useState([]);
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);

  // ── Batch upload state ──────────────────────────────────────────────────
  const [file, setFile]               = useState(null);
  const [dragging, setDragging]       = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [batchPersist, setBatchPersist] = useState(true);
  const inputRef = useRef();

  const [err, setErr] = useState(null);

  useEffect(() => { api.versions().then(r => setVersions(r.items)).catch(setErr); }, []);

  // ── Single submit ───────────────────────────────────────────────────────
  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr(null); setResult(null);
    try {
      const r = await api.code({ text, version_number: version || null, is_sae: isSae, coder_id: coderId || null, persist, study_id: activeStudyId || null, entity_type: entityType });
      setResult(r);
    } catch (e) { setErr(e); }
    finally { setLoading(false); }
  };

  // ── Batch submit ────────────────────────────────────────────────────────
  const pickFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) { setErr(new Error('Only CSV and Excel files are supported.')); return; }
    setFile(f); setErr(null); setBatchResult(null);
  };

  const batchSubmit = async () => {
    if (!file) return;
    setBatchLoading(true); setErr(null); setBatchResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('persist', batchPersist ? 'true' : 'false');
      if (activeStudyId) fd.append('study_id', activeStudyId);
      setBatchResult(await api.batchUpload(fd));
    } catch (e) { setErr(e); }
    finally { setBatchLoading(false); }
  };

  const downloadCsv = () => {
    if (!batchResult) return;
    const fields = ['row', 'input_narrative', 'symptom_text', 'pt_code', 'pt_name', 'soc_code', 'confidence_level', 'status', 'cross_encoder_score', 'llm_confirmed', 'record_id'];
    const lines = [fields.join(','), ...batchResult.results.map(r => fields.map(f => JSON.stringify(r[f] ?? '')).join(','))];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    a.download = 'coded_results.csv'; a.click();
  };

  const studyBadge = activeStudy
    ? <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 12px', borderRadius: 6 }}>Study: {activeStudy.name}</span>
    : <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600, background: 'var(--warning-light)', padding: '4px 12px', borderRadius: 6 }}>No study selected — records will be unassigned</span>;

  return (
    <div className="fade-in" style={{ maxWidth: 1000 }}>
      <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>AI CODING ENGINE</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Code Narrative</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => { setTab('single'); setErr(null); }} className={tab === 'single' ? '' : 'secondary'} style={{ fontSize: 13, padding: '7px 20px' }}>
            Single narrative
          </button>
          <button onClick={() => { setTab('batch'); setErr(null); }} className={tab === 'batch' ? '' : 'secondary'} style={{ fontSize: 13, padding: '7px 20px' }}>
            Batch upload
          </button>
        </div>
      </div>

      <ErrorBanner error={err} />

      {/* ── Single narrative tab ── */}
      {tab === 'single' && (
        <>
          <form className="card" onSubmit={onSubmit}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Medical narrative input</h3>
              {studyBadge}
            </div>
            <textarea
              style={{ minHeight: 140, fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Enter patient narrative here — e.g. 'patient reported severe nausea and headache after dosing'"
            />
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <span className="label">MedDRA version</span>
                <select value={version} onChange={e => setVersion(e.target.value)} style={{ minWidth: 160 }}>
                  <option value="">(Auto-select active)</option>
                  {versions.map(v => <option key={v.version_id} value={v.version_number}>{v.version_number}</option>)}
                </select>
              </div>
              <div>
                <span className="label">Entity type</span>
                <select value={entityType} onChange={e => setEntityType(e.target.value)} style={{ minWidth: 180 }}>
                  <option value="adverse_event">Adverse Event</option>
                  <option value="medical_history">Medical History</option>
                  <option value="concomitant_medication">Concomitant Medication</option>
                  <option value="procedure">Procedure</option>
                  <option value="indication">Indication</option>
                </select>
              </div>
              <div>
                <span className="label">Coder ID</span>
                <input value={coderId} onChange={e => setCoderId(e.target.value)} placeholder="Optional" style={{ minWidth: 140 }} />
              </div>
              <div style={{ display: 'flex', gap: 20, paddingBottom: 2 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 'auto', cursor: 'pointer' }} checked={isSae} onChange={e => setIsSae(e.target.checked)} />
                  <span>SAE <span className="muted">(locks + escalates)</span></span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 'auto', cursor: 'pointer' }} checked={persist} onChange={e => setPersist(e.target.checked)} />
                  <span>Persist records</span>
                </label>
              </div>
              <button type="submit" disabled={loading || !text.trim()} style={{ minWidth: 160, marginLeft: 'auto' }}>
                {loading ? 'Analysing…' : 'Run analysis'}
              </button>
            </div>
          </form>

          {result && (
            <div className="card fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0 }}>Results — {result.symptoms.length} symptom{result.symptoms.length !== 1 ? 's' : ''} detected</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {result.original_language && (
                    <span style={{ fontSize: 12, background: '#ede9fe', color: '#5b21b6', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
                      Translated from {result.original_language.toUpperCase()}
                    </span>
                  )}
                  {Object.keys(result.redactions).length > 0 && (
                    <span style={{ fontSize: 12, background: 'var(--warning-light)', color: '#92400e', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
                      {Object.entries(result.redactions).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(', ')} redacted
                    </span>
                  )}
                </div>
              </div>
              <div style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderLeft: '4px solid var(--slate-400)', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 14 }}>
                <span className="muted">Masked: </span>{result.masked_text}
              </div>
              <table>
                <thead>
                  <tr><th>Symptom</th><th>MedDRA PT</th><th>SOC</th><th>Confidence</th><th>Status</th><th>Score</th><th>LLM</th><th></th></tr>
                </thead>
                <tbody>
                  {result.symptoms.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{s.symptom_text}</td>
                      <td>
                        {s.pt_code
                          ? <><span className="mono">{s.pt_code}</span> <span style={{ fontWeight: 600 }}>{s.pt_name}</span></>
                          : <span className="muted">—</span>}
                      </td>
                      <td className="muted">{s.soc_code || '—'}</td>
                      <td><Pill value={s.confidence_level} /></td>
                      <td><Pill value={s.status} /></td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: s.cross_encoder_score > 0.5 ? 700 : 400, color: s.cross_encoder_score > 0.5 ? 'var(--success)' : 'var(--slate-700)' }}>
                          {s.cross_encoder_score?.toFixed(3) ?? '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: 16 }}>{s.llm_confirmed ? '✅' : <span className="muted">—</span>}</td>
                      <td>{s.record_id && <Link to={`/records/${s.record_id}`} style={{ fontSize: 13, fontWeight: 600 }}>Inspect →</Link>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Batch upload tab ── */}
      {tab === 'batch' && (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Upload file</h3>
              {studyBadge}
            </div>
            <p style={{ fontSize: 14, color: 'var(--slate-700)', marginBottom: 16, marginTop: 0 }}>
              Upload a <strong>CSV</strong> or <strong>Excel</strong> file. The first column (or a column named <code>narrative</code>, <code>text</code>, or <code>adverse_event</code>) is used as the narrative. Optional columns: <code>is_sae</code>, <code>coder_id</code>.
            </p>

            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]); }}
              onClick={() => inputRef.current.click()}
              style={{
                border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--slate-200)'}`,
                borderRadius: 10, padding: '40px 24px', textAlign: 'center',
                cursor: 'pointer', background: dragging ? 'var(--primary-light)' : 'var(--slate-50)',
                transition: 'all 0.15s', marginBottom: 20,
              }}>
              <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
                onChange={e => pickFile(e.target.files[0])} />
              {file ? (
                <div>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                  <div style={{ fontWeight: 700 }}>{file.name}</div>
                  <div className="muted">{(file.size / 1024).toFixed(1)} KB — click to change</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⬆️</div>
                  <div style={{ fontWeight: 600 }}>Drop a CSV or Excel file here</div>
                  <div className="muted">or click to browse</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={batchPersist} onChange={e => setBatchPersist(e.target.checked)} />
                Persist records
              </label>
              <button onClick={batchSubmit} disabled={!file || batchLoading} style={{ marginLeft: 'auto', minWidth: 160 }}>
                {batchLoading ? 'Processing…' : 'Run batch coding'}
              </button>
            </div>
          </div>

          {batchResult && (
            <div className="card fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px' }}>Results</h3>
                  <div className="muted">{batchResult.total_rows} rows processed · {batchResult.total_symptoms} symptoms coded</div>
                </div>
                <button className="secondary" onClick={downloadCsv}>⬇ Download CSV</button>
              </div>
              <div className="card flush" style={{ margin: 0 }}>
                <table>
                  <thead>
                    <tr><th>Row</th><th>Narrative</th><th>Symptom</th><th>PT</th><th>Confidence</th><th>Status</th><th>Score</th><th></th></tr>
                  </thead>
                  <tbody>
                    {batchResult.results.map((r, i) => (
                      <tr key={i}>
                        <td className="muted">{r.row}</td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{r.input_narrative}</td>
                        <td style={{ fontWeight: 500 }}>{r.symptom_text}</td>
                        <td>
                          {r.pt_code ? <><span className="mono">{r.pt_code}</span> <span style={{ fontWeight: 600 }}>{r.pt_name}</span></> : <span className="muted">—</span>}
                        </td>
                        <td><Pill value={r.confidence_level} /></td>
                        <td><Pill value={r.status} /></td>
                        <td><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{r.cross_encoder_score?.toFixed(3) ?? '—'}</span></td>
                        <td>{r.record_id && <Link to={`/records/${r.record_id}`} style={{ fontSize: 12, fontWeight: 600 }}>Inspect →</Link>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
