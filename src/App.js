import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import { StudyProvider, useStudy } from './context/StudyContext';
import CodePage from './pages/CodePage';
import ReviewQueue from './pages/ReviewQueue';
import RecordDetail from './pages/RecordDetail';
import SmqExplorer from './pages/SmqExplorer';
import VersionShifts from './pages/VersionShifts';
import AuditViewer from './pages/AuditViewer';
import Dashboard from './pages/Dashboard';
import Studies from './pages/Studies';

function StudyBadge() {
  const { activeStudy, selectStudy } = useStudy();
  if (!activeStudy) return null;
  return (
    <div style={{ margin: '0 16px 16px', padding: '8px 12px', background: 'rgba(79,70,229,0.15)', borderRadius: 8, fontSize: 12 }}>
      <div style={{ color: 'var(--slate-400)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Active study</div>
      <div style={{ color: 'white', fontWeight: 600, marginBottom: 4 }}>{activeStudy.name}</div>
      <button onClick={() => selectStudy(null)} style={{ fontSize: 10, padding: '2px 8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--slate-400)', borderRadius: 4 }}>
        Clear
      </button>
    </div>
  );
}

function AppInner() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>MedCodeIQ</h1>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/code">Code narrative</NavLink>
          <NavLink to="/review">Review queue</NavLink>
          <NavLink to="/smq">SMQ explorer</NavLink>
          <NavLink to="/shifts">Version shifts</NavLink>
          <NavLink to="/audit">Audit log</NavLink>
          <NavLink to="/studies">Studies</NavLink>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <StudyBadge />
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/code" element={<CodePage />} />
          <Route path="/batch" element={<Navigate to="/code" replace />} />
          <Route path="/review" element={<ReviewQueue />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/smq" element={<SmqExplorer />} />
          <Route path="/shifts" element={<VersionShifts />} />
          <Route path="/audit" element={<AuditViewer />} />
          <Route path="/studies" element={<Studies />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <StudyProvider>
      <AppInner />
    </StudyProvider>
  );
}

export default App;
