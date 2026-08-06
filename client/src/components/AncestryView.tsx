import GraphView from './GraphView';

// AncestryView is now a thin wrapper around GraphView.
// The /graph/:id route renders GraphView which reads the :id param
// and pre-selects/highlights that person.
function AncestryView() {
  return <GraphView />;
}

export default AncestryView;
