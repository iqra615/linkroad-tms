-- ============================================================
-- Linkroad TMS — PostgreSQL schema
-- Run with: npm run migrate  (see scripts/migrate.js)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------------
-- USERS  (authentication)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(64) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          VARCHAR(120) NOT NULL,
  role          VARCHAR(32) NOT NULL DEFAULT 'Dispatcher'
                  CHECK (role IN ('Administrator', 'Dispatcher', 'Accounting')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- CUSTOMERS  (shipper / bill-to accounts)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  email       VARCHAR(200),
  address     TEXT,
  terms       VARCHAR(32) NOT NULL DEFAULT 'Net 30',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- CARRIERS  (approved motor carriers)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carriers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  mc_number   VARCHAR(32),
  phone       VARCHAR(32),
  email       VARCHAR(200),
  address     TEXT,
  status      VARCHAR(32) NOT NULL DEFAULT 'Approved'
                CHECK (status IN ('Approved', 'Pending', 'Suspended')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- CONSIGNEES  (delivery locations)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consignees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  address     TEXT,
  contact     VARCHAR(200),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- Sequence used to auto-generate human-friendly load numbers (LRL-1001, ...)
-- ---------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS load_number_seq START WITH 1001;

-- ---------------------------------------------------------------
-- LOADS  (dispatch / load board)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_number         VARCHAR(32) UNIQUE NOT NULL,
  customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
  carrier_id          UUID REFERENCES carriers(id) ON DELETE SET NULL,
  consignee_id        UUID REFERENCES consignees(id) ON DELETE SET NULL,
  origin              TEXT,
  container_number    VARCHAR(64),
  bol_number          VARCHAR(64),
  weight              VARCHAR(64),
  equipment_type      VARCHAR(32),
  commodity_desc      TEXT,
  carrier_rate        NUMERIC(12,2),
  customer_rate       NUMERIC(12,2),
  status              VARCHAR(32) NOT NULL DEFAULT 'Dispatched'
                        CHECK (status IN ('Dispatched','In Transit','At Delivery','Delivered','On Hold','Cancelled')),
  pickup_date         DATE,
  delivery_date       DATE,
  notes               TEXT,
  carrier_pay_status  VARCHAR(16) NOT NULL DEFAULT 'Unpaid'
                        CHECK (carrier_pay_status IN ('Unpaid','Paid')),
  carrier_paid_date   DATE,
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loads_customer  ON loads(customer_id);
CREATE INDEX IF NOT EXISTS idx_loads_carrier   ON loads(carrier_id);
CREATE INDEX IF NOT EXISTS idx_loads_consignee ON loads(consignee_id);
CREATE INDEX IF NOT EXISTS idx_loads_status    ON loads(status);

-- ---------------------------------------------------------------
-- Sequence used to auto-generate invoice numbers (INV-5001, ...)
-- ---------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 5001;

-- ---------------------------------------------------------------
-- INVOICES  (customer billing, tied to a load)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  VARCHAR(32) UNIQUE NOT NULL,
  load_id         UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  amount          NUMERIC(12,2) NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'Draft'
                    CHECK (status IN ('Draft','Sent','Paid','Void')),
  issued_date     DATE,
  due_date        DATE,
  paid_date       DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_load     ON invoices(load_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON invoices(status);

-- NOTE: the updated_at auto-touch triggers live in sql/triggers.sql (they use
-- PL/pgSQL, which requires a real PostgreSQL server — `npm run migrate` applies
-- both files in order). Keeping them separate also lets the automated test
-- suite load just this file into an in-memory SQL engine for fast, dependency-free tests.
