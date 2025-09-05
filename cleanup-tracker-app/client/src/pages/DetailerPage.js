import React, { useState } from 'react';
import axios from 'axios';
import VinScanner from '../components/VinScanner';
import { connect } from 'react-redux';

const DetailerPage = ({ auth }) => {
    const [vin, setVin] = useState('');
    const [vehicle, setVehicle] = useState(null);
    const [cleanupType, setCleanupType] = useState('Cleanup');
    const [activeCleanup, setActiveCleanup] = useState(null);
    const [message, setMessage] = useState('');

    const onScanSuccess = (decodedText, decodedResult) => {
        setVin(decodedText);
        fetchVehicle(decodedText);
    };

    const fetchVehicle = (scannedVin) => {
        axios.get(`/api/vehicles/vin/${scannedVin}`)
            .then(res => {
                setVehicle(res.data);
                setMessage('');
            })
            .catch(err => {
                setVehicle(null);
                setMessage('Vehicle not found.');
            });
    };

    const startCleanup = () => {
        axios.post('/api/cleanups/start', { vin, userId: auth.user.id, cleanupType })
            .then(res => {
                setActiveCleanup(res.data);
                setMessage(`Started ${cleanupType} for ${vehicle.make} ${vehicle.model}`);
            })
            .catch(err => setMessage('Error starting cleanup.'));
    };

    const endCleanup = () => {
        axios.post(`/api/cleanups/end/${activeCleanup._id}`)
            .then(res => {
                setActiveCleanup(null);
                setVehicle(null);
                setVin('');
                setMessage(`Completed ${cleanupType}. Duration: ${res.data.duration} minutes.`);
            })
            .catch(err => setMessage('Error ending cleanup.'));
    };

    return (
        <div className="container">
            <h2>Detailer Portal</h2>
            {!activeCleanup ? (
                <>
                    <VinScanner onScanSuccess={onScanSuccess} />
                    <input
                        type="text"
                        placeholder="Or Enter VIN Manually"
                        value={vin}
                        onChange={(e) => setVin(e.target.value)}
                    />
                    <button onClick={() => fetchVehicle(vin)}>Get Vehicle</button>

                    {message && <p>{message}</p>}

                    {vehicle && (
                        <div>
                            <h3>{vehicle.year} {vehicle.make} {vehicle.model}</h3>
                            <p>Stock #: {vehicle.stockNumber}</p>
                            <p>Color: {vehicle.color}</p>
                            <p>Odometer: {vehicle.odometer}</p>
                            <select value={cleanupType} onChange={(e) => setCleanupType(e.target.value)}>
                                <option value="Cleanup">Cleanup</option>
                                <option value="Detail">Detail</option>
                                <option value="Delivery">Delivery</option>
                                <option value="Rewash">Rewash</option>
                                <option value="Lot Car">Lot Car</option>
                                <option value="FCTP">FCTP</option>
                            </select>
                            <button onClick={startCleanup}>Start Cleanup</button>
                        </div>
                    )}
                </>
            ) : (
                <div>
                    <h3>Work in Progress</h3>
                    <p>Cleaning: {vehicle.year} {vehicle.make} {vehicle.model}</p>
                    <p>Type: {cleanupType}</p>
                    <button onClick={endCleanup}>Complete Cleanup</button>
                </div>
            )}
        </div>
    );
};

const mapStateToProps = state => ({
    auth: state.auth
});

export default connect(mapStateToProps)(DetailerPage);
