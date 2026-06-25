import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ArchivePage from './pages/ArchivePage';
import VotePage from './pages/VotePage';
import ResultPage from './pages/ResultPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ArchivePage />} />
        <Route path="/vote" element={<VotePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
    </Routes>
  );
}

export default App;
