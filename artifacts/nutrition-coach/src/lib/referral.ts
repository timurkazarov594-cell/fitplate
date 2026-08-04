const REF_KEY = "fp_ref";
const REF_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredReferral {
  code: string;
  capturedAt: number;
}

export function captureReferralFromUrl(): void {
  const code = new URLSearchParams(window.location.search).get("ref");
  if (!code) return;
  if (getReferralCode()) return; // first-touch: keep the earliest captured code
  const entry: StoredReferral = { code: code.trim().toUpperCase(), capturedAt: Date.now() };
  localStorage.setItem(REF_KEY, JSON.stringify(entry));
}

export function getReferralCode(): string | null {
  const raw = localStorage.getItem(REF_KEY);
  if (!raw) return null;
  try {
    const { code, capturedAt } = JSON.parse(raw) as StoredReferral;
    if (Date.now() - capturedAt > REF_TTL_MS) {
      localStorage.removeItem(REF_KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

export function clearReferralCode(): void {
  localStorage.removeItem(REF_KEY);
}
