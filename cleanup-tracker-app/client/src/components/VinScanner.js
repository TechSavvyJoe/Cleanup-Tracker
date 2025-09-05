import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const VinScanner = ({ onScanSuccess }) => {
    useEffect(() => {
        const qrCodeScanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: 250 },
            false
        );

        qrCodeScanner.render(onScanSuccess, onScanFailure);

        return () => {
            try {
                qrCodeScanner.clear();
            } catch (_) {}
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function onScanFailure(error) {
        // console.warn(`Code scan error = ${error}`);
    }

    return <div id="reader" style={{ width: '100%' }}></div>;
};

export default VinScanner;
