import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import tasksRouter from './routes/tasks.js';
import approvalsRouter from './routes/approvals.js';
import metricsRouter from './routes/metrics.js';
import productsRouter from './routes/products.js';
import listingsRouter from './routes/listings.js';
import supportRouter from './routes/support.js';
import { authMiddleware } from './middleware/auth.js';

// ═══════════════════════════════════════════
// EXPRESS APP
// ═══════════════════════════════════════════

const app = express();
const PORT = process.env.PORT || 3001;

// ─────────────────────
// Middleware
// ─────────────────────

app.use(cors({
    origin: process.env.DASHBOARD_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());
app.use(authMiddleware);

// ─────────────────────
// Health check
// ─────────────────────

app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        system: 'digital_arbitrage_factory',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
    });
});

// ─────────────────────
// Routes
// ─────────────────────

app.use('/api/tasks', tasksRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/products', productsRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/support', supportRouter);

// ─────────────────────
// Error handler
// ─────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[API Error]', err.message);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// ─────────────────────
// Start server
// ─────────────────────

app.listen(PORT, () => {
    console.log(`\n🚀 System 1 API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Mode: ${process.env.NODE_ENV || 'development'}\n`);
});

export default app;
