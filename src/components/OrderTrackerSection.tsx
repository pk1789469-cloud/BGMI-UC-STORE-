import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Search } from 'lucide-react';
import { OrderRecord } from '../types/store';
import { formatCountdown, formatInr } from '../utils/upi';

interface OrderTrackerSectionProps {
  orders: OrderRecord[];
  onInspectOrder: (order: OrderRecord) => void;
}

export function OrderTrackerSection({ orders, onInspectOrder }: OrderTrackerSectionProps) {
  const [query, setQuery] = useState('');
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    if (orders.length === 0) return;
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [orders.length]);

  const filtered = orders.filter((order) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      order.orderId.toLowerCase().includes(q) ||
      order.uid.toLowerCase().includes(q) ||
      order.paymentApp.toLowerCase().includes(q)
    );
  });

  return (
    <section id="track-orders" className="border-t border-white/10 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Order Tracking & 5-Minute Queue
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Track active UC dispatches and completed UPI receipts by Order ID or BGMI UID.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Order ID or UID..."
              className="w-full rounded-xl border border-white/10 bg-[#13161B] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#13161B] p-8 text-center">
            <p className="text-sm font-medium text-zinc-300">
              {orders.length === 0
                ? 'No UC orders placed yet. Select any UC pack above to start a top-up.'
                : 'No matching orders found for your search.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#13161B]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Order ID</th>
                  <th className="px-4 py-3 font-medium">BGMI UID</th>
                  <th className="px-4 py-3 font-medium">UC Pack</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Delivery Status</th>
                  <th className="px-4 py-3 text-right font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((order) => {
                  const remaining = Math.max(0, order.deliveryEndsAt - nowTs);
                  const done = remaining <= 0;
                  return (
                    <tr key={order.orderId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-white whitespace-nowrap">
                        {order.orderId}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-zinc-300 whitespace-nowrap">
                        {order.uid}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-white whitespace-nowrap">
                        {order.planTitle}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-zinc-300 whitespace-nowrap">
                        {order.paymentApp}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-amber-400 tabular-nums whitespace-nowrap">
                        {formatInr(order.priceInr)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {done ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Delivered</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-amber-300 tabular-nums">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Wait {formatCountdown(remaining)}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onInspectOrder(order)}
                          className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                        >
                          View Status
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
