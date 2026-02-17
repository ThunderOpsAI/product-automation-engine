# Phase 1 -- Foundation (Days 1-3)

## Stack

-   Supabase (Postgres + Storage + Auth)
-   GitHub Actions + n8n (Orchestration)
-   Node.js API on Vercel
-   Supabase Storage for artifacts
-   Gumroad + Etsy APIs

## Environment Variables

-   SUPABASE_URL
-   SUPABASE_KEY
-   CLAUDE_API_KEY
-   GUMROAD_ACCESS_TOKEN
-   ETSY_API_KEY
-   ETSY_SHOP_ID
-   STRIPE_SECRET_KEY
-   RESEND_API_KEY

## Core Tables

-   products
-   product_versions
-   listings
-   sales
-   tasks
-   approvals_queue
-   metrics_daily

## Core Endpoints

-   POST /api/tasks/create
-   GET /api/approvals/queue
-   POST /api/approvals/{id}/approve
-   GET /api/metrics/daily
