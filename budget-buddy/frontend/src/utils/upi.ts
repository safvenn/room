/**
 * UPI Deep Link Utility
 *
 * The "not secure" error in GPay happens when:
 * 1. window.open() is used (blocked as popup)
 * 2. `upi://` is called from a non-gesture context
 * 3. `intent://` wrapper is missing on Android Chrome
 *
 * Correct pattern:
 * - Mobile Android: `intent://pay?pa=...#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`
 * - Mobile fallback: `upi://pay?pa=...`
 * - Web (desktop): Show QR code only (no redirect possible)
 *
 * MUST be called inside a direct click handler (user gesture).
 * NEVER call from setTimeout, useEffect, or async without user gesture.
 */

export interface UPIPaymentParams {
  upiId: string;        // receiver UPI ID e.g. name@okaxis
  payeeName: string;    // receiver display name
  amount: number;       // in INR
  note?: string;        // transaction note
  currency?: string;    // default INR
}

/** Build the standard UPI URL (works on most UPI apps) */
export function buildUPIUrl(params: UPIPaymentParams): string {
  const { upiId, payeeName, amount, note = 'Budget Buddy Settlement', currency = 'INR' } = params;
  const url = new URL('upi://pay');
  url.searchParams.set('pa', upiId);
  url.searchParams.set('pn', payeeName);
  url.searchParams.set('am', amount.toFixed(2));
  url.searchParams.set('cu', currency);
  url.searchParams.set('tn', note);
  return url.toString();
}

/**
 * Build Android Intent URL for GPay specifically.
 * This is the CORRECT way to open GPay from Chrome on Android — avoids
 * the "not secure" warning that happens with plain upi:// from web context.
 */
export function buildGPayIntentUrl(params: UPIPaymentParams): string {
  const upiUrl = buildUPIUrl(params);
  // Strip "upi://" prefix — intent scheme wraps it
  const payPart = upiUrl.replace('upi://', '');
  return `intent://${payPart}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
}

/** Build PhonePe intent URL */
export function buildPhonePeIntentUrl(params: UPIPaymentParams): string {
  const upiUrl = buildUPIUrl(params);
  const payPart = upiUrl.replace('upi://', '');
  return `intent://${payPart}#Intent;scheme=upi;package=com.phonepe.app;end`;
}

/** Build BHIM/generic UPI intent URL */
export function buildBHIMIntentUrl(params: UPIPaymentParams): string {
  const upiUrl = buildUPIUrl(params);
  const payPart = upiUrl.replace('upi://', '');
  return `intent://${payPart}#Intent;scheme=upi;package=in.org.npci.upiapp;end`;
}

/**
 * Detect platform for choosing the right URL strategy.
 * Returns 'android' | 'ios' | 'desktop'
 */
export function detectPlatform(): 'android' | 'ios' | 'desktop' {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  return 'desktop';
}

/**
 * Generate QR code data URL for a UPI payment using Google Charts API.
 * Returns the UPI URL string that should be encoded in a QR code.
 */
export function getUPIQRUrl(params: UPIPaymentParams): string {
  const upiUrl = buildUPIUrl(params);
  const encoded = encodeURIComponent(upiUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}&bgcolor=ffffff&color=1a1a2e&margin=10`;
}

/**
 * PRIMARY function — open UPI payment in the correct app.
 * MUST be called synchronously from a user click event.
 *
 * Strategy:
 * - Android: intent:// URL (no "not secure" warning, opens GPay/PhonePe picker)
 * - iOS: upi:// URL (opens BHIM or whichever UPI app is installed)
 * - Desktop: returns false (show QR code instead)
 *
 * Returns true if redirect was attempted, false if QR fallback needed.
 */
export function openUPIPayment(params: UPIPaymentParams, app: 'gpay' | 'phonepe' | 'bhim' | 'any' = 'any'): boolean {
  const platform = detectPlatform();

  if (platform === 'desktop') {
    return false; // show QR
  }

  if (platform === 'android') {
    let intentUrl: string;
    if (app === 'gpay') {
      intentUrl = buildGPayIntentUrl(params);
    } else if (app === 'phonepe') {
      intentUrl = buildPhonePeIntentUrl(params);
    } else if (app === 'bhim') {
      intentUrl = buildBHIMIntentUrl(params);
    } else {
      // Generic UPI intent — system shows app picker
      intentUrl = buildGPayIntentUrl(params); // GPay as default, falls back to picker
    }
    // Use location.href — MUST be in direct click handler
    window.location.href = intentUrl;
    return true;
  }

  if (platform === 'ios') {
    // iOS: upi:// scheme — triggers BHIM or any installed UPI app
    window.location.href = buildUPIUrl(params);
    return true;
  }

  return false;
}
