import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, AlertTriangle } from 'lucide-react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string>('');
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setCameras(devices);
          setSelectedCamera(devices[devices.length - 1].id); // default to last camera (usually back)
        } else {
          setError('ไม่พบกล้องในอุปกรณ์นี้ (No camera found)');
        }
      })
      .catch((err) => {
        setError('ไม่สามารถเข้าถึงกล้องได้: ' + err.message);
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (selectedCamera && !scannerRef.current) {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      html5QrCode.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
          // Auto close after successful scan? Or keep open. The parent can handle it.
        },
        () => {
          // ignore scan errors (they happen every frame when no QR is found)
        }
      ).catch((err) => {
        setError('ไม่สามารถเปิดกล้องได้: ' + err.message);
      });
    }

    return () => {
      // stop logic handled in unmount effect
    };
  }, [selectedCamera, onScan]);

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCameraId = e.target.value;
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current = null;
        setSelectedCamera(newCameraId);
      });
    } else {
      setSelectedCamera(newCameraId);
    }
  };

  return (
    <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 text-center space-y-2 relative overflow-hidden">
      {error ? (
        <div className="text-red-400 text-xs font-bold flex items-center justify-center space-x-1 p-4 bg-red-900/20 rounded-lg">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-2">
            {cameras.length > 1 && (
              <select
                value={selectedCamera}
                onChange={handleCameraChange}
                className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-600"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Camera ${c.id}`}
                  </option>
                ))}
              </select>
            )}
            <span className="text-xs text-blue-300 font-bold ml-auto flex items-center">
              <Camera className="w-4 h-4 mr-1" />
              กล้องกำลังทำงาน...
            </span>
          </div>
          <div id="qr-reader" className="w-full bg-slate-950 overflow-hidden rounded-lg"></div>
        </>
      )}
    </div>
  );
};
