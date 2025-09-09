import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const ManagerDashboard = () => {
    const [cleanups, setCleanups] = useState([]);
    const [filters, setFilters] = useState({
        user: '',
        cleanupType: '',
        startDate: '',
        endDate: ''
    });

    const fetchCleanups = useCallback(() => {
        axios
            .get('/api/v2/jobs', { params: filters })
            .then((res) => setCleanups(res.data))
            .catch((err) => console.log(err));
    }, [filters]);

    useEffect(() => {
        fetchCleanups();
    }, [fetchCleanups]);

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
                if (!userTimes[cleanup.technicianName]) {
                    userTimes[cleanup.technicianName] = { total: 0, count: 0 };
                }
                userTimes[cleanup.technicianName].total += cleanup.duration;
                userTimes[cleanup.technicianName].count++;

                // By Type
                if (!typeTimes[cleanup.serviceType]) {
                    typeTimes[cleanup.serviceType] = { total: 0, count: 0 };
                }
                typeTimes[cleanup.serviceType].total += cleanup.duration;
                typeTimes[cleanup.serviceType].count++;
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
                            <td>{cleanup.vehicleDescription}</td>
                            <td>{cleanup.technicianName}</td>
                            <td>{cleanup.serviceType}</td>
                            <td>{cleanup.duration}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ManagerDashboard;
