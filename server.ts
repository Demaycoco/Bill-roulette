import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import type { Table, PreparedRound } from './src/types';

const app = express();

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = Number(process.argv[portArgIndex + 1]);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  // In this container environment, nginx listens on 8080 and proxies to 3000.
  // The dev server must always run on port 3000.
  const envPort = Number(process.env.PORT);
  if (envPort && envPort !== 8080) {
    return envPort;
  }
  return 3000;
}

const PORT = getPort();

app.use(express.json());

// In-memory shared persistence stores (synchronized for all devices connected to the server)
const tablesStore = new Map<string, Table>();
const roundsStore: PreparedRound[] = [];

// --- API ROUTES FOR CROSS-DEVICE MULTIPLAYER ---

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: Date.now(), service: 'bill-roulette-shared-server' });
});

// Real-Time Currency Rates Cache
interface CachedRatesPayload {
  success: boolean;
  base: string;
  solPriceUsd: number;
  rates: Record<string, number>;
  lastUpdated: number;
  provider: string;
}

let ratesCache: CachedRatesPayload | null = null;
let lastRatesFetchTime = 0;
const RATES_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

// Fallback rates snapshot (real snapshot to ensure 100% uptime even if upstream rate-limits)
const FALLBACK_FIAT_RATES: Record<string, number> = {
  USD: 1,
  NGN: 1330.99,
  EUR: 0.924,
  GBP: 0.772,
  KES: 129.5,
  GHS: 15.65,
  ZAR: 17.52,
  CAD: 1.385,
  AUD: 1.512,
  JPY: 152.8,
  INR: 84.15,
  BRL: 5.72,
  AED: 3.6725,
  SAR: 3.75,
  SGD: 1.325,
  CHF: 0.865,
  CNY: 7.12,
  MXN: 20.15,
  PHP: 58.2,
  KRW: 1385.0,
  EGP: 48.9,
  UGX: 3670.0,
  TZS: 2650.0,
  RWF: 1365.0,
  ETB: 118.0,
  TRY: 34.3,
  SEK: 10.65,
  NOK: 10.95,
  PLN: 4.02,
  BND: 1.325,
  CLP: 955.0,
  COP: 4320.0,
  PEN: 3.76,
  QAR: 3.64,
  KWD: 0.307,
};

async function fetchRealExchangeRates(): Promise<CachedRatesPayload> {
  const now = Date.now();
  if (ratesCache && now - lastRatesFetchTime < RATES_CACHE_TTL_MS) {
    return ratesCache;
  }

  let liveFiatRates = ratesCache?.rates || { ...FALLBACK_FIAT_RATES };
  let liveSolPrice = ratesCache?.solPriceUsd || 109.38;
  let fetchedProvider = 'ExchangeRate-API & Live Spot';

  // 1. Fetch real fiat rates
  try {
    const fiatRes = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'User-Agent': 'BillRoulette-App/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (fiatRes.ok) {
      const fiatData = (await fiatRes.json()) as { rates?: Record<string, number> };
      if (fiatData.rates && typeof fiatData.rates === 'object') {
        liveFiatRates = fiatData.rates;
      }
    }
  } catch (err) {
    console.warn('[rates] Warning: Fiat rates fetch failed, using cached/snapshot rates', err);
  }

  // 2. Fetch real SOL price in USD
  try {
    const solRes = await fetch('https://api.coinbase.com/v2/prices/SOL-USD/spot', {
      headers: { 'User-Agent': 'BillRoulette-App/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (solRes.ok) {
      const solData = (await solRes.json()) as { data?: { amount?: string } };
      const parsed = parseFloat(solData.data?.amount || '');
      if (!isNaN(parsed) && parsed > 0) {
        liveSolPrice = parsed;
      }
    }
  } catch {
    // Try secondary provider (Binance)
    try {
      const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT', {
        signal: AbortSignal.timeout(5000),
      });
      if (binanceRes.ok) {
        const binanceData = (await binanceRes.json()) as { price?: string };
        const parsed = parseFloat(binanceData.price || '');
        if (!isNaN(parsed) && parsed > 0) {
          liveSolPrice = parsed;
        }
      }
    } catch {
      // Use existing or fallback
    }
  }

  ratesCache = {
    success: true,
    base: 'USD',
    solPriceUsd: Number(liveSolPrice.toFixed(4)),
    rates: liveFiatRates,
    lastUpdated: now,
    provider: fetchedProvider,
  };
  lastRatesFetchTime = now;

  return ratesCache;
}

// Endpoint: GET /api/rates
app.get('/api/rates', async (_req, res) => {
  try {
    const data = await fetchRealExchangeRates();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch currency rates',
    });
  }
});

