import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useStudy } from '../context/StudyContext';
import Pill from '../components/Pill';
import ErrorBanner from '../components/ErrorBanner';

const STATUS_OPTIONS  = ['', 'auto', 'spot_check', 'review', 'escalated', 'approved', 'overridden'];
const CONF_OPTIONS    = ['', 'HIGH', 'MEDIUM', 'LOW', 'CONFLICT'];
const ENTITY_OPTIONS  = ['', 'adverse_event', 'medical_history', 'concomitant_medication', 'procedure', 'indication'];
const ENTITY_LABELS   = { adverse_event: 'Adverse Event', medical_history: 'Medical History', concomitant_medication: 'Conmed', procedure: 'Procedure', indication: 'Indication' };

export default function ReviewQueue() {
  const { studies, activeStudyId } = useStudy();
  const [status, setStatus]       = useState('');
  const [conf, setConf]           = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [studyFilter, setStudyFilter]   = useState(() => activeStudyId || '');
  const [data, setData]       = useState({ total: 0, items: [] });
  const [err, setErr]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setErr(null);
    api.listRecords({ status: status || undefined, confidence_level: conf || undefined, study_id: studyFilter || undefined, entity_type: entityFilter || undefined, limit: 200 })
      .then(setData).catch(setErr).finally(() => setLoading(false));
  }, [status, conf, studyFilter, entityFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(prev => prev.size === data.items.length ? new Set() : new Set(data.items.map(r => r.record_id)));

  const exportE2B = async () => {
    setExporting(true);
    try {
      const ids = selected.size > 0 ? [...selected] : data.items.map(r => r.record_id);
      const res = await fetch(`${process.env.REACT_APP_API_BASE || 'http://localhost:8000/api/v1'}/records/e2b-export`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_ids: ids }),
      });
      const xml = await res.blob();
      const a = document.createElement('a'); a.href = URL.createObjectURL(xml);
      a.download = 'e2b_export.xml'; a.click();
    } catch (e) { setErr(e); }
    finally { setExporting(false); }
  };

  const needsAction = data.items.filter(r => ['review', 'escalated'].includes(r.status)).length;

  return (
    <div className="fade-in" style={{ maxWidth: 1200 }}>
      <div className="section-header">
        <div>
          <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>CODING REVIEW</div>
          <h2 style={{ margin: 0 }}>Review Queue</h2>
        </div>
        {needsAction > 0 && (
          <div style={{ background: 'var(--warning-light)', color: '#92400e', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
            {needsAction} record{needsAction > 1 ? 's' : ''} need attention
          </div>
        )}
      </div>

      <ErrorBanner error={err} />

      <div className="card flush">
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--slate-100)', background: 'var(--slate-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div className="filters" style={{ margin: 0 }}>
            <label>Study
              <select value={studyFilter} onChange={e => setStudyFilter(e.target.value)}>
                <option value="">All studies</option>
                <option value="__none__" disabled style={{ color: 'var(--slate-400)' }}>──────────</option>
                {studies.map(s => <option key={s.study_id} value={s.study_id}>{s.name}</option>)}
              </select>
            </label>
            <label>Status
              <select value={status} onChange={e => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
              </select>
            </label>
            <label>Confidence
              <select value={conf} onChange={e => setConf(e.target.value)}>
                {CONF_OPTIONS.map(c => <option key={c} value={c}>{c || 'All confidence'}</option>)}
              </select>
            </label>
            <label>Entity type
              <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
                {ENTITY_OPTIONS.map(e => <option key={e} value={e}>{e ? ENTITY_LABELS[e] : 'All types'}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="muted">{data.total} total</span>
            {selected.size > 0 && <span className="muted">{selected.size} selected</span>}
            <button className="secondary" onClick={exportE2B} disabled={exporting} style={{ fontSize: 13 }}>
              {exporting ? 'Exporting…' : `⬇ E2B Export${selected.size > 0 ? ` (${selected.size})` : ' (all)'}`}
            </button>
            <button className="secondary" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
          </div>
        </div>

        {data.items.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--slate-400)' }}>
            No records match the current filters.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" style={{ width: 'auto', cursor: 'pointer' }}
                    checked={selected.size === data.items.length && data.items.length > 0}
                    onChange={toggleAll} />
                </th>
                <th>Record ID</th>
                <th>Coded at</th>
                <th>Narrative</th>
                <th>Preferred Term</th>
                <th>Type</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>SAE</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(r => (
                <tr key={r.record_id} style={{ background: selected.has(r.record_id) ? 'var(--primary-light)' : undefined }}>
                  <td>
                    <input type="checkbox" style={{ width: 'auto', cursor: 'pointer' }}
                      checked={selected.has(r.record_id)} onChange={() => toggleSelect(r.record_id)} />
                  </td>
                  <td>
                    <Link to={`/records/${r.record_id}`} className="mono">{r.record_id.slice(0, 8)}</Link>
                  </td>
                  <td className="muted">{new Date(r.coded_at).toLocaleString()}</td>
                  <td style={{ maxWidth: 300 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300, fontSize: 14 }}>
                      {r.input_text_masked}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.pt_name || <span className="muted">—</span>}</div>
                    {r.pt_code && <span className="mono">{r.pt_code}</span>}
                  </td>
                  <td><span className="muted" style={{ fontSize: 12 }}>{ENTITY_LABELS[r.entity_type] || r.entity_type || 'AE'}</span></td>
                  <td><Pill value={r.confidence_level} /></td>
                  <td><Pill value={r.status} /></td>
                  <td>{r.is_sae && <span style={{ fontSize: 16 }}>🔒</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
