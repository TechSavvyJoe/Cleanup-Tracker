import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';

import rootReducer from './reducers';
import { setCurrentUser, logoutUser } from './actions/authActions';
import setAuthToken from './utils/setAuthToken';
import jwt_decode from 'jwt-decode';

import FirebaseV2 from './pages/FirebaseV2';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './pages/Dashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import DetailerPage from './pages/DetailerPage';
import PrivateRoute from './components/private-route/PrivateRoute';
import Navbar from './components/layout/Navbar';
import Landing from './components/layout/Landing';

import './App.css';

const initialState = {};
const middleware = [thunk];
const store = createStore(
  rootReducer,
  initialState,
  compose(
    applyMiddleware(...middleware),
    typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__ 
      ? window.__REDUX_DEVTOOLS_EXTENSION__() 
      : f => f
  )
);

// Check for token to keep user logged in
if (localStorage.jwtToken) {
  const token = localStorage.jwtToken;
  setAuthToken(token);
  const decoded = jwt_decode(token);
  store.dispatch(setCurrentUser(decoded));
  const currentTime = Date.now() / 1000;
  if (decoded.exp < currentTime) {
    store.dispatch(logoutUser());
    window.location.href = './login';
  }
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="App">
          <Navbar />
          <Switch>
            {/* Default to the V2 interface */}
            <Route exact path="/" component={FirebaseV2} />
            {/* Optional: keep legacy landing available */}
            <Route exact path="/legacy" component={Landing} />
            <Route exact path="/register" component={Register} />
            <Route exact path="/login" component={Login} />
            <Route exact path="/v2" component={FirebaseV2} />
            <PrivateRoute exact path="/dashboard" component={Dashboard} />
            <PrivateRoute exact path="/manager" component={ManagerDashboard} />
            <PrivateRoute exact path="/detailer" component={DetailerPage} />
          </Switch>
        </div>
      </Router>
    </Provider>
  );
}

export default App;
