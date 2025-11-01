/**
 * Modern Auto-Login Page
 * Automatically logs in when 4-digit PIN is entered
 */

import React, { useState, useEffect } from 'react';
import './LoginPage.css';

const LoginPage = ({ onLogin, isLoading, error }) => {
  const [pin, setPin] = useState('');
  const [showError, setShowError] = useState(false);

  // Auto-login when 4 digits entered
  useEffect(() => {
    if (pin.length === 4 && !isLoading) {
      onLogin(pin);
      setPin(''); // Clear PIN after login attempt to prevent loop
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin.length]); // Only depend on pin length to avoid infinite loop

  const handleDigitClick = (digit) => {
    if (pin.length < 4) {
      setPin(pin + digit);
      setShowError(false);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const dialPadButtons = [
    { num: '1', label: '' },
    { num: '2', label: 'ABC' },
    { num: '3', label: 'DEF' },
    { num: '4', label: 'GHI' },
    { num: '5', label: 'JKL' },
    { num: '6', label: 'MNO' },
    { num: '7', label: 'PQRS' },
    { num: '8', label: 'TUV' },
    { num: '9', label: 'WXYZ' },
    { num: '*', label: '' },
    { num: '0', label: '' },
    { num: '#', label: '' },
  ];

  return (
    <div className="login-container">
      {/* Background Animation */}
      <div className="login-background">
        <div className="login-blob login-blob-1"></div>
        <div className="login-blob login-blob-2"></div>
        <div className="login-blob login-blob-3"></div>
      </div>

      {/* Main Card */}
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo-container">
            <div className="login-logo">🧹</div>
          </div>
          <h1 className="login-title">Cleanup Tracker</h1>
          <p className="login-subtitle">Professional Detailing Management</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="login-error">
            <span className="login-error-icon">⚠️</span>
            <span className="login-error-text">{error}</span>
          </div>
        )}

        {/* PIN Display */}
        <div className="login-pin-display">
          <div className="login-pin-input">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`login-pin-dot ${pin.length > index ? 'filled' : ''}`}
              >
                {pin.length > index ? '●' : '◯'}
              </div>
            ))}
          </div>
          <p className="login-pin-label">
            {isLoading ? 'Signing in...' : `Enter your 4-digit PIN`}
          </p>
        </div>

        {/* Dial Pad */}
        <div className="login-dialpad">
          {dialPadButtons.map((btn) => (
            <button
              key={btn.num}
              className="login-dialpad-btn"
              onClick={() => handleDigitClick(btn.num)}
              disabled={isLoading}
            >
              <span className="login-dialpad-num">{btn.num}</span>
              {btn.label && <span className="login-dialpad-label">{btn.label}</span>}
            </button>
          ))}
        </div>

        {/* Control Buttons */}
        <div className="login-controls">
          <button
            type="button"
            onClick={handleBackspace}
            className="login-control-btn login-control-backspace"
            disabled={isLoading || pin.length === 0}
            title="Delete last digit"
          >
            <span>⌫</span>
            <span className="login-control-label">Delete</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="login-control-btn login-control-clear"
            disabled={isLoading || pin.length === 0}
            title="Clear all"
          >
            <span>⊗</span>
            <span className="login-control-label">Clear</span>
          </button>
        </div>

        {/* Demo Credentials */}
        <div className="login-footer">
          <p className="login-footer-title">Demo PINs</p>
          <div className="login-demo-grid">
            <div className="login-demo-card" onClick={() => setPin('1701')}>
              <div className="login-demo-role">Manager</div>
              <div className="login-demo-pin">1701</div>
            </div>
            <div className="login-demo-card" onClick={() => setPin('1709')}>
              <div className="login-demo-role">Detailer</div>
              <div className="login-demo-pin">1709</div>
            </div>
          </div>
          <p className="login-hint">
            💡 Just enter 4 digits - auto-login!
          </p>
        </div>

        {/* Footer Text */}
        <p className="login-copyright">© 2025 Cleanup Tracker. All rights reserved.</p>
      </div>
    </div>
  );
};

export default LoginPage;
