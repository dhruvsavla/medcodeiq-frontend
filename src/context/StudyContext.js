import { createContext, useContext, useState, useEffect } from 'react';

const StudyContext = createContext(null);

export function StudyProvider({ children }) {
  const [studies, setStudies] = useState([]);
  const [activeStudyId, setActiveStudyId] = useState(
    () => localStorage.getItem('medcodeiq_study_id') || null
  );

  const activeStudy = studies.find(s => s.study_id === activeStudyId) || null;

  const selectStudy = (id) => {
    setActiveStudyId(id);
    if (id) localStorage.setItem('medcodeiq_study_id', id);
    else localStorage.removeItem('medcodeiq_study_id');
  };

  useEffect(() => {
    import('../api').then(({ api }) => {
      api.listStudies().then(r => {
        setStudies(r.items);
        // If saved study no longer exists, clear it
        if (activeStudyId && !r.items.find(s => s.study_id === activeStudyId)) {
          selectStudy(null);
        }
      }).catch(() => {});
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <StudyContext.Provider value={{ studies, setStudies, activeStudyId, activeStudy, selectStudy }}>
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  return useContext(StudyContext);
}
