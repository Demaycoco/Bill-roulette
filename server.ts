import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Table, PreparedRound } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory shared persistence stores (synchronized for all devices connected to the server)
const tablesStore = new Map<string, Table>();
const roundsStore: PreparedRound[] = [];

// Seed demo table
const demoTableId = 'tbl_omakase_demo';
tablesStore.set(demoTableId, {
  id: demoTableId,
  name: 'Nobu Omakase Night',
  roomCode: 'NOB882',
  currency: 'USD',
  gameMode: 'individual',
  status: 'OPEN',
  hostId: 'usr_host_demo',
  hostName: 'Chef Jordan',
  hostWalletAddress: '7gP3bM9j8LdF4E2w1K6vB7N3Q8tC5xZ9yA1w2e3r4t5y',
  hostAuthToken: 'tok_demo_host',
  sharedBillCents: 0,
  version: 1,
  createdAt: Date.now() - 1000 * 60 * 45,
  updatedAt: Date.now() - 1000 * 60 * 5,
  participants: [
    {
      id: 'usr_host_demo',
      name: 'Chef Jordan',
      isHost: true,
      orderAmountCents: 12500,
      joinedAt: Date.now() - 1000 * 60 * 45,
      status: 'ACTIVE',
      walletAddress: '7gP3bM9j8LdF4E2w1K6vB7N3Q8tC5xZ9yA1w2e3r4t5y',
    },
    {
      id: 'usr_sarah',
      name: 'Sarah Chen',
      isHost: false,
      orderAmountCents: 9800,
      joinedAt: Date.now() - 1000 * 60 * 35,
      status: 'ACTIVE',
      walletAddress: '4kR2eX5m7T9qW1vL3pZ6yC8bN4mJ2hF5dG8sA9xP3qW',
    },
    {
      id: 'usr_alex',
      name: 'Alex Rivera',
      isHost: false,
      orderAmountCents: 14250,
      joinedAt: Date.now() - 1000 * 60 * 25,
      status: 'ACTIVE',
      walletAddress: '9tY7uI3oP5lK1jH4gF6dE8sA2wQ5zX8cV3bN7mK4jL',
    },
    {
      id: 'usr_elena',
      name: 'Elena Rostova',
      isHost: false,
      orderAmountCents: 8900,
      joinedAt: Date.now() - 1000 * 60 * 15,
      status: 'ACTIVE',
      walletAddress: '2mB8vC4xZ9lK7jH5gF3dE1sA6wQ9zX4cV7bN2mK8jL',
    },
  ],
});

// --- API ROUTES FOR CROSS-DEVICE MULTIPLAYER ---

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: Date.now(), service: 'bill-roulette-shared-server' });
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

// --- VITE MIDDLEWARE (SPA FALLBACK) ---
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bill Roulette server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
