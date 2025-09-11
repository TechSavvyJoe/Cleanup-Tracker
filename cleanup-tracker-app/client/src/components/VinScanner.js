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
                detector = new window.BarcodeDetector({ 
                    formats: ['qr_code', 'code_39', 'code_128', 'code_93', 'ean_13', 'ean_8', 'itf', 'pdf417', 'data_matrix'] 
                });
            } catch (e) {
                return false;
            }
            // Enhanced constraints for better wide barcode scanning
            const constraints = { 
                video: { 
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    zoom: { ideal: 1 }
                } 
            };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setActive(true);
            const tick = async () => {
                if (!videoRef.current) return;
                try {
                    const barcodes = await detector.detect(videoRef.current);
                    if (barcodes && barcodes.length) {
                        const text = (barcodes[0].rawValue || barcodes[0].raw || '').trim().toUpperCase();
                        // Enhanced validation for VIN barcodes (accept 8+ characters for flexibility)
                        if (text && text.length >= 8) {
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
            // load ZXing on demand with enhanced multi-format support
            const scriptUrl = 'https://unpkg.com/@zxing/library@0.20.0/umd/index.min.js';
            await new Promise((resolve, reject) => {
                if (document.getElementById('zxing-lib')) return resolve();
                const s = document.createElement('script');
                s.src = scriptUrl; s.id = 'zxing-lib'; s.onload = resolve; s.onerror = reject; document.body.appendChild(s);
            });
            // eslint-disable-next-line no-undef
            const codeReader = new ZXing.BrowserMultiFormatReader();
            
            // Enhanced camera selection for better wide barcode scanning
            const videoInputDevices = await codeReader.listVideoInputDevices();
            const backCam = videoInputDevices.reverse().find(d => /back|rear|environment/i.test(d.label)) || videoInputDevices[0];
            
            // Set video constraints for better wide barcode detection
            if (videoRef.current) {
                videoRef.current.style.width = '100%';
                videoRef.current.style.height = 'auto';
            }
            
            setActive(true);
            await codeReader.decodeFromVideoDevice(
                backCam?.deviceId, 
                videoRef.current, 
                (result, err) => {
                    if (result) {
                        const scannedText = result.getText ? result.getText() : String(result.text || '');
                        // Enhanced VIN validation - accept various formats
                        if (scannedText && scannedText.length >= 8) {
                            onScanSuccess(scannedText.trim().toUpperCase());
                            stop();
                        }
                    }
                }
            );
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
        <div className="w-full relative">
            <div className="relative">
                <video ref={videoRef} className="w-full rounded-md" muted playsInline />
                
                {/* Cross-Pattern Scanner Layout */}
                {active && (
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Horizontal scanning area for wide barcodes */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-20 border-2 border-green-400 rounded-lg bg-green-400/10">
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                                Wide Barcode Scanning
                            </div>
                            
                            {/* Enhanced corner indicators for barcode area */}
                            <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-green-400"></div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-green-400"></div>
                            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-green-400"></div>
                            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-green-400"></div>
                        </div>

                        {/* Vertical/Square scanning area for QR codes - centered overlapping */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-blue-400 rounded-lg bg-blue-400/10">
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                                QR Code
                            </div>
                            
                            {/* QR code corner indicators */}
                            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-400"></div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-blue-400"></div>
                            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-blue-400"></div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-blue-400"></div>
                        </div>

                        {/* Scanning line animation */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-0.5 bg-red-500 animate-pulse"></div>
                        
                        {/* Instructions */}
                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-6 py-3 rounded-lg text-center max-w-md">
                            <div className="text-lg font-bold text-green-400">VIN Scanner Ready</div>
                            <div className="text-sm mt-1">📏 Wide barcode: Use green horizontal area</div>
                            <div className="text-sm">📱 QR code: Use blue square area</div>
                            <div className="text-xs text-gray-300 mt-2">Hold steady • Auto-detects all formats</div>
                        </div>
                    </div>
                )}
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            {!active && !error && <p className="text-gray-500 text-sm">Initializing camera…</p>}
        </div>
    );
}
