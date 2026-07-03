"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { submitAttendanceAction } from "@/app/actions/attendance";

export default function ScanPage() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false,
    );

    scannerRef.current.render(onScanSuccess, onScanFailure);

    return () => {
      scannerRef.current?.clear().catch(console.error);
    };
  }, []);

  const onScanSuccess = async (decodedText: string) => {
    if (loading || scanResult === decodedText) return;

    setScanResult(decodedText);
    setLoading(true);
    setMessage(null);

    scannerRef.current?.pause();

    const response = await submitAttendanceAction(decodedText);

    if (response.success) {
      setMessage({ text: "Attendance marked successfully!", type: "success" });
    } else {
      setMessage({
        text: response.error || "Failed to mark attendance.",
        type: "error",
      });
      scannerRef.current?.resume();
    }

    setLoading(false);
  };

  const onScanFailure = () => {
    // Ignore frequent non-detection frames.
  };

  const resetScanner = () => {
    setScanResult(null);
    setMessage(null);
    scannerRef.current?.resume();
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-zinc-950 mb-2">Scan QR</h3>
        <p className="text-sm text-zinc-500 mb-6">
          Point your camera at the meeting QR code to mark your attendance.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div id="reader" className="w-full" />
        </div>

        <aside className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-zinc-950">Check-in status</h4>
            <p className="text-sm text-zinc-500">Scan a meeting QR code to submit attendance.</p>
          </div>

          {loading && <p className="text-sm text-amber-700">Processing attendance...</p>}

          {scanResult && !loading && (
            <p className="text-sm text-zinc-700">Last scanned code: {scanResult}</p>
          )}

          {message && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="button"
            onClick={resetScanner}
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Scan Another
          </button>
        </aside>
      </div>
    </div>
  );
}