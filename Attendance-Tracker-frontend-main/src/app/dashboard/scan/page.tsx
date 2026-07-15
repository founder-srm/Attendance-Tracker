"use client";

import { useState } from "react";
import { submitAttendanceAction } from "@/app/actions/attendance";
import QRScanner from "@/components/shared/QRScanner";

export default function ScanPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const handleScanSuccess = async (meetingId: string) => {
    setLoading(true);
    setMessage(null);

    const response = await submitAttendanceAction(meetingId);

    if (response.success) {
      setMessage({ text: "Attendance marked successfully!", type: "success" });
    } else {
      setMessage({
        text: response.error || "Failed to mark attendance.",
        type: "error",
      });
    }

    setLoading(false);
  };

  const handleScanError = (errorMessage: string) => {
    setMessage({
      text: errorMessage,
      type: "error",
    });
  };

  const resetScanner = () => {
    setMessage(null);
    window.location.reload();
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-zinc-950 mb-2">
          Scan QR
        </h3>
        <p className="text-sm text-zinc-500 mb-6">
          Point your camera at the meeting QR code to mark your attendance.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
        <div className="rounded-3xl border border-zinc-100 bg-white p-8 shadow-sm flex items-center justify-center min-h-[360px]">
          <QRScanner onSuccess={handleScanSuccess} onError={handleScanError} />
        </div>

        <aside className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-zinc-950">
              Check-in status
            </h4>
            <p className="text-sm text-zinc-500">
              Scan a meeting QR code to submit attendance.
            </p>
          </div>

          {loading && (
            <p className="text-sm text-amber-700 animate-pulse">
              Processing attendance...
            </p>
          )}

          {message && (
            <div
              className={`rounded-xl border p-4 text-sm font-medium ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50/50 text-emerald-700"
                  : "border-red-200 bg-red-50/50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="button"
            onClick={resetScanner}
            className="w-full inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition active:scale-95 shadow-sm"
          >
            Reset Scanner
          </button>
        </aside>
      </div>
    </div>
  );
}
