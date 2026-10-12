import { useEffect, useState } from 'react';
import { solanaTransactionService } from '../services/solanaTransactionService';

export function NetworkBadge() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [slot, setSlot] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    solanaTransactionService
      .getClusterHealth()
      .then((res) => {
        if (!mounted) return;
        if (res.ok) {
          setStatus('connected');
          setSlot(res.slot || null);
        } else {
          setStatus('offline');
        }
      })
      .catch(() => {
        if (mounted) setStatus('offline');
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-[#8d958c]">
      <span className="flex items-center gap-1.5 font-medium text-[#f5f7f2]">
        <span
          className={`w-2 h-2 rounded-full ${
            status === 'connected'
              ? 'bg-[#c8ff3d] shadow-[0_0_8px_rgba(200,255,61,0.6)]'
              : status === 'checking'
              ? 'bg-[#ffd166] animate-pulse'
              : 'bg-[#ff5a5f]'
          }`}
        />
        Solana Mainnet
      </span>
      {slot && (
        <>
          <span aria-hidden="true" className="text-[#3b453e]">·</span>
          <span className="font-mono text-[11px] text-[#8d958c] tabular-nums hidden sm:inline">
            slot {slot.toLocaleString()}
          </span>
        </>
      )}
    </div>
  );
}
