"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import {
  generateQRData,
  isQRValid,
  parseQRData,
  secondsRemaining,
} from "@/lib/qr";

interface QRDisplayProps {
  meetingId: string;
  windowMinutes: number;
  actualStartAt?: string | null;
}

export default function QRDisplay({
  meetingId,
  windowMinutes,
  actualStartAt,
}: QRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrData, setQrData] = useState<string>("");
  const [expired, setExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Interval duration for QR rotation (10 minutes)
  const ROTATION_INTERVAL_MS = 10 * 60 * 1000;

  useEffect(() => {
    if (!actualStartAt) {
      setExpired(true);
      return;
    }

    const meetingStartTime = new Date(actualStartAt).getTime();
    const meetingEndTime = meetingStartTime + windowMinutes * 60 * 1000;

    let currentQrExpiry = 0;

    function updateQR() {
      const now = Date.now();
      if (now >= meetingEndTime) {
        setExpired(true);
        setTimeLeft(0);
        return;
      }

      setExpired(false);
      // Expiration for this specific QR is either 10 minutes from now or the meeting end time
      currentQrExpiry = Math.min(now + ROTATION_INTERVAL_MS, meetingEndTime);

      const data = generateQRData(meetingId, windowMinutes, currentQrExpiry);
      setQrData(data);

      if (canvasRef.current) {
        QRCode.toCanvas(
          canvasRef.current,
          data,
          { width: 280, margin: 2 },
          (error) => {
            if (error) console.error("Error generating QR Canvas:", error);
          },
        );
      }
    }

    // Generate first QR code
    updateQR();

    // Set up timer check loop (runs every second to manage countdown and trigger updates)
    const timerInterval = setInterval(() => {
      const now = Date.now();
      if (now >= meetingEndTime) {
        setExpired(true);
        setTimeLeft(0);
        clearInterval(timerInterval);
        return;
      }

      // Calculate time remaining based on current QR expiry timestamp
      const remainingSeconds = Math.max(
        0,
        Math.floor((currentQrExpiry - now) / 1000),
      );
      setTimeLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        updateQR();
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [meetingId, windowMinutes, actualStartAt]);

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");

  if (!actualStartAt) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 border border-zinc-200 rounded-2xl text-center gap-2">
        <span className="text-3xl text-zinc-400">🕒</span>
        <p className="text-sm font-semibold text-zinc-700">QR Code Inactive</p>
        <p className="text-xs text-zinc-400 max-w-[260px]">
          The QR code will be generated once you click &ldquo;Start NOW&rdquo;
          to officially open the meeting.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative border border-zinc-200 rounded-2xl overflow-hidden p-4 bg-white shadow-sm">
        <canvas
          ref={canvasRef}
          className={
            expired
              ? "opacity-20 blur-sm transition-all duration-300"
              : "transition-all duration-300"
          }
        />
        {expired && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-2xl">
            <span className="bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg border border-red-500 animate-bounce">
              QR Expired
            </span>
          </div>
        )}
      </div>
      {!expired ? (
        <div className="text-center space-y-1">
          <p className="text-sm text-zinc-500 font-medium">
            Scan to mark attendance
          </p>
          <p className="text-lg font-mono tabular-nums text-zinc-700">
            QR rotates in{" "}
            <span
              className={
                timeLeft < 30
                  ? "text-red-500 font-bold animate-pulse"
                  : "text-emerald-600 font-bold"
              }
            >
              {mins}:{secs}
            </span>
          </p>
        </div>
      ) : (
        <p className="text-sm text-zinc-400 font-medium text-center">
          The meeting session has ended.
          <br />
          The QR code is no longer valid.
        </p>
      )}
    </div>
  );
}
