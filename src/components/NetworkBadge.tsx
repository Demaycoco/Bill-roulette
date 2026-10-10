import { useEffect, useState } from 'react';
import { solanaTransactionService } from '../services/solanaTransactionService';

export function NetworkBadge() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [slot, setSlot] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    solanaTransactionService
      .getDevnetHealth()
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
    <div className="flex items-center gap-2 text-xs text-zinc-400">
      <span className="flex items-center gap-1.5 font-medium text-zinc-300">
        <span
          className={`w-2 h-2 rounded-full ${
            status === 'connected'
              ? 'bg-[#ccff00] shadow-[0_0_8px_rgba(204,255,0,0.6)]'
              : status === 'checking'
              ? 'bg-amber-400 animate-pulse'
              : 'bg-rose-500'
          }`}
        />
        Solana Devnet
      </span>
      {slot && (
        <>
          <span aria-hidden="true" className="text-zinc-600">·</span>
          <span className="font-mono text-[11px] text-zinc-500 hidden sm:inline">
            slot {slot.toLocaleString()}
          </span>
        </>
      )}
    </div>
  );
}
