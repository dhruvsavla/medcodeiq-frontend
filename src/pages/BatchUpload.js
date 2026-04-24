import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useStudy } from '../context/StudyContext';
import Pill from '../components/Pill';
import ErrorBanner from '../components/ErrorBanner';

export default function BatchUpload() {
  const { activeStudy, activeStudyId } = useStudy();
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [persist, setPersist] = useState(true);
  const inputRef = useRef();

  const pickFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) { setErr(new Error('Only CSV and Excel files are supported.')); return; }
    setFile(f); setErr(null); setResult(null);
  };

  const onDrop = (e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]); };

  const submit = async () => {
    if (!file) return;
    setLoading(true); setErr(null); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('persist', persist ? 'true' : 'false');
      if (activeStudyId) fd.append('study_id', activeStudyId);
      const r = await api.batchUpload(fd);
      setResult(r);
    } catch (e) { setErr(e); }
    finally { setLoading(false); }
  };

  const downloadCsv = () => {
    if (!result) return;
    const fields = ['row', 'input_narrative', 'symptom_text', 'pt_code', 'pt_name', 'soc_code', 'confidence_level', 'status', 'cross_encoder_score', 'llm_confirmed', 'record_id'];
    const lines = [fields.join(',')];
    for (const r of result.results) {
      lines.push(fields.map(f => JSON.stringify(r[f] ?? '')).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'coded_results.csv'; a.click();
  };

  return (
    <div className="fade-in" style={{ maxWidth: 1100 }}>
      <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>BATCH CODING</div>
      <h2>Batch Upload</h2>

      <ErrorBanner error={err} />

      <div className="card">
        <h3>Upload file</h3>
        <p style={{ fontSize: 14, color: 'var(--slate-700)', marginBottom: 16 }}>
          Upload a <strong>CSV</strong> or <strong>Excel</strong> file. The first column (or a column named <code>narrative</code>, <code>text</code>, or <code>adverse_event</code>) is used as the narrative. Optional columns: <code>is_sae</code>, <code>coder_id</code>.
        </p>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
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
          {activeStudy && (
            <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, background: 'var(--primary-light)', padding: '6px 12px', borderRadius: 6 }}>
              Study: {activeStudy.name}
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={persist} onChange={e => setPersist(e.target.checked)} />
            Persist records
          </label>
          <button onClick={submit} disabled={!file || loading} style={{ marginLeft: 'auto', minWidth: 160 }}>
            {loading ? 'Processing…' : 'Run batch coding'}
          </button>
        </div>
      </div>

      {result && (
        <div className="card fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: '0 0 4px' }}>Results</h3>
              <div className="muted">{result.total_rows} rows processed · {result.total_symptoms} symptoms coded</div>
            </div>
            <button className="secondary" onClick={downloadCsv}>⬇ Download CSV</button>
          </div>

          <div className="card flush" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr><th>Row</th><th>Narrative</th><th>Symptom</th><th>PT</th><th>Confidence</th><th>Status</th><th>Score</th><th></th></tr>
              </thead>
              <tbody>
                {result.results.map((r, i) => (
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
    </div>
  );
}
