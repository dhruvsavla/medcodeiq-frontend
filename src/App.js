import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import CodePage from './pages/CodePage';
import ReviewQueue from './pages/ReviewQueue';
import RecordDetail from './pages/RecordDetail';
import SmqExplorer from './pages/SmqExplorer';
import VersionShifts from './pages/VersionShifts';
import AuditViewer from './pages/AuditViewer';
import Dashboard from './pages/Dashboard';

function App() {
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
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/code" element={<CodePage />} />
          <Route path="/review" element={<ReviewQueue />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/smq" element={<SmqExplorer />} />
          <Route path="/shifts" element={<VersionShifts />} />
          <Route path="/audit" element={<AuditViewer />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
