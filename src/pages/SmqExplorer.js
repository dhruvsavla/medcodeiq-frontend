import { useEffect, useState } from 'react';
import { api } from '../api';
import ErrorBanner from '../components/ErrorBanner';
import Pill from '../components/Pill';

export default function SmqExplorer() {
  const [smqs, setSmqs] = useState([]);
  const [selected, setSelected] = useState('');
  const [scope, setScope] = useState('narrow');
  const [members, setMembers] = useState(null);
  const [matches, setMatches] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => { api.listSmqs().then(r => setSmqs(r.items)).catch(setErr); }, []);

  const load = (name) => {
    setSelected(name); setErr(null);
    Promise.all([
      api.smqMembers(name, { scope }),
      api.smqMatches(name, { scope }),
    ]).then(([m, x]) => { setMembers(m); setMatches(x); }).catch(setErr);
  };

  useEffect(() => { if (selected) load(selected); /* eslint-disable-next-line */ }, [scope]);

  return (
    <div>
      <h2>SMQ explorer</h2>
      <ErrorBanner error={err} />
      <div className="row">
        <div className="card" style={{ maxWidth: 320 }}>
          <h3>SMQs</h3>
          <label style={{ display: 'block', marginBottom: 8 }}>Scope
            <select value={scope} onChange={e => setScope(e.target.value)}>
              <option value="narrow">narrow</option>
              <option value="broad">broad</option>
            </select>
          </label>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {smqs.map(s => (
              <li key={s.smq_id} style={{ padding: '6px 0', cursor: 'pointer' }}
                  onClick={() => load(s.smq_name)}>
                <b style={{ color: selected === s.smq_name ? '#2b6cb0' : 'inherit' }}>{s.smq_name}</b>
                <div className="muted">narrow: {s.pt_codes_narrow.length} · broad: {s.pt_codes_broad.length}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="card" style={{ flex: 2 }}>
          {!selected && <div className="muted">Pick an SMQ from the left.</div>}
          {selected && (
            <>
              <h3>{selected} — members ({scope})</h3>
              {members?.members.length === 0 && <div className="muted">No members.</div>}
              {members?.members.length > 0 && (
                <table><thead><tr><th>PT code</th><th>PT name</th></tr></thead>
                  <tbody>{members.members.map(m => (
                    <tr key={m.pt_code}><td className="mono">{m.pt_code}</td><td>{m.pt_name}</td></tr>
                  ))}</tbody>
                </table>
              )}
              <h3 style={{ marginTop: 16 }}>Matching coded records</h3>
              {matches?.records.length === 0 && <div className="muted">No records in this cohort.</div>}
              {matches?.records.length > 0 && (
                <table><thead><tr><th>Record</th><th>PT</th><th>Conf</th><th>Status</th></tr></thead>
                  <tbody>{matches.records.map(r => (
                    <tr key={r.record_id}>
                      <td className="mono">{r.record_id.slice(0, 8)}</td>
                      <td><span className="mono">{r.pt_code}</span> {r.pt_name}</td>
                      <td><Pill value={r.confidence_level} /></td>
                      <td><Pill value={r.status} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
