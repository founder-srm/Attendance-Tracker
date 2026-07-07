// QR token structure: base64(meetingId + expiresAt + secret)
// In production, replace QR_SECRET with an env var and use a proper HMAC

const QR_SECRET = process.env.NEXT_PUBLIC_QR_SECRET ?? "fc-attendance-secret";

export interface QRPayload {
  meetingId: string;
  expiresAt: number; // unix ms
}

export function generateQRData(
  meetingId: string,
  windowMinutes: number,
  expiresAt?: number,
): string {
  const payload: any = {
    meetingId,
    expiresAt: expiresAt ?? Date.now() + windowMinutes * 60 * 1000,
    nonce: Math.random().toString(36).substring(2, 11), // 9-char random string to force visual change
  };
  return btoa(JSON.stringify({ ...payload, secret: QR_SECRET }));
}

export function parseQRData(data: string): QRPayload | null {
  try {
    const parsed = JSON.parse(atob(data));
    if (parsed.secret !== QR_SECRET) return null;
    return { meetingId: parsed.meetingId, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export function isQRValid(payload: QRPayload): boolean {
  return Date.now() < payload.expiresAt;
}

export function secondsRemaining(payload: QRPayload): number {
  return Math.max(0, Math.floor((payload.expiresAt - Date.now()) / 1000));
}
