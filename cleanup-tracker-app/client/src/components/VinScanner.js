import React, { useEffect, useRef, useState } from 'react';

// Lightweight VIN-friendly scanner that supports QR, Code39, and Code128.
// Prefers native BarcodeDetector; falls back to ZXing library loaded dynamically.
export default function VinScanner({ onScanSuccess }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [error, setError] = useState('');
    const [active, setActive] = useState(false);
    const stopRef = useRef(() => {});

    useEffect(() => {
        let stream;
        let rafId;
        let detector;

        const startNative = async () => {
            // eslint-disable-next-line no-undef
            const supported = 'BarcodeDetector' in window && (await window.BarcodeDetector.getSupportedFormats?.()).length > 0;
            if (!supported) return false;
            try {
                // eslint-disable-next-line no-undef
                detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_39', 'code_128'] });
            } catch (e) {
                return false;
            }
            const constraints = { video: { facingMode: { ideal: 'environment' } } };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setActive(true);
            const tick = async () => {
                if (!videoRef.current) return;
                try {
                    const barcodes = await detector.detect(videoRef.current);
                    if (barcodes && barcodes.length) {
                        const text = barcodes[0].rawValue || barcodes[0].raw || '';
                        if (text) {
                            onScanSuccess(text);
                            stop();
                            return;
                        }
                    }
                } catch {}
                rafId = requestAnimationFrame(tick);
            };
            rafId = requestAnimationFrame(tick);
            stopRef.current = () => {
                cancelAnimationFrame(rafId);
                stream?.getTracks()?.forEach(t => t.stop());
                setActive(false);
            };
            return true;
        };

        const startZXing = async () => {
            // load ZXing on demand
            const scriptUrl = 'https://unpkg.com/@zxing/library@0.20.0/umd/index.min.js';
            await new Promise((resolve, reject) => {
                if (document.getElementById('zxing-lib')) return resolve();
                const s = document.createElement('script');
                s.src = scriptUrl; s.id = 'zxing-lib'; s.onload = resolve; s.onerror = reject; document.body.appendChild(s);
            });
            // eslint-disable-next-line no-undef
            const codeReader = new ZXing.BrowserMultiFormatReader();
            const videoInputDevices = await codeReader.listVideoInputDevices();
            const backCam = videoInputDevices.reverse().find(d => /back|rear|environment/i.test(d.label)) || videoInputDevices[0];
            setActive(true);
            await codeReader.decodeFromVideoDevice(backCam?.deviceId, videoRef.current, (result, err) => {
                if (result) {
                    onScanSuccess(result.getText ? result.getText() : String(result.text || ''));
                    stop();
                }
            });
            stopRef.current = () => {
                try { codeReader.reset(); } catch {}
                setActive(false);
            };
            return true;
        };

        const start = async () => {
            try {
                if (!(await startNative())) {
                    await startZXing();
                }
            } catch (e) {
                console.error(e);
                setError('Camera access or scanning failed. Check permissions.');
            }
        };
        start();

        const stop = () => stopRef.current();
        return () => {
            stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="w-full">
            <video ref={videoRef} className="w-full rounded-md" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            {!active && !error && <p className="text-gray-500 text-sm">Initializing camera…</p>}
        </div>
    );
}
