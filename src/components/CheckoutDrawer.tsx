import { ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  QrCode,
  Upload,
  X,
} from 'lucide-react';
import { MerchantSettings, OrderRecord, PaymentApp, UcPlan } from '../types/store';
import {
  buildUpiUri,
  formatCountdown,
  formatInr,
  generateOrderId,
  generateUpiQrDataUrl,
  generateUtrReference,
} from '../utils/upi';
import { ProductImage } from './ProductImage';

interface CheckoutDrawerProps {
  plan: UcPlan | null;
  activeOrder: OrderRecord | null;
  initialUid: string;
  onUidChange: (uid: string) => void;
  merchantSettings: MerchantSettings;
  onUpdateMerchantSettings: (next: MerchantSettings) => void;
  onOrderCreated: (order: OrderRecord) => void;
  onClose: () => void;
}

export function CheckoutDrawer({
  plan,
  activeOrder,
  initialUid,
  onUidChange,
  merchantSettings,
  onUpdateMerchantSettings,
  onOrderCreated,
  onClose,
}: CheckoutDrawerProps) {
  const [uid, setUid] = useState(initialUid);
  const [uidError, setUidError] = useState('');

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [upiCopied, setUpiCopied] = useState(false);
  const [utrInput, setUtrInput] = useState('');

  const [pendingApp, setPendingApp] = useState<PaymentApp | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderRecord | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const paymentTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeOrder) {
      setCompletedOrder(activeOrder);
      setIsProcessingPayment(false);
      setPendingApp(null);
    } else if (plan) {
      setCompletedOrder(null);
      setUid(initialUid);
      setUidError('');
      setIsProcessingPayment(false);
      setPendingApp(null);
      setUtrInput('');
    }
  }, [plan, activeOrder, initialUid]);

  useEffect(() => {
    if (!completedOrder) return;
    const interval = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [completedOrder]);

  useEffect(() => {
    if (!plan || completedOrder) return;
    if (merchantSettings.customQrDataUrl) return;

    const uri = buildUpiUri({
      upiId: merchantSettings.upiId,
      merchantName: merchantSettings.merchantName,
      amountInr: plan.priceInr,
      uid: uid || '5492817364',
      planTitle: plan.title,
    });

    let cancelled = false;
    generateUpiQrDataUrl(uri)
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [plan, completedOrder, uid, merchantSettings]);

  useEffect(() => {
    return () => {
      if (paymentTimerRef.current) {
        window.clearTimeout(paymentTimerRef.current);
      }
    };
  }, []);

  if (!plan && !activeOrder) return null;

  const ensureValidUid = (): string | null => {
    const cleaned = uid.replace(/\D/g, '');
    if (cleaned.length < 8 || cleaned.length > 13) {
      setUidError('Enter valid 8–13 digit BGMI UID first.');
      return null;
    }
    setUidError('');
    return cleaned;
  };

  const handleUploadQr = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateMerchantSettings({
          ...merchantSettings,
          customQrDataUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const finalizeOrder = (app: PaymentApp, validUid: string, customUtr?: string) => {
    if (!plan) return;
    const createdAt = Date.now();
    const deliveryEndsAt = createdAt + 5 * 60 * 1000;
    const newOrder: OrderRecord = {
      orderId: generateOrderId(),
      planId: plan.id,
      planTitle: plan.title,
      totalUc: plan.totalUc,
      priceInr: plan.priceInr,
      uid: validUid,
      playerName: `Player_${validUid.slice(-4)}`,
      paymentApp: app,
      utrNumber: customUtr?.trim() || generateUtrReference(),
      createdAt,
      deliveryEndsAt,
      status: 'processing',
    };
    setNowTs(createdAt);
    setCompletedOrder(newOrder);
    setIsProcessingPayment(false);
    setPendingApp(null);
    onOrderCreated(newOrder);
  };

  const handleAutoPayApp = (app: PaymentApp) => {
    if (!plan || isProcessingPayment) return;
    const validUid = ensureValidUid();
    if (!validUid) return;

    const deepLink = buildUpiUri({
      upiId: merchantSettings.upiId,
      merchantName: merchantSettings.merchantName,
      amountInr: plan.priceInr,
      uid: validUid,
      planTitle: plan.title,
      app,
    });

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      const link = document.createElement('a');
      link.href = deepLink;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setPendingApp(app);
    setIsProcessingPayment(true);

    if (paymentTimerRef.current) {
      window.clearTimeout(paymentTimerRef.current);
    }
    paymentTimerRef.current = window.setTimeout(() => {
      finalizeOrder(app, validUid, utrInput);
    }, 2500);
  };

  const handleDirectSuccess = () => {
    const validUid = ensureValidUid();
    if (!validUid) return;
    finalizeOrder('UPI QR', validUid, utrInput);
  };

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(merchantSettings.upiId);
    setUpiCopied(true);
    window.setTimeout(() => setUpiCopied(false), 1800);
  };

  const activeQrSrc = merchantSettings.customQrDataUrl || qrDataUrl;
  const remainingMs = completedOrder ? Math.max(0, completedOrder.deliveryEndsAt - nowTs) : 0;
  const isDelivered = completedOrder ? remainingMs <= 0 : false;
  const elapsedPct = completedOrder
    ? Math.min(100, Math.max(4, ((5 * 60 * 1000 - remainingMs) / (5 * 60 * 1000)) * 100))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Direct QR Payment and UC Delivery"
    >
      <div className="relative flex w-full max-w-lg max-h-[92vh] flex-col rounded-2xl border border-white/15 bg-[#11141A] shadow-2xl overflow-y-auto">
        {/* Compact Modal Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-[#11141A]/95 backdrop-blur-md px-4 py-3.5">
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-white truncate">
              {completedOrder
                ? `Payment Successful · ${completedOrder.orderId}`
                : `${plan?.title} — ${formatInr(plan?.priceInr || 0)}`}
            </h2>
            <p className="text-xs text-zinc-400 truncate">
              {completedOrder
                ? `BGMI UID ${completedOrder.uid} · ${completedOrder.paymentApp}`
                : 'Enter UID above, scan QR or pay via PhonePe / Navi UPI'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment window"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {!completedOrder && plan ? (
            <>
              {/* TOP: Direct UID Input + Selected UC Summary */}
              <div className="rounded-xl border border-white/10 bg-[#171B22] p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ProductImage
                      src={plan.image}
                      alt={plan.title}
                      fallbackLabel={plan.title}
                      className="h-11 w-14 rounded-lg bg-black object-contain p-1 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-display text-sm font-bold text-white truncate">
                        {plan.title}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">
                        Total {plan.totalUc.toLocaleString('en-IN')} UC
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-base font-bold text-amber-400 tabular-nums shrink-0">
                    {formatInr(plan.priceInr)}
                  </span>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="drawer-bgmi-uid"
                    className="block text-xs font-medium text-zinc-300"
                  >
                    BGMI Player UID
                  </label>
                  <input
                    id="drawer-bgmi-uid"
                    type="text"
                    inputMode="numeric"
                    value={uid}
                    onChange={(e) => {
                      const next = e.target.value.replace(/[^\d]/g, '').slice(0, 13);
                      setUid(next);
                      onUidChange(next);
                      if (uidError) setUidError('');
                    }}
                    placeholder="Enter 10-digit BGMI UID (e.g. 5492817364)"
                    className="w-full rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-2.5 font-mono text-sm text-white placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                  {uidError && (
                    <p className="text-xs font-medium text-rose-400" role="alert">
                      {uidError}
                    </p>
                  )}
                </div>
              </div>

              {/* CENTER: Direct QR Code Display + Upload Own QR */}
              <div className="rounded-xl border border-white/10 bg-[#171B22] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-white">
                    {merchantSettings.customQrDataUrl
                      ? 'Store QR Code'
                      : `Scan QR to Pay ${formatInr(plan.priceInr)}`}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#0B0D10] px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:border-amber-400/60 cursor-pointer"
                    >
                      <Upload className="h-3 w-3 text-amber-400" />
                      <span>Upload QR</span>
                    </button>
                    {merchantSettings.customQrDataUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateMerchantSettings({
                            ...merchantSettings,
                            customQrDataUrl: null,
                          })
                        }
                        className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
                      >
                        Auto QR
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadQr}
                    className="hidden"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-xl bg-white p-2">
                    {activeQrSrc ? (
                      <img
                        src={activeQrSrc}
                        alt="UPI QR Code"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <QrCode className="h-10 w-10 text-zinc-400" />
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2.5">
                    <div className="rounded-lg border border-white/10 bg-[#0B0D10] px-3 py-2 flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-zinc-200 truncate">
                        {merchantSettings.upiId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 shrink-0 cursor-pointer"
                      >
                        <Copy className="h-3 w-3" />
                        <span>{upiCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value)}
                      placeholder="Optional UTR / Ref No."
                      className="w-full rounded-lg border border-white/10 bg-[#0B0D10] px-3 py-2 font-mono text-xs text-white placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={handleDirectSuccess}
                      className="w-full rounded-lg bg-emerald-500 px-3 py-2.5 text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition-colors cursor-pointer"
                    >
                      Payment Successful · Confirm ({formatInr(plan.priceInr)})
                    </button>
                  </div>
                </div>
              </div>

              {/* BOTTOM: Auto Payment (PhonePe / Navi UPI / GPay / Paytm) */}
              <div className="rounded-xl border border-white/10 bg-[#171B22] p-3.5 space-y-2.5">
                <p className="text-xs font-semibold text-zinc-300">
                  Auto UPI Payment (Direct App Launch)
                </p>

                {isProcessingPayment && pendingApp ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
                      <span className="text-xs font-medium text-white">
                        Verifying {pendingApp} payment...
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const valid = ensureValidUid();
                        if (valid) finalizeOrder(pendingApp, valid, utrInput);
                      }}
                      className="rounded bg-amber-400 px-2.5 py-1 text-xs font-bold text-zinc-950 cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAutoPayApp('PhonePe')}
                      className="rounded-lg border border-[#5f259f]/70 bg-[#5f259f]/20 px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#5f259f]/35 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      PhonePe
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoPayApp('Navi UPI')}
                      className="rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-3 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500/25 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Navi UPI
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoPayApp('Google Pay')}
                      className="rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:border-white/30 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      GPay
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoPayApp('Paytm')}
                      className="rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:border-white/30 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Paytm
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            completedOrder && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-display text-base font-bold text-white">
                      Payment Successful!
                    </p>
                    <p className="text-xs text-emerald-200/90 mt-0.5">
                      {formatInr(completedOrder.priceInr)} paid via {completedOrder.paymentApp} for{' '}
                      {completedOrder.planTitle} (UID: {completedOrder.uid}).
                    </p>
                  </div>
                </div>

                {/* 5-Minute Delivery Countdown */}
                <div className="rounded-xl border border-amber-400/30 bg-[#171B22] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-semibold text-white">
                        {isDelivered
                          ? 'UC Credited to BGMI Account'
                          : 'Please Wait 5 Minutes · UC Dispatching'}
                      </span>
                    </div>
                    <span className="font-mono text-xl font-bold text-amber-400 tabular-nums">
                      {isDelivered ? '00:00' : formatCountdown(remainingMs)}
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isDelivered ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${isDelivered ? 100 : elapsedPct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-zinc-400">
                    <div>
                      Order: <span className="font-mono text-white">{completedOrder.orderId}</span>
                    </div>
                    <div className="text-right">
                      UTR: <span className="font-mono text-white">{completedOrder.utrNumber}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl bg-amber-400 px-5 py-3 text-xs font-bold text-zinc-950 hover:bg-amber-300 cursor-pointer"
                >
                  Done
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
