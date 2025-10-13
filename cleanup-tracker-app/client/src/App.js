import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import FirebaseV2 from './pages/FirebaseV2';

import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="*" element={<FirebaseV2 />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
