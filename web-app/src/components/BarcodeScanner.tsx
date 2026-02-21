'use client';

import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Initialize scanner
        scannerRef.current = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 150 },
                aspectRatio: 1.0
            },
            /* verbose= */ false
        );

        scannerRef.current.render(onScanSuccess, onScanFailure);

        function onScanSuccess(decodedText: string, decodedResult: any) {
            // Stop scanning and return result
            if (scannerRef.current) {
                scannerRef.current.clear().then(() => {
                    onScan(decodedText);
                    onClose();
                }).catch(err => {
                    console.error("Failed to clear scanner", err);
                    onScan(decodedText);
                    onClose();
                });
            }
        }

        function onScanFailure(error: any) {
            // Silence scanning errors
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Scanner cleanup error", err));
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
            <div className="glass-card w-full max-w-lg relative z-10 p-6 flex flex-col gap-4 border-primary/30">
                <div className="flex justify-between items-center bg-white/5 -mx-6 -mt-6 p-4 border-b border-white/10">
                    <h3 className="text-white font-bold flex items-center gap-2">Scanner Code-barres</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div id="reader" className="overflow-hidden rounded-xl bg-black border border-white/10"></div>

                <p className="text-center text-xs text-slate-500 font-medium">Placez le code-barres devant la caméra pour le scanner automatiquement.</p>

                <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all mt-2"
                >
                    Annuler
                </button>
            </div>

            <style jsx global>{`
                #reader button {
                    background-color: #3B82F6 !important;
                    color: white !important;
                    border: none !important;
                    padding: 8px 16px !important;
                    border-radius: 8px !important;
                    font-weight: bold !important;
                    cursor: pointer !important;
                    margin: 10px 0 !important;
                }
                #reader select {
                    background-color: #1E293B !important;
                    color: white !important;
                    border: 1px solid #ffffff20 !important;
                    padding: 4px 8px !important;
                    border-radius: 4px !important;
                }
                #reader__scan_region video {
                    border-radius: 12px !important;
                }
            `}</style>
        </div>
    );
}
