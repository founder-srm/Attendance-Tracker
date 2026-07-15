"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { submitAttendanceAction } from "@/app/actions/attendance";

interface QRScannerProps {
  onSuccess: (meetingId: string) => void;
  onError?: (message: string) => void;
}

/**
 * QRScanner — camera-based QR code scanner for attendance check-in.
 *
 * Security model:
 *   When a QR code is scanned, the raw token string is passed directly to
 *   submitAttendanceAction (a Server Action). All validation — HMAC signature
 *   check, expiry check, and attendance recording — happens on the server.
 *   No secret or validation logic lives in this client component.
 */
export default function QRScanner({ onSuccess, onError }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "scanning" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const containerId = "qr-scanner-container";

  // Clean up the scanner if the component unmounts while scanning
  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current
          .stop()
          .catch((err) =>
            console.error("Error stopping scanner on unmount:", err),
          );
      }
    };
  }, []);

  async function startScan() {
    setStatus("scanning");
    setScanning(true);
    setMessage("");

    try {
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          scanner
            .stop()
            .then(() => {
              setScanning(false);
              handleScan(decodedText);
            })
            .catch((err) => {
              console.error("Error stopping scanner after success:", err);
              setScanning(false);
              handleScan(decodedText);
            });
        },
        () => {}, // suppress per-frame non-detection errors
      );
    } catch (err: unknown) {
      console.error("Camera start error:", err);
      setStatus("error");
      setMessage("Camera access denied or unavailable.");
      setScanning(false);
      onError?.("Camera access denied or unavailable.");
    }
  }

  async function stopScan() {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setScanning(false);
    setStatus("idle");
  }

  /**
   * Passes the raw scanned token to the server action for validation.
   * The client does NOT inspect or decode the token.
   */
  async function handleScan(rawToken: string) {
    setStatus("scanning");
    setMessage("Validating...");

    const response = await submitAttendanceAction(rawToken);

    if (response.success) {
      setStatus("success");
      setMessage("Attendance marked!");
      // Derive meetingId from server-confirmed response is not needed for onSuccess —
      // the parent page only needs to know a successful scan happened.
      onSuccess("confirmed");
    } else {
      setStatus("error");
      const errorMsg =
        response.error === "Invalid or expired QR code."
          ? "This QR code is invalid or has expired. Ask your admin to refresh it."
          : (response.error ?? "Failed to mark attendance.");
      setMessage(errorMsg);
      onError?.(errorMsg);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      <div className="relative w-full aspect-square max-w-[280px] rounded-3xl overflow-hidden border border-zinc-200 bg-zinc-950 flex flex-col items-center justify-center shadow-lg">
        <div
          id={containerId}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {!scanning && status === "idle" && (
          <div className="z-10 flex flex-col items-center gap-3 p-6 text-center text-zinc-400">
            <span className="text-4xl animate-pulse">📷</span>
            <p className="text-sm font-semibold">Camera is ready</p>
            <p className="text-xs text-zinc-500">
              Click &ldquo;Start Camera&rdquo; to begin scanning.
            </p>
          </div>
        )}

        {scanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
            {/* Scanning frame overlay — uses Tailwind animate-[scan-line] defined in globals.css */}
            <div className="w-[220px] h-[220px] border border-emerald-400 rounded-2xl relative animate-pulse">
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
              {/* Scan laser line — keyframe defined in globals.css as `scan-line` */}
              <div className="w-full h-[2px] bg-emerald-400 opacity-60 absolute top-1/2 left-0 animate-[scan-line_2.5s_ease-in-out_infinite]" />
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="z-10 flex flex-col items-center gap-2 text-center text-emerald-400">
            <span className="text-5xl">✅</span>
          </div>
        )}

        {status === "error" && (
          <div className="z-10 flex flex-col items-center gap-3 p-6 text-center text-red-400 bg-black/60 absolute inset-0 justify-center">
            <span className="text-4xl">⚠️</span>
            <p className="text-xs font-semibold leading-relaxed max-w-[200px]">
              {message}
            </p>
          </div>
        )}

        {scanning && status === "scanning" && message === "Validating..." && (
          <div className="z-20 absolute inset-0 flex items-center justify-center bg-black/50">
            <p className="text-white text-xs font-semibold animate-pulse">
              Validating...
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 w-full">
        {scanning ? (
          <button
            type="button"
            onClick={stopScan}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-semibold hover:bg-zinc-50 transition active:scale-95 shadow-sm"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={startScan}
            className="flex-1 px-6 py-2.5 rounded-xl bg-zinc-950 text-white text-sm font-semibold hover:bg-zinc-900 transition active:scale-95 shadow-md"
          >
            {status === "error" ? "Try Again" : "Start Camera"}
          </button>
        )}
      </div>
    </div>
  );
}
