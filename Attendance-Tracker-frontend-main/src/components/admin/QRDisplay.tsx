"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState, useCallback } from "react";
import { generateQRTokenAction } from "@/app/actions/attendance";

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
  const [expired, setExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // QR rotation window: 10 minutes per token
  const ROTATION_INTERVAL_MS = 10 * 60 * 1000;

  /**
   * Requests a fresh signed token from the server and renders it on the canvas.
   * The secret never leaves the server — this component only receives the opaque string.
   */
  const updateQR = useCallback(
    async (expiresAt: number) => {
      const { token, error } = await generateQRTokenAction(meetingId, expiresAt);

      if (error || !token) {
        console.error("Failed to generate QR token from server:", error);
        return;
      }

      if (canvasRef.current) {
        QRCode.toCanvas(
          canvasRef.current,
          token,
          { width: 280, margin: 2 },
          (err) => {
            if (err) console.error("Error rendering QR canvas:", err);
          },
        );
      }
    },
    [meetingId],
  );

  useEffect(() => {
    if (!actualStartAt) {
      setExpired(true);
      return;
    }

    const meetingStartTime = new Date(actualStartAt).getTime();
    const meetingEndTime = meetingStartTime + windowMinutes * 60 * 1000;

    let currentQrExpiry = 0;

    function scheduleNextQR() {
      const now = Date.now();
      if (now >= meetingEndTime) {
        setExpired(true);
        setTimeLeft(0);
        return;
      }

      setExpired(false);
      currentQrExpiry = Math.min(now + ROTATION_INTERVAL_MS, meetingEndTime);
      updateQR(currentQrExpiry);
    }

    // Generate the first QR token immediately
    scheduleNextQR();

    // Tick every second: update countdown and trigger rotation when the window expires
    const timerInterval = setInterval(() => {
      const now = Date.now();
      if (now >= meetingEndTime) {
        setExpired(true);
        setTimeLeft(0);
        clearInterval(timerInterval);
        return;
      }

      const remainingSeconds = Math.max(
        0,
        Math.floor((currentQrExpiry - now) / 1000),
      );
      setTimeLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        scheduleNextQR();
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [meetingId, windowMinutes, actualStartAt, updateQR]);

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
