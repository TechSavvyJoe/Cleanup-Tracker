import React from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { logoutUser } from '../../actions/authActions';

const Navbar = ({ auth, logoutUser }) => {
    const onLogoutClick = e => {
        e.preventDefault();
        logoutUser();
    };

    const authLinks = (
        <ul>
            <li>
                <Link to="/v2">v2</Link>
            </li>
            <li>
                <button type="button" onClick={onLogoutClick} className="link-like-button">
                    Logout
                </button>
            </li>
        </ul>
    );

    const guestLinks = (
        <ul>
            <li>
                <Link to="/v2">v2</Link>
            </li>
            <li>
                <Link to="/register">Register</Link>
            </li>
            <li>
                <Link to="/login">Login</Link>
            </li>
        </ul>
    );

    return (
        <nav className="navbar">
            <h1>
                <Link to="/">Cleanup Tracker</Link>
            </h1>
            {auth.isAuthenticated ? authLinks : guestLinks}
        </nav>
    );
};

const mapStateToProps = state => ({
    auth: state.auth
});

export default connect(mapStateToProps, { logoutUser })(Navbar);
