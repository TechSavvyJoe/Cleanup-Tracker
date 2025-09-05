import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { useHistory } from 'react-router-dom';

const Dashboard = ({ auth }) => {
    const history = useHistory();

    useEffect(() => {
        if (auth.isAuthenticated) {
            if (auth.user.role === 'manager' || auth.user.role === 'owner') {
                history.push('/manager');
            } else {
                history.push('/detailer');
            }
        }
    }, [auth, history]);

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
