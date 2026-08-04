import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PersonTable from './components/PersonTable';
import PersonDetail from './components/PersonDetail';
import PersonForm from './components/PersonForm';
import GraphView from './components/GraphView';
import AncestryView from './components/AncestryView';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<PersonTable />} />
        <Route path="/persons/new" element={<PersonForm />} />
        <Route path="/persons/:id" element={<PersonDetail />} />
        <Route path="/persons/:id/edit" element={<PersonForm />} />
        <Route path="/graph" element={<GraphView />} />
        <Route path="/graph/:id" element={<AncestryView />} />
      </Routes>
    </Layout>
  );
}

export default App;
