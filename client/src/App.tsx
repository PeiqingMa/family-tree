import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import PersonTable from './components/PersonTable';
import PersonDetail from './components/PersonDetail';
import PersonForm from './components/PersonForm';
import GraphView from './components/GraphView';
import AncestryView from './components/AncestryView';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import UserManagement from './components/UserManagement';
import ChangePassword from './components/ChangePassword';
import ProtectedRoute from './components/ProtectedRoute';

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <div className="loading">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<PersonTable />} />
        <Route
          path="/persons/new"
          element={
            <ProtectedRoute>
              <PersonForm />
            </ProtectedRoute>
          }
        />
        <Route path="/persons/:id" element={<PersonDetail />} />
        <Route
          path="/persons/:id/edit"
          element={
            <ProtectedRoute>
              <PersonForm />
            </ProtectedRoute>
          }
        />
        <Route path="/graph" element={<GraphView />} />
        <Route path="/graph/:id" element={<AncestryView />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireAdmin>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
