import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import './styles/animations.css';
import './styles/modern-responsive.css';
import './styles/compact-improvements.css';
import './styles/premium.css';
import './App.css';
import App from './App';

// Allow runtime override of API base URL (useful when server port is chosen dynamically)
if (process.env.REACT_APP_API_URL) {
  axios.defaults.baseURL = process.env.REACT_APP_API_URL;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
