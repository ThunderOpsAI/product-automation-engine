# System 1: Database Schema

**System:** 1 — Digital Arbitrage Factory  
**Database:** Supabase (Postgres)

---

## Tables

### `products`
Core product records.

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  price_usd DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'draft',  -- 'draft', 'approved', 'listed', 'paused'
  confidence_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);
```

---

### `product_versions`
Version history for each product (tracks enhancements over time).

```sql
CREATE TABLE product_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  version INTEGER NOT NULL,
  artifacts_path TEXT,
  changelog TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### `listings`
Marketplace listing records (one product can have multiple listings).

```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  platform VARCHAR(50) NOT NULL,            -- 'gumroad', 'etsy'
  platform_listing_id VARCHAR(255),
  url TEXT,
  tags TEXT[],
  seo_title VARCHAR(500),
  thumbnail_url TEXT,
  status VARCHAR(50),                        -- 'live', 'paused', 'removed'
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);
```

---

### `sales`
Individual sale transactions.

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  platform VARCHAR(50),
  amount_gross DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  amount_net DECIMAL(10,2),
  sale_date TIMESTAMP,
  refunded BOOLEAN DEFAULT FALSE,
  metadata JSONB
);
```

---

## Shared Tables (Common Foundation)
System 1 also uses these shared tables from the Common Foundation:

### `tasks`
All agent task executions are logged here.

```sql
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

CREATE INDEX idx_tasks_status ON tasks(status);
```

### `approvals_queue`
Tasks with confidence < 7 are held here pending human review.

```sql
CREATE TABLE approvals_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  reason TEXT,
  context JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(255)
);

CREATE INDEX idx_approvals_status ON approvals_queue(status);
```

### `metrics_daily`
Daily revenue snapshots per system.

```sql
CREATE TABLE metrics_daily (
  date DATE PRIMARY KEY,
  system VARCHAR(50),             -- 'digital_products' for System 1
  revenue_gross DECIMAL(10,2) DEFAULT 0,
  revenue_net DECIMAL(10,2) DEFAULT 0,
  units_sold INTEGER DEFAULT 0,
  metadata JSONB
);
```

---

## Notes
- All IDs use UUID v4 (`gen_random_uuid()`)
- `metadata JSONB` fields are available on most tables for flexible extension
- `confidence_score` on `products` table reflects Enhancement Agent's quality rating
- Products with `status = 'draft'` are not yet listed and may be pending approval
