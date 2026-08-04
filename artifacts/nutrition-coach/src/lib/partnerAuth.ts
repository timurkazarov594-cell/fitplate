const PARTNER_TOKEN_KEY = "partner_token";

export function getPartnerToken(): string | null {
  return localStorage.getItem(PARTNER_TOKEN_KEY);
}

export function setPartnerToken(token: string): void {
  localStorage.setItem(PARTNER_TOKEN_KEY, token);
}

export function clearPartnerToken(): void {
  localStorage.removeItem(PARTNER_TOKEN_KEY);
}
