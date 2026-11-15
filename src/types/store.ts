export type PlanCategory = 'all' | 'starter' | 'popular' | 'high-value';

export interface UcPlan {
  id: string;
  baseUc: number;
  bonusUc: number;
  totalUc: number;
  title: string;
  subtitle: string;
  category: Exclude<PlanCategory, 'all'>;
  priceInr: number;
  image: string;
  tag?: string;
}

export type PaymentApp = 'PhonePe' | 'Navi UPI' | 'Google Pay' | 'Paytm' | 'UPI QR';

export type OrderStatus = 'processing' | 'delivered';

export interface OrderRecord {
  orderId: string;
  planId: string;
  planTitle: string;
  totalUc: number;
  priceInr: number;
  uid: string;
  playerName: string;
  paymentApp: PaymentApp;
  utrNumber: string;
  createdAt: number;
  deliveryEndsAt: number;
  status: OrderStatus;
}

export interface MerchantSettings {
  upiId: string;
  merchantName: string;
  customQrDataUrl: string | null;
}
