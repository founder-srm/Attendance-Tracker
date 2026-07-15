"use server";

import { markAttendance as backendMarkAttendance } from "@/services/attendance";
import { getCurrentUser } from "@/services/users";
import { generateQRToken, validateQRToken } from "@/lib/qr";

/**
 * Server action called by QRDisplay component.
 * Generates a signed, expiring QR token entirely on the server.
 * The client receives only the final opaque string — the secret never leaves the server.
 *
 * @param meetingId     - The meeting UUID to encode.
 * @param expiresAt     - Unix ms timestamp when this token should expire.
 */
export async function generateQRTokenAction(
  meetingId: string,
  expiresAt: number,
): Promise<{ token: string | null; error: string | null }> {
  try {
    const token = await generateQRToken(meetingId, expiresAt);
    return { token, error: null };
  } catch (err) {
    console.error("Failed to generate QR token:", err);
    return { token: null, error: "Failed to generate QR code." };
  }
}

/**
 * Server action called by QRScanner after a successful scan.
 * Validates the scanned token on the server (signature + expiry),
 * then records attendance. The raw token is never evaluated client-side.
 *
 * @param scannedToken - The raw string decoded from the QR code.
 */
export async function submitAttendanceAction(
  scannedToken: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Validate token entirely on the server — checks HMAC signature and expiry.
    const payload = await validateQRToken(scannedToken);

    if (!payload) {
      return { success: false, error: "Invalid or expired QR code." };
    }

    // 2. Verify the requesting user is authenticated.
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // 3. Record attendance using the server-verified meetingId.
    const attendanceRecord = await backendMarkAttendance(
      payload.meetingId,
      user.id,
    );

    if (!attendanceRecord) {
      return {
        success: false,
        error: "Failed to mark attendance or already marked.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Action Error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
