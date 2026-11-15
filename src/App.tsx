import { useEffect, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { CheckoutDrawer } from './components/CheckoutDrawer';
import { MerchantQrModal } from './components/MerchantQrModal';
import { Navbar } from './components/Navbar';
import { OrderTrackerSection } from './components/OrderTrackerSection';
import { ProductImage } from './components/ProductImage';
import {
  DEFAULT_MERCHANT_SETTINGS,
  HERO_BANNER_IMAGE,
  INITIAL_UC_PLANS,
} from './data/plans';
import {
  MerchantSettings,
  OrderRecord,
  UcPlan,
} from './types/store';
import {
  formatCountdown,
  formatInr,
  loadCustomPlans,
  loadMerchantSettings,
  loadSavedOrders,
  saveCustomPlans,
  saveMerchantSettings,
  saveOrders,
} from './utils/upi';

export default function App() {
  const [plans, setPlans] = useState<UcPlan[]>(() => loadCustomPlans(INITIAL_UC_PLANS));
  const [playerUid, setPlayerUid] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<UcPlan | null>(null);
  const [inspectedOrder, setInspectedOrder] = useState<OrderRecord | null>(null);

  const [merchantSettings, setMerchantSettings] = useState<MerchantSettings>(() =>
    loadMerchantSettings(DEFAULT_MERCHANT_SETTINGS),
  );
  const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false);

  const [orders, setOrders] = useState<OrderRecord[]>(() => loadSavedOrders());
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const hasActive = orders.some((o) => o.deliveryEndsAt > Date.now());
    if (!hasActive) return;
    const interval = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [orders]);

  const activeOrders = useMemo(
    () => orders.filter((o) => o.deliveryEndsAt > nowTs),
    [orders, nowTs],
  );

  const latestActiveOrder = activeOrders[0] || null;

  const handleBuyUc = (plan: UcPlan) => {
    setInspectedOrder(null);
    setSelectedPlan(plan);
  };

  const handleOrderCreated = (newOrder: OrderRecord) => {
    setOrders((prev) => {
      const next = [newOrder, ...prev];
      saveOrders(next);
      return next;
    });
  };

  const handleUpdateMerchantSettings = (next: MerchantSettings) => {
    setMerchantSettings(next);
    saveMerchantSettings(next);
  };

  const handleUpdatePlans = (nextPlans: UcPlan[]) => {
    setPlans(nextPlans);
    saveCustomPlans(nextPlans);
  };

  const handleResetPlans = () => {
    setPlans(INITIAL_UC_PLANS);
    saveCustomPlans(INITIAL_UC_PLANS);
  };

  const handleOpenLatestOrder = () => {
    if (orders.length > 0) {
      setSelectedPlan(null);
      setInspectedOrder(orders[0]);
    } else {
      document.getElementById('track-orders')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div id="top" className="min-h-screen bg-[#0B0D10] text-zinc-100 flex flex-col">
      <Navbar
        activeOrderCount={activeOrders.length}
        onOpenMerchantSetup={() => setIsMerchantModalOpen(true)}
        onOpenLatestOrder={handleOpenLatestOrder}
      />

      {latestActiveOrder && (
        <div className="border-b border-amber-400/20 bg-amber-400/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 py-2 text-xs">
            <div className="flex items-center gap-2 text-amber-200 min-w-0">
              <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                Order <span className="font-mono font-semibold text-white">{latestActiveOrder.orderId}</span> ({latestActiveOrder.planTitle}) · Wait{' '}
                <span className="font-mono font-bold text-amber-300 tabular-nums">
                  {formatCountdown(latestActiveOrder.deliveryEndsAt - nowTs)}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPlan(null);
                setInspectedOrder(latestActiveOrder);
              }}
              className="font-semibold text-amber-300 hover:text-amber-200 underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              View Status
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">
        {/* Compact One-Line Store Header + Top BGMI UID Bar + UC Plans */}
        <section id="uc-plans" className="py-8 sm:py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-6">
            {/* Single-Line Compact Store Strip with UC Photo + Top UID Input */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#13161B] p-4 sm:p-5">
              <div className="flex items-center gap-4 min-w-0">
                <ProductImage
                  src={HERO_BANNER_IMAGE}
                  alt="BGMI Unknown Cash UC"
                  fallbackLabel="BGMI UC"
                  className="h-14 w-20 sm:h-16 sm:w-24 rounded-xl bg-black object-contain p-1 shrink-0 border border-white/10"
                />
                <div className="min-w-0">
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-white truncate">
                    BGMI UC Store · Instant Top-Up
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-400 truncate">
                    Enter UID, click Buy UC for direct QR & PhonePe / Navi UPI, wait 5 mins.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                <label htmlFor="top-bgmi-uid" className="sr-only">
                  Enter BGMI UID
                </label>
                <input
                  id="top-bgmi-uid"
                  type="text"
                  inputMode="numeric"
                  value={playerUid}
                  onChange={(e) => setPlayerUid(e.target.value.replace(/[^\d]/g, '').slice(0, 13))}
                  placeholder="Enter BGMI UID (e.g. 5492817364)"
                  className="w-full sm:w-60 rounded-xl border border-white/15 bg-[#0B0D10] px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsMerchantModalOpen(true)}
                  className="rounded-xl border border-white/15 bg-[#0B0D10] px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:border-amber-400/60 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  Set QR / Prices
                </button>
              </div>
            </div>

            {/* Compact UC Plans Strip (Small Tight Cards inside one clean view) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  onClick={() => handleBuyUc(plan)}
                  className="group flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-[#13161B] hover:border-amber-400/60 transition-colors cursor-pointer"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-black p-2">
                    <ProductImage
                      src={plan.image}
                      alt={`${plan.title} BGMI UC`}
                      fallbackLabel={plan.title}
                      className="h-full w-full object-contain group-hover:scale-[1.04] transition-transform duration-200"
                    />
                  </div>

                  <div className="p-3 space-y-2.5">
                    <div>
                      <p className="font-display text-base font-bold text-white leading-tight">
                        {plan.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                        {plan.bonusUc > 0
                          ? `${plan.totalUc.toLocaleString('en-IN')} Total UC`
                          : 'Direct UID Credit'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                      <span className="font-mono text-sm font-bold text-amber-400 tabular-nums">
                        {formatInr(plan.priceInr)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyUc(plan);
                        }}
                        className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Buy UC
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Compact Order History & 5-Min Tracker */}
        <OrderTrackerSection
          orders={orders}
          onInspectOrder={(order) => {
            setSelectedPlan(null);
            setInspectedOrder(order);
          }}
        />
      </main>

      <footer className="border-t border-white/10 bg-[#0B0D10] py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 text-xs text-zinc-500">
          <p>BattleDrop UC Store · Instant BGMI Top-Up</p>
          <button
            type="button"
            onClick={() => setIsMerchantModalOpen(true)}
            className="hover:text-zinc-300 transition-colors cursor-pointer"
          >
            QR Setup
          </button>
        </div>
      </footer>

      <CheckoutDrawer
        plan={selectedPlan}
        activeOrder={inspectedOrder}
        initialUid={playerUid}
        onUidChange={setPlayerUid}
        merchantSettings={merchantSettings}
        onUpdateMerchantSettings={handleUpdateMerchantSettings}
        onOrderCreated={handleOrderCreated}
        onClose={() => {
          setSelectedPlan(null);
          setInspectedOrder(null);
        }}
      />

      <MerchantQrModal
        isOpen={isMerchantModalOpen}
        settings={merchantSettings}
        plans={plans}
        onSaveSettings={handleUpdateMerchantSettings}
        onUpdatePlans={handleUpdatePlans}
        onResetPlans={handleResetPlans}
        onClose={() => setIsMerchantModalOpen(false)}
      />
    </div>
  );
}