// List all tables
app.get('/api/tables', (_req, res) => {
  const tables = Array.from(tablesStore.values()).sort((a, b) => b.createdAt - a.createdAt);
  res.json(tables);
});

// Lookup table by room code
app.get('/api/tables/code/:code', (req, res) => {
  const cleanCode = req.params.code.trim().toUpperCase();
  const table = Array.from(tablesStore.values()).find(
    (t) => t.roomCode.toUpperCase() === cleanCode
  );
  if (!table) {
    res.status(404).json({ code: 'TABLE_NOT_FOUND', message: `No table with code ${cleanCode}` });
    return;
  }
  res.json(table);
});

// Get table by ID
app.get('/api/tables/:id', (req, res) => {
  const table = tablesStore.get(req.params.id);
  if (!table) {
    res.status(404).json({ code: 'TABLE_NOT_FOUND', message: `No table with ID ${req.params.id}` });
    return;
  }
  res.json(table);
});

// Create table
app.post('/api/tables', (req, res) => {
  const table: Table = req.body;
  if (!table || !table.id || !table.roomCode) {
    res.status(400).json({ code: 'INVALID_TABLE', message: 'Table payload missing id or roomCode.' });
    return;
  }

  table.roomCode = table.roomCode.trim().toUpperCase();
  table.version = 1;
  table.createdAt = Date.now();
  table.updatedAt = Date.now();

  tablesStore.set(table.id, table);
  res.status(201).json(table);
});

// Update table
app.put('/api/tables/:id', (req, res) => {
  const { table, expectedVersion } = req.body;
  const existing = tablesStore.get(req.params.id);

  if (!existing) {
    res.status(404).json({ code: 'TABLE_NOT_FOUND', message: `Table ${req.params.id} not found.` });
    return;
  }

  if (expectedVersion !== undefined && existing.version !== expectedVersion) {
    res.status(409).json({
      code: 'CONCURRENT_MODIFICATION',
      message: 'Table was modified concurrently. Please refresh and retry.',
    });
    return;
  }

  const updated: Table = {
    ...table,
    version: (existing.version || 0) + 1,
    updatedAt: Date.now(),
  };

  tablesStore.set(req.params.id, updated);
  res.json(updated);
});

// Delete table
app.delete('/api/tables/:id', (req, res) => {
  tablesStore.delete(req.params.id);
  res.status(204).send();
});

// Rounds API
app.get('/api/rounds', (req, res) => {
  const { tableId } = req.query;
  if (tableId && typeof tableId === 'string') {
    res.json(roundsStore.filter((r) => r.tableId === tableId));
    return;
  }
  res.json(roundsStore);
});

app.get('/api/rounds/:id', (req, res) => {
  const round = roundsStore.find((r) => r.roundId === req.params.id);
  if (!round) {
    res.status(404).json({ code: 'ROUND_NOT_FOUND', message: 'Round not found' });
    return;
  }
  res.json(round);
});

app.post('/api/rounds', (req, res) => {
  const round: PreparedRound = req.body;
  const index = roundsStore.findIndex((r) => r.roundId === round.roundId);
  if (index >= 0) {
    roundsStore[index] = round;
  } else {
    roundsStore.unshift(round);
  }
  res.status(201).json(round);
});

app.delete('/api/rounds', (_req, res) => {
  roundsStore.length = 0;
  res.status(204).send();
});

// --- SECURE SOLANA MAINNET RPC PROXY ---
// Proxies JSON-RPC calls without exposing private RPC provider credentials / API keys to frontend bundles
app.post('/api/solana-rpc', async (req, res) => {
  const serverRpcUrl =
    process.env.SOLANA_MAINNET_RPC_URL ||
    process.env.SOLANA_RPC_URL ||
    'https://api.mainnet-beta.solana.com';

  try {
    const upstreamRes = await fetch(serverRpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BillRoulette-Server/1.0',
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(20000),
    });

    const data = await upstreamRes.json();
    res.status(upstreamRes.status).json(data);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(502).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: `Upstream Solana Mainnet RPC gateway failure: ${errorMsg}`,
      },
      id: req.body?.id ?? null,
    });
  }
});

// Network status and cluster validation endpoint
app.get('/api/network/status', (_req, res) => {
  res.json({
    cluster: 'mainnet-beta',
    genesisHash: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
    officialFallbackRpc: 'https://api.mainnet-beta.solana.com',
    dedicatedRpcConfigured: Boolean(process.env.SOLANA_MAINNET_RPC_URL),
    status: 'ACTIVE_MAINNET_BETA',
  });
});

// --- VITE MIDDLEWARE (SPA FALLBACK) ---
async function startServer() {
  const distPath = path.resolve(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isProd = process.env.NODE_ENV === 'production' && hasDist;

  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return next();
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace?.(e as Error);
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bill Roulette server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
