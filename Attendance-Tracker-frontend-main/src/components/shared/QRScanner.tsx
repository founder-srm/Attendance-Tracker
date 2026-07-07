"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { isQRValid, parseQRData } from "@/lib/qr";

interface QRScannerProps {
  onSuccess: (meetingId: string) => void;
  onError?: (message: string) => void;
}

export default function QRScanner({ onSuccess, onError }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "scanning" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const containerId = "qr-scanner-container";

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
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
        () => {}, // suppress per-frame errors
      );
    } catch (err: any) {
      console.error("Camera start error:", err);
      setStatus("error");
      setMessage("Camera access denied or unavailable.");
      setScanning(false);
      onError?.("Camera access denied or unavailable.");
    }
  }

  async function stopScan() {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setScanning(false);
    setStatus("idle");
  }

  function handleScan(data: string) {
    const payload = parseQRData(data);

    if (!payload) {
      setStatus("error");
      setMessage("Invalid QR code. Please scan the correct meeting QR.");
      onError?.("Invalid QR code.");
      return;
    }

    if (!isQRValid(payload)) {
      setStatus("error");
      setMessage("This QR code has expired. Ask your admin to regenerate.");
      onError?.("QR code expired.");
      return;
    }

    setStatus("success");
    setMessage("Valid QR scanned!");
    onSuccess(payload.meetingId);
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
            {/* Scanning Laser Animation */}
            <div className="w-[220px] h-[220px] border border-emerald-400 rounded-2xl relative animate-pulse">
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
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

      <style jsx global>{`
        @keyframes scan-line {
          0% { top: 5%; }
          50% { top: 95%; }
          100% { top: 5%; }
        }
      `}</style>
    </div>
  );
}
