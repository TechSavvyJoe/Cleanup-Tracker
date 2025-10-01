import React, { useState } from 'react';
import { connect } from 'react-redux';
import { registerUser } from '../../actions/authActions';
import { useNavigate } from 'react-router-dom';

const Register = ({ registerUser, errors }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        password2: '',
        role: 'detailer'
    });

    const { username, password, password2, role } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = e => {
        e.preventDefault();
        if (password !== password2) {
            console.log('Passwords do not match');
        } else {
            const newUser = { username, password, role };
            registerUser(newUser, navigate);
        }
    };

    return (
        <div className="container">
            <h2>Register</h2>
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
                <div>
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        name="password2"
                        value={password2}
                        onChange={onChange}
                        required
                    />
                </div>
                <div>
                    <select name="role" value={role} onChange={onChange}>
                        <option value="detailer">Detailer</option>
                        <option value="manager">Manager</option>
                        <option value="owner">Owner</option>
                    </select>
                </div>
                <input type="submit" value="Register" />
            </form>
            {errors && <div>{errors.username}</div>}
        </div>
    );
};

const mapStateToProps = state => ({
    auth: state.auth,
    errors: state.errors
});

export default connect(mapStateToProps, { registerUser })(Register);
