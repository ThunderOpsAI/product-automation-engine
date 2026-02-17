-- ═══════════════════════════════════════════
-- SYSTEM 1: DIGITAL ARBITRAGE FACTORY
-- Database Migration 001
-- ═══════════════════════════════════════════

-- ─────────────────────
-- Shared Foundation Tables
-- ─────────────────────

-- All agent task executions
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  input JSONB,
  output JSONB,
  evidence JSONB,
  confidence_score INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Human review queue
CREATE TABLE approvals_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  system VARCHAR(50),                    -- 'digital_products'
  reason TEXT,
  context JSONB,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(255)
);

-- Daily revenue snapshots
CREATE TABLE metrics_daily (
  date DATE,
  system VARCHAR(50),
  revenue_gross DECIMAL(10,2) DEFAULT 0,
  revenue_net DECIMAL(10,2) DEFAULT 0,
  units_sold INTEGER DEFAULT 0,
  metadata JSONB,
  PRIMARY KEY (date, system)
);

-- ─────────────────────
-- System 1 Tables
-- ─────────────────────

-- Products master record
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  price_usd DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'draft',
  -- status values: 'draft' | 'pending_approval' | 'approved' | 'listed' | 'paused' | 'removed'
  confidence_score INTEGER,
  source_type VARCHAR(50),  -- 'public_domain' | 'cc0' | 'purchased' | 'original'
  license_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- Version history (track enhancements over time)
CREATE TABLE product_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  version INTEGER NOT NULL,
  artifacts_path TEXT,       -- Supabase Storage path
  changelog TEXT,
  quality_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Marketplace listings (one product → many platforms)
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  platform VARCHAR(50) NOT NULL,          -- 'gumroad' | 'etsy'
  platform_listing_id VARCHAR(255),
  url TEXT,
  tags TEXT[],
  seo_title VARCHAR(500),
  thumbnail_url TEXT,
  status VARCHAR(50),                     -- 'live' | 'paused' | 'removed'
  views_total INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,4),           -- e.g. 0.0082 = 0.82%
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- Individual sales
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  platform VARCHAR(50),
  platform_sale_id VARCHAR(255),          -- for refund API calls
  customer_email VARCHAR(255),            -- for support lookup
  amount_gross DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  amount_net DECIMAL(10,2),
  sale_date TIMESTAMP,
  refunded BOOLEAN DEFAULT FALSE,
  refund_date TIMESTAMP,
  metadata JSONB
);

-- A/B experiments
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  type VARCHAR(50),                        -- 'price' | 'title' | 'thumbnail'
  control_value JSONB,
  variant_value JSONB,
  hypothesis TEXT,
  status VARCHAR(50) DEFAULT 'running',   -- 'proposed' | 'running' | 'complete' | 'rejected'
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  result_lift_pct DECIMAL(5,2),
  result_winner VARCHAR(10),              -- 'control' | 'variant'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Support tickets
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id),
  platform VARCHAR(50),
  customer_email VARCHAR(255),
  message TEXT,
  action_taken VARCHAR(50),              -- 'auto_respond' | 'refund' | 'escalate'
  response_sent TEXT,
  escalation_reason TEXT,
  escalation_priority VARCHAR(20),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────
-- Indexes
-- ─────────────────────

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_approvals_status ON approvals_queue(status);
CREATE INDEX idx_listings_platform ON listings(platform, status);
CREATE INDEX idx_listings_product ON listings(product_id);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_listing ON sales(listing_id);
CREATE INDEX idx_experiments_listing ON experiments(listing_id);
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_support_tickets_sale ON support_tickets(sale_id);
