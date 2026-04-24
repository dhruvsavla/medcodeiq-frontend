import { useEffect, useState } from 'react';
import { api } from '../api';
import ErrorBanner from '../components/ErrorBanner';
import Pill from '../components/Pill';

const REPORT_TYPES = [
  { value: 'psur', label: 'PSUR Signal', desc: 'Signal detection summary for Periodic Safety Update Reports' },
  { value: 'dsmb', label: 'DSMB Listing', desc: 'High/medium confidence cases for Data Safety Monitoring Board' },
  { value: 'iss',  label: 'ISS/ISE',     desc: 'Pooled analysis across studies for Integrated Safety Summary' },
];

export default function SmqExplorer() {
  const [smqs, setSmqs]             = useState([]);
  const [selected, setSelected]     = useState(null);
  const [scope, setScope]           = useState('narrow');
  const [tab, setTab]               = useState('explore');  // 'explore' | 'report'
  const [reportType, setReportType] = useState('psur');
  const [members, setMembers]       = useState(null);
  const [matches, setMatches]       = useState(null);
  const [report, setReport]         = useState(null);
  const [err, setErr]               = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => { api.listSmqs().then(r => setSmqs(r.items)).catch(setErr); }, []);

  const load = (smq) => {
    setSelected(smq); setErr(null); setReport(null);
    Promise.all([
      api.smqMembers(smq.smq_name, { scope }),
      api.smqMatches(smq.smq_name, { scope }),
    ]).then(([m, x]) => { setMembers(m); setMatches(x); }).catch(setErr);
  };

  const generateReport = () => {
    if (!selected) return;
    setReportLoading(true); setErr(null);
    api.smqReport(selected.smq_name, { scope, report_type: reportType })
      .then(setReport).catch(setErr).finally(() => setReportLoading(false));
  };

  useEffect(() => { if (selected) load(selected); /* eslint-disable-next-line */ }, [scope]);

  return (
    <div className="fade-in" style={{ maxWidth: 1200 }}>
      <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>PHARMACOVIGILANCE</div>
      <h2>SMQ Explorer</h2>
      <ErrorBanner error={err} />

      <div className="row" style={{ alignItems: 'flex-start' }}>
        {/* SMQ list */}
        <div style={{ flex: '0 0 280px', minWidth: 0 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
              <h3 style={{ margin: '0 0 10px' }}>Scope</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                {['narrow', 'broad'].map(s => (
                  <button key={s} onClick={() => setScope(s)}
                    className={scope === s ? '' : 'secondary'}
                    style={{ flex: 1, padding: '7px', fontSize: 13 }}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {smqs.map(smq => (
              <div key={smq.smq_id}
                onClick={() => load(smq)}
                style={{
                  padding: '14px 20px', cursor: 'pointer',
                  borderBottom: '1px solid var(--slate-100)',
                  borderLeft: `3px solid ${selected?.smq_id === smq.smq_id ? 'var(--primary)' : 'transparent'}`,
                  background: selected?.smq_id === smq.smq_id ? 'var(--primary-light)' : 'white',
                  transition: 'all 0.15s',
                }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{smq.smq_name}</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span className="muted">narrow: {smq.pt_codes_narrow.length}</span>
                  <span className="muted">broad: {smq.pt_codes_broad.length}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected ? (
            <div className="card" style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--slate-400)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <div style={{ fontWeight: 600 }}>Select an SMQ to explore</div>
              <div className="muted" style={{ marginTop: 4 }}>Browse member terms and matching coded records</div>
            </div>
          ) : (
            <>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px' }}>SMQ</h3>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{selected.smq_name}</div>
                  </div>
                  <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                    {scope}
                  </span>
                </div>
                {selected.description && (
                  <div style={{ padding: '12px 16px', background: 'var(--slate-50)', borderRadius: 8, fontSize: 14, color: 'var(--slate-700)', lineHeight: 1.6 }}>
                    {selected.description}
                  </div>
                )}
                {/* Tab switcher */}
                <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
                  {['explore', 'report'].map(t => (
                    <button key={t} onClick={() => setTab(t)} className={tab === t ? '' : 'secondary'} style={{ fontSize: 13, padding: '6px 16px' }}>
                      {t === 'explore' ? 'Explore' : 'Reports'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Report generation panel */}
              {tab === 'report' && (
                <div className="card">
                  <h3>Generate regulatory report</h3>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    {REPORT_TYPES.map(rt => (
                      <div key={rt.value} onClick={() => setReportType(rt.value)} style={{ flex: 1, minWidth: 140, border: `2px solid ${reportType === rt.value ? 'var(--primary)' : 'var(--slate-200)'}`, borderRadius: 8, padding: '12px 16px', cursor: 'pointer', background: reportType === rt.value ? 'var(--primary-light)' : 'white' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: reportType === rt.value ? 'var(--primary)' : 'var(--slate-800)' }}>{rt.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>{rt.desc}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={generateReport} disabled={reportLoading} style={{ minWidth: 160 }}>
                    {reportLoading ? 'Generating…' : 'Generate report'}
                  </button>

                  {report && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{REPORT_TYPES.find(r => r.value === report.report_type)?.label} — {report.smq_name}</div>
                          <div className="muted" style={{ fontSize: 12 }}>{report.total_cases} total cases · Generated {new Date(report.generated_at).toLocaleString()}</div>
                        </div>
                      </div>
                      {report.rows.length === 0 ? (
                        <div style={{ color: 'var(--slate-400)', padding: '24px 0', textAlign: 'center' }}>No cases match this report criteria.</div>
                      ) : (
                        <table>
                          <thead>
                            <tr>
                              <th>PT Code</th><th>Preferred Term</th><th>Cases</th>
                              <th>HIGH</th><th>MED</th><th>LOW</th><th>CONFLICT</th>
                              <th>Auto</th><th>Review</th><th>Escalated</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.rows.map(r => (
                              <tr key={r.pt_code}>
                                <td><span className="mono">{r.pt_code}</span></td>
                                <td style={{ fontWeight: 500 }}>{r.pt_name}</td>
                                <td><span style={{ fontWeight: 700 }}>{r.case_count}</span></td>
                                <td style={{ color: '#065f46', fontWeight: r.high_count > 0 ? 700 : 400 }}>{r.high_count || '—'}</td>
                                <td style={{ color: '#92400e' }}>{r.medium_count || '—'}</td>
                                <td style={{ color: '#991b1b' }}>{r.low_count || '—'}</td>
                                <td style={{ color: '#5b21b6' }}>{r.conflict_count || '—'}</td>
                                <td>{r.auto_count || '—'}</td>
                                <td>{r.review_count || '—'}</td>
                                <td>{r.escalated_count || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )}

              {tab === 'explore' && (
              <>
              <div className="card flush">
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--slate-100)', background: 'var(--slate-50)' }}>
                  <h3 style={{ margin: 0 }}>Member terms ({members?.members.length || 0})</h3>
                </div>
                {members?.members.length === 0 ? (
                  <div style={{ padding: 24, color: 'var(--slate-400)' }}>No member terms for this scope.</div>
                ) : (
                  <table>
                    <thead><tr><th>PT Code</th><th>Preferred Term</th></tr></thead>
                    <tbody>
                      {(members?.members || []).map(m => (
                        <tr key={m.pt_code}>
                          <td><span className="mono">{m.pt_code}</span></td>
                          <td style={{ fontWeight: 500 }}>{m.pt_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="card flush">
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--slate-100)', background: 'var(--slate-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Matching coded records ({matches?.records.length || 0})</h3>
                  {matches?.records.length > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>Signal detected</span>
                  )}
                </div>
                {matches?.records.length === 0 ? (
                  <div style={{ padding: 24, color: 'var(--slate-400)' }}>No records in this cohort yet.</div>
                ) : (
                  <table>
                    <thead><tr><th>Record</th><th>PT</th><th>Confidence</th><th>Status</th></tr></thead>
                    <tbody>
                      {(matches?.records || []).map(r => (
                        <tr key={r.record_id}>
                          <td><span className="mono">{r.record_id.slice(0, 8)}</span></td>
                          <td><span className="mono">{r.pt_code}</span> <span className="muted">{r.pt_name}</span></td>
                          <td><Pill value={r.confidence_level} /></td>
                          <td><Pill value={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
