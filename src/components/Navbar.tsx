interface NavbarProps {
  activeOrderCount: number;
  onOpenMerchantSetup: () => void;
  onOpenLatestOrder: () => void;
}

export function Navbar({
  activeOrderCount,
  onOpenMerchantSetup,
  onOpenLatestOrder,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0D10]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
        <a
          href="#top"
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
        >
          BattleDrop UC
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400"
        >
          <a
            href="#uc-plans"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            UC Plans
          </a>
          <a
            href="#track-orders"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Order History
          </a>
          <button
            type="button"
            onClick={onOpenMerchantSetup}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            QR Setup
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenLatestOrder}
            className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            {activeOrderCount > 0 ? `Track Order (${activeOrderCount})` : 'Track Order'}
          </button>
        </div>
      </div>
    </header>
  );
}
