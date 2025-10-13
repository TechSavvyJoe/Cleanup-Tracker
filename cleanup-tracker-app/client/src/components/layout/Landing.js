import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
    return (
        <div className="container" style={{ textAlign: 'center', padding: '2rem' }}>
            <h1>Welcome to the Cleanup Tracker</h1>
            <p>Please login to continue.</p>
            <div style={{ margin: '2rem 0' }}>
                <Link to="/v2" style={{ 
                    display: 'inline-block', 
                    margin: '0 1rem', 
                    padding: '0.5rem 1rem', 
                    backgroundColor: '#28a745', 
                    color: 'white', 
                    textDecoration: 'none', 
                    borderRadius: '4px' 
                }}>
                    Login
                </Link>
            </div>
        </div>
    );
};

export default Landing;
