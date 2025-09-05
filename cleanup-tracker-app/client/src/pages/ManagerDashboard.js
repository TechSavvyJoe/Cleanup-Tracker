import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManagerDashboard = () => {
    const [cleanups, setCleanups] = useState([]);
    const [users, setUsers] = useState([]);
    const [filters, setFilters] = useState({
        user: '',
        cleanupType: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchCleanups();
        fetchUsers();
    }, []);

    const fetchCleanups = () => {
        axios.get('/api/cleanups', { params: filters })
            .then(res => setCleanups(res.data))
            .catch(err => console.log(err));
    };

    const fetchUsers = () => {
        // In a real app, you'd have an endpoint to get users
        // For now, we'll just have a placeholder
        // axios.get('/api/users').then(res => setUsers(res.data));
    };

    const onChange = e => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const onSubmit = e => {
        e.preventDefault();
        fetchCleanups();
    };

    const calculateAverages = () => {
        const userTimes = {};
        const typeTimes = {};

        cleanups.forEach(cleanup => {
            if (cleanup.duration) {
                // By User
                if (!userTimes[cleanup.user.username]) {
                    userTimes[cleanup.user.username] = { total: 0, count: 0 };
                }
                userTimes[cleanup.user.username].total += cleanup.duration;
                userTimes[cleanup.user.username].count++;

                // By Type
                if (!typeTimes[cleanup.cleanupType]) {
                    typeTimes[cleanup.cleanupType] = { total: 0, count: 0 };
                }
                typeTimes[cleanup.cleanupType].total += cleanup.duration;
                typeTimes[cleanup.cleanupType].count++;
            }
        });

        const userAverages = Object.keys(userTimes).map(user => ({
            user,
            avg: (userTimes[user].total / userTimes[user].count).toFixed(2)
        }));

        const typeAverages = Object.keys(typeTimes).map(type => ({
            type,
            avg: (typeTimes[type].total / typeTimes[type].count).toFixed(2)
        }));

        return { userAverages, typeAverages };
    };

    const { userAverages, typeAverages } = calculateAverages();

    return (
        <div className="container">
            <h2>Manager Dashboard</h2>

            <form onSubmit={onSubmit}>
                {/* Add user filter dropdown once users are fetched */}
                <select name="cleanupType" value={filters.cleanupType} onChange={onChange}>
                    <option value="">All Types</option>
                    <option value="Cleanup">Cleanup</option>
                    <option value="Detail">Detail</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Rewash">Rewash</option>
                    <option value="Lot Car">Lot Car</option>
                    <option value="FCTP">FCTP</option>
                </select>
                <input type="date" name="startDate" value={filters.startDate} onChange={onChange} />
                <input type="date" name="endDate" value={filters.endDate} onChange={onChange} />
                <button type="submit">Filter</button>
            </form>

            <h3>Average Times (minutes)</h3>
            <div>
                <h4>By User</h4>
                <ul>
                    {userAverages.map(u => <li key={u.user}>{u.user}: {u.avg}</li>)}
                </ul>
            </div>
            <div>
                <h4>By Type</h4>
                <ul>
                    {typeAverages.map(t => <li key={t.type}>{t.type}: {t.avg}</li>)}
                </ul>
            </div>


            <h3>Recent Cleanups</h3>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Vehicle</th>
                        <th>User</th>
                        <th>Type</th>
                        <th>Duration (min)</th>
                    </tr>
                </thead>
                <tbody>
                    {cleanups.map(cleanup => (
                        <tr key={cleanup._id}>
                            <td>{new Date(cleanup.startTime).toLocaleString()}</td>
                            <td>{cleanup.vehicle.year} {cleanup.vehicle.make} {cleanup.vehicle.model}</td>
                            <td>{cleanup.user.username}</td>
                            <td>{cleanup.cleanupType}</td>
                            <td>{cleanup.duration}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ManagerDashboard;
