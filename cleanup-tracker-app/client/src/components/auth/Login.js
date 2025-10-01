import React, { useState } from 'react';
import { connect } from 'react-redux';
import { loginUser } from '../../actions/authActions';
import { useNavigate } from 'react-router-dom';

const Login = ({ loginUser, errors }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });

    const { username, password } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = e => {
        e.preventDefault();
        const userData = { username, password };
        loginUser(userData, navigate);
    };

    return (
        <div className="container">
            <h2>Login</h2>
            <form onSubmit={onSubmit}>
                <div>
                    <input
                        type="text"
                        placeholder="Username"
                        name="username"
                        value={username}
                        onChange={onChange}
                        required
                    />
                </div>
                <div>
                    <input
                        type="password"
                        placeholder="Password"
                        name="password"
                        value={password}
                        onChange={onChange}
                        required
                    />
                </div>
                <input type="submit" value="Login" />
            </form>
            {errors && <div>{errors.usernamenotfound || errors.passwordincorrect}</div>}
        </div>
    );
};

const mapStateToProps = state => ({
    auth: state.auth,
    errors: state.errors
});

export default connect(mapStateToProps, { loginUser })(Login);
