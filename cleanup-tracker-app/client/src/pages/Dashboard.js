import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const Dashboard = ({ auth }) => {
    const navigate = useNavigate();

    useEffect(() => {
        if (auth.isAuthenticated) {
            if (auth.user.role === 'manager' || auth.user.role === 'owner') {
                navigate('/manager');
            } else {
                navigate('/detailer');
            }
        }
    }, [auth, navigate]);

    return (
        <div>
            <h2>Loading...</h2>
        </div>
    );
};

const mapStateToProps = state => ({
    auth: state.auth
});

export default connect(mapStateToProps)(Dashboard);
