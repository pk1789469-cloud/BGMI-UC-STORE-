import { useState } from 'react';
import { Coins } from 'lucide-react';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function ProductImage({ src, alt, className = '', fallbackLabel }: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-amber-950/30 text-amber-400 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Coins className="w-10 h-10 mb-2 opacity-90" />
        <span className="text-xs font-medium tracking-wide text-zinc-300 px-3 text-center">
          {fallbackLabel || 'BGMI Unknown Cash'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
