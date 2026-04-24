import { useEffect, useState } from 'react';
import { api } from '../api';
import { useStudy } from '../context/StudyContext';
import ErrorBanner from '../components/ErrorBanner';

const PHASES = ['Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Observational', 'Other'];
const STATUSES = ['active', 'completed', 'archived'];

const EMPTY = { name: '', protocol_number: '', sponsor: '', phase: '', indication: '', status: 'active', conf_high_threshold: '', conf_medium_threshold: '', conf_low_threshold: '', conf_tie_margin: '' };

export default function Studies() {
  const { studies, setStudies, activeStudyId, selectStudy } = useStudy();
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.listStudies().then(r => setStudies(r.items)).catch(setErr);
  }, [setStudies]);

  const startEdit = (s) => { setEditing(s.study_id); setForm({ name: s.name, protocol_number: s.protocol_number || '', sponsor: s.sponsor || '', phase: s.phase || '', indication: s.indication || '', status: s.status, conf_high_threshold: s.conf_high_threshold ?? '', conf_medium_threshold: s.conf_medium_threshold ?? '', conf_low_threshold: s.conf_low_threshold ?? '', conf_tie_margin: s.conf_tie_margin ?? '' }); setSaved(false); };
  const startNew = () => { setEditing('new'); setForm(EMPTY); setSaved(false); };
  const cancel = () => { setEditing(null); setForm(EMPTY); };

  const toPayload = (f) => ({
    ...f,
    conf_high_threshold:   f.conf_high_threshold   !== '' ? parseFloat(f.conf_high_threshold)   : null,
    conf_medium_threshold: f.conf_medium_threshold !== '' ? parseFloat(f.conf_medium_threshold) : null,
    conf_low_threshold:    f.conf_low_threshold    !== '' ? parseFloat(f.conf_low_threshold)    : null,
    conf_tie_margin:       f.conf_tie_margin       !== '' ? parseFloat(f.conf_tie_margin)       : null,
  });

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true); setErr(null); setSaved(false);
    try {
      if (editing === 'new') {
        const s = await api.createStudy(toPayload(form));
        setStudies(prev => [s, ...prev]);
        selectStudy(s.study_id);
      } else {
        const s = await api.updateStudy(editing, toPayload(form));
        setStudies(prev => prev.map(x => x.study_id === editing ? s : x));
      }
      setSaved(true); setEditing(null);
    } catch (e) { setErr(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 900 }}>
      <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>STUDY MANAGEMENT</div>
      <div className="section-header">
        <h2 style={{ margin: 0 }}>Studies</h2>
        <button onClick={startNew}>+ New study</button>
      </div>

      <ErrorBanner error={err} />
      {saved && <div className="ok">Study saved.</div>}

      {editing && (
        <div className="card">
          <h3>{editing === 'new' ? 'Create study' : 'Edit study'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              ['Study name *', 'name', 'text', 'e.g. TRIAL-2024-001'],
              ['Protocol number', 'protocol_number', 'text', 'e.g. PROT-001'],
              ['Sponsor', 'sponsor', 'text', 'e.g. Acme Pharma'],
            ].map(([label, key, , placeholder]) => (
              <div key={key}>
                <span className="label">{label}</span>
                <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
              </div>
            ))}
            <div>
              <span className="label">Phase</span>
              <select value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))}>
                <option value="">— select —</option>
                {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <span className="label">Status</span>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <span className="label">Indication</span>
              <input value={form.indication} onChange={e => setForm(f => ({ ...f, indication: e.target.value }))} placeholder="e.g. Type 2 Diabetes" />
            </div>
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--slate-100)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--slate-400)', marginBottom: 12 }}>
              Confidence thresholds <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(leave blank to use global defaults)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              {[
                ['HIGH threshold', 'conf_high_threshold', '0.40'],
                ['MEDIUM threshold', 'conf_medium_threshold', '0.20'],
                ['LOW threshold', 'conf_low_threshold', '0.08'],
                ['Tie margin', 'conf_tie_margin', '0.03'],
              ].map(([label, key, placeholder]) => (
                <div key={key}>
                  <span className="label">{label}</span>
                  <input type="number" step="0.01" min="0" max="1" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={`default ${placeholder}`} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={save} disabled={saving || !form.name.trim()}>{saving ? 'Saving…' : 'Save'}</button>
            <button className="secondary" onClick={cancel}>Cancel</button>
          </div>
        </div>
      )}

      {studies.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--slate-400)' }}>
          No studies yet. Create one to start isolating records by trial.
        </div>
      ) : (
        <div className="card flush">
          <table>
            <thead>
              <tr><th>Name</th><th>Protocol</th><th>Sponsor</th><th>Phase</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {studies.map(s => (
                <tr key={s.study_id} style={{ background: activeStudyId === s.study_id ? 'var(--primary-light)' : undefined }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    {activeStudyId === s.study_id && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Active</span>}
                  </td>
                  <td className="muted">{s.protocol_number || '—'}</td>
                  <td className="muted">{s.sponsor || '—'}</td>
                  <td className="muted">{s.phase || '—'}</td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                      background: s.status === 'active' ? 'var(--success-light)' : s.status === 'archived' ? 'var(--slate-100)' : 'var(--info-light)',
                      color: s.status === 'active' ? '#065f46' : s.status === 'archived' ? 'var(--slate-700)' : '#1e40af',
                    }}>{s.status}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => startEdit(s)}>Edit</button>
                      {activeStudyId === s.study_id
                        ? <button className="secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => selectStudy(null)}>Deselect</button>
                        : <button style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => selectStudy(s.study_id)}>Select</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
