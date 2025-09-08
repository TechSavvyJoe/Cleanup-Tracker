import React from 'react';
import { HashRouter as Router, Route } from 'react-router-dom';
import FirebaseV2 from './pages/FirebaseV2';

import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Route exact path={["/", "/v2"]} component={FirebaseV2} />
      </div>
    </Router>
  );
}

export default App;
