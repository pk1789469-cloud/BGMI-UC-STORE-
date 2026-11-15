import QRCode from 'qrcode';
import { MerchantSettings, OrderRecord, PaymentApp, UcPlan } from '../types/store';

export const ORDERS_STORAGE_KEY = 'battledrop_uc_orders_v1';
export const MERCHANT_STORAGE_KEY = 'battledrop_uc_merchant_v1';
export const CUSTOM_PLANS_STORAGE_KEY = 'battledrop_uc_plans_v2';

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function buildUpiUri(params: {
  upiId: string;
  merchantName: string;
  amountInr: number;
  uid: string;
  planTitle: string;
  app?: PaymentApp;
}): string {
  const pa = params.upiId.trim() || 'battledrop.uc@ybl';
  const pn = encodeURIComponent(params.merchantName.trim() || 'BattleDrop UC Store');
  const am = params.amountInr.toFixed(2);
  const tn = encodeURIComponent(`BGMI ${params.planTitle} UID ${params.uid}`);
  const tr = `BD${Date.now().toString().slice(-8)}`;

  const query = `pa=${encodeURIComponent(pa)}&pn=${pn}&am=${am}&cu=INR&tn=${tn}&tr=${tr}`;

  if (params.app === 'PhonePe') {
    return `phonepe://pay?${query}`;
  }
  if (params.app === 'Google Pay') {
    return `tez://upi/pay?${query}`;
  }
  if (params.app === 'Paytm') {
    return `paytmmp://pay?${query}`;
  }
  return `upi://pay?${query}`;
}

export async function generateUpiQrDataUrl(upiUri: string): Promise<string> {
  return QRCode.toDataURL(upiUri, {
    width: 320,
    margin: 2,
    color: {
      dark: '#09090B',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });
}

export function generateOrderId(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `BD-${num}`;
}

export function generateUtrReference(): string {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
  return digits;
}

export function loadSavedOrders(): OrderRecord[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OrderRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOrders(orders: OrderRecord[]): void {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders.slice(0, 20)));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadMerchantSettings(fallback: MerchantSettings): MerchantSettings {
  try {
    const raw = localStorage.getItem(MERCHANT_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<MerchantSettings>;
    return {
      upiId: parsed.upiId || fallback.upiId,
      merchantName: parsed.merchantName || fallback.merchantName,
      customQrDataUrl: parsed.customQrDataUrl ?? fallback.customQrDataUrl,
    };
  } catch {
    return fallback;
  }
}

export function saveMerchantSettings(settings: MerchantSettings): void {
  try {
    localStorage.setItem(MERCHANT_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadCustomPlans(fallback: UcPlan[]): UcPlan[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PLANS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as UcPlan[];
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback;
    const fallbackById = new Map(fallback.map((item) => [item.id, item]));
    return parsed.map((plan) => ({
      ...plan,
      image: fallbackById.get(plan.id)?.image || fallback[0]?.image || plan.image,
    }));
  } catch {
    return fallback;
  }
}

export function saveCustomPlans(plans: UcPlan[]): void {
  try {
    localStorage.setItem(CUSTOM_PLANS_STORAGE_KEY, JSON.stringify(plans));
  } catch {
    // Ignore storage quota errors
  }
}
