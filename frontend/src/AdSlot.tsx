import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    ADS_PUB_ID?: string;
    adsbygoogle?: unknown[];
  }
}

// Set in index.html. While it still contains the XXXX placeholder,
// no ad code is loaded and every slot renders as nothing.
const pubId = () => window.ADS_PUB_ID ?? '';
const adsEnabled = () => pubId() !== '' && !pubId().includes('XXXX');

/**
 * A responsive Google AdSense unit. Renders nothing until a real
 * publisher ID is set in index.html (see ADS_PUB_ID there).
 * The `slot` prop is the ad-unit ID from your AdSense dashboard.
 */
export default function AdSlot({ slot, className = '', label = 'Advertisement' }: {
  slot: string;
  className?: string;
  label?: string;
}) {
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    const ins = insRef.current;
    if (!ins || !adsEnabled()) return;
    // Guard against double pushes (React StrictMode re-runs effects in dev).
    if (ins.getAttribute('data-adsbygoogle-status')) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch { /* loader not ready — slot stays empty */ }
  }, []);

  if (!adsEnabled()) return null;
  return (
    <aside className={className}>
      <span className="mb-1.5 block text-center text-[9px] font-bold uppercase tracking-[.2em] text-stone-400">{label}</span>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={pubId()}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
