import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import SpecialEditorPage from './pages/SpecialEditorPage.jsx';
import PreviewPage from './pages/PreviewPage.jsx';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/specials/new" element={<SpecialEditorPage />} />
          <Route path="/specials/:id/edit" element={<SpecialEditorPage />} />
          <Route path="/preview" element={<PreviewPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
