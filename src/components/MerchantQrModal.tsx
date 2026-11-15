import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { RotateCcw, Upload, X } from 'lucide-react';
import { MerchantSettings, UcPlan } from '../types/store';
import { formatInr } from '../utils/upi';

interface MerchantQrModalProps {
  isOpen: boolean;
  settings: MerchantSettings;
  plans: UcPlan[];
  onSaveSettings: (settings: MerchantSettings) => void;
  onUpdatePlans: (plans: UcPlan[]) => void;
  onResetPlans: () => void;
  onClose: () => void;
}

export function MerchantQrModal({
  isOpen,
  settings,
  plans,
  onSaveSettings,
  onUpdatePlans,
  onResetPlans,
  onClose,
}: MerchantQrModalProps) {
  const [upiId, setUpiId] = useState(settings.upiId);
  const [merchantName, setMerchantName] = useState(settings.merchantName);
  const [customQr, setCustomQr] = useState<string | null>(settings.customQrDataUrl);
  const [editablePlans, setEditablePlans] = useState<UcPlan[]>(plans);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUpiId(settings.upiId);
      setMerchantName(settings.merchantName);
      setCustomQr(settings.customQrDataUrl);
      setEditablePlans(plans);
    }
  }, [isOpen, settings, plans]);

  if (!isOpen) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomQr(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePriceChange = (planId: string, nextValue: string) => {
    const num = Number(nextValue.replace(/\D/g, ''));
    setEditablePlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, priceInr: Number.isNaN(num) ? 0 : num } : p)),
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      upiId: upiId.trim() || 'battledrop.uc@ybl',
      merchantName: merchantName.trim() || 'BattleDrop UC Store',
      customQrDataUrl: customQr,
    });
    onUpdatePlans(editablePlans.map((p) => ({ ...p, priceInr: Math.max(1, p.priceInr) })));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Merchant QR and Plan Setup"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#11141A] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#11141A] px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Store QR & UPI Configuration
            </h2>
            <p className="text-xs text-zinc-400">
              Add your PhonePe / Navi UPI ID, upload your QR code, or customize pack prices
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="merchant-upi" className="block text-xs font-medium text-zinc-300">
                Merchant UPI ID (PhonePe / Navi / GPay)
              </label>
              <input
                id="merchant-upi"
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@ybl or yourname@naviaxis"
                className="w-full rounded-xl border border-white/15 bg-[#0B0D10] px-3.5 py-2.5 font-mono text-sm text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="merchant-name" className="block text-xs font-medium text-zinc-300">
                Payee Display Name
              </label>
              <input
                id="merchant-name"
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder="BattleDrop UC Store"
                className="w-full rounded-xl border border-white/15 bg-[#0B0D10] px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#171B22] p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Custom Payment QR Image</p>
                <p className="text-xs text-zinc-400">
                  Upload your own PhonePe or Navi UPI QR screenshot (optional)
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-300 cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload QR</span>
                </button>
                {customQr && (
                  <button
                    type="button"
                    onClick={() => setCustomQr(null)}
                    className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {customQr && (
              <div className="flex items-center gap-4 pt-2">
                <img
                  src={customQr}
                  alt="Uploaded custom QR"
                  className="h-24 w-24 rounded-lg bg-white p-1.5 object-contain"
                />
                <p className="text-xs text-emerald-300">
                  Custom QR active. All checkout screens will display this QR image.
                </p>
              </div>
            )}
          </div>

          {/* Customizable UC Prices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Customize Plan Prices (INR)</p>
              <button
                type="button"
                onClick={() => {
                  onResetPlans();
                  onClose();
                }}
                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Default Prices</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {editablePlans.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0B0D10] px-3 py-2"
                >
                  <span className="text-xs font-medium text-zinc-200 truncate">{p.title}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-zinc-500">₹</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label={`Price for ${p.title}`}
                      value={p.priceInr}
                      onChange={(e) => handlePriceChange(p.id, e.target.value)}
                      className="w-16 rounded border border-white/10 bg-[#171B22] px-2 py-1 text-right font-mono text-xs text-amber-300 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500">
              Current top pack: {formatInr(editablePlans[editablePlans.length - 1]?.priceInr || 0)}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-bold text-zinc-950 hover:bg-amber-300 cursor-pointer"
            >
              Save Store Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
