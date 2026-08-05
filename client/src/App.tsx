import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import PersonTable from './components/PersonTable';
import PersonDetail from './components/PersonDetail';
import PersonForm from './components/PersonForm';
import GraphView from './components/GraphView';
import AncestryView from './components/AncestryView';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import UserManagement from './components/UserManagement';

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<PersonTable />} />
          <Route path="/persons/new" element={<PersonForm />} />
          <Route path="/persons/:id" element={<PersonDetail />} />
          <Route path="/persons/:id/edit" element={<PersonForm />} />
          <Route path="/graph" element={<GraphView />} />
          <Route path="/graph/:id" element={<AncestryView />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin/users" element={<UserManagement />} />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}

export default App;
