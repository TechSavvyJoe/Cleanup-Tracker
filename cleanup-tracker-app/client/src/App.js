import React from 'react';
import FirebaseV2 from './pages/FirebaseV2';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="App">
          <FirebaseV2 />
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
