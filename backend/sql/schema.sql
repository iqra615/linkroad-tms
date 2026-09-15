-- ============================================================
-- Intermodal TMS — PostgreSQL schema
-- One system, three operating entities (Link Road Logistics,
-- Express Intermodal Transportation, Prime Intermodal Transportation),
-- shared login, shared carriers/customers/consignees, loads tagged
-- per-entity. Matches the reference prototype shown in the Aug 2026
-- WhatsApp thread with the "Servech" dev team.
-- Run with: npm run migrate
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------------
-- ENTITIES  (the 3 operating companies sharing this one system)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(8) UNIQUE NOT NULL,   -- LRL / EXP / PIT — used as the load-number prefix
  name          VARCHAR(200) NOT NULL,
  address       TEXT,
  email         VARCHAR(200),
  phone         VARCHAR(32),
  website       VARCHAR(200),
  logo_data_uri TEXT,                          -- optional embedded logo for documents
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Each entity gets its own load-number sequence (LRL-1001, PIT-2001, EXP-3001, ...)
CREATE SEQUENCE IF NOT EXISTS entity_lrl_load_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS entity_pit_load_seq START WITH 2001;
CREATE SEQUENCE IF NOT EXISTS entity_exp_load_seq START WITH 3001;

-- ---------------------------------------------------------------
-- USERS  (single shared login across all 3 entities)
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
-- CUSTOMERS  (shared across all entities)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,        -- company name, e.g. "Global Imports Co."
  contact_name VARCHAR(200),                -- contact person, e.g. "John Smith"
  phone       VARCHAR(32),
  email       VARCHAR(200),
  address     TEXT,
  terms       VARCHAR(32) NOT NULL DEFAULT 'Net 30',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- CARRIERS  (shared across all entities)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carriers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(200) NOT NULL,
  mc_number        VARCHAR(32),
  dot_number       VARCHAR(32),
  email            VARCHAR(200),
  phone            VARCHAR(32),
  city             VARCHAR(120),
  state            VARCHAR(64),
  dispatcher_name  VARCHAR(120),   -- the carrier's own dispatch contact (not a system user)
  status           VARCHAR(32) NOT NULL DEFAULT 'Active'
                     CHECK (status IN ('Active', 'Pending', 'Suspended')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- CONSIGNEES  (shared across all entities)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consignees (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(200) NOT NULL,
  email             VARCHAR(200),
  contact           VARCHAR(200),           -- phone / contact details
  address           TEXT,
  important_emails  TEXT,                   -- comma-separated extra emails (ops, manager, etc.)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- LOADS  (the load board — every load belongs to exactly one entity)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_number         VARCHAR(32) UNIQUE NOT NULL,   -- e.g. LRL-1001, PIT-2001, EXP-3001
  entity_id           UUID NOT NULL REFERENCES entities(id),
  dispatcher_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,  -- assigned user
  customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
  carrier_id          UUID REFERENCES carriers(id) ON DELETE SET NULL,
  consignee_id        UUID REFERENCES consignees(id) ON DELETE SET NULL,

  load_type           VARCHAR(16) CHECK (load_type IS NULL OR load_type IN ('Import', 'Export', 'Import / Rail', 'Export / Rail')),
  origin              TEXT,                 -- pickup location
  deliver_to_address  TEXT,                 -- final delivery address (may differ from consignee's own address)
  empty_return_location TEXT,               -- depot address to return the empty container to

  container_number    VARCHAR(64),
  container_type      VARCHAR(32) CHECK (container_type IS NULL OR container_type IN (
                        '20 Standard (20ST)', '40 Standard (40ST)', '40 High Cube (40HC)', '45 High Cube (45HC)',
                        '20 Reefer (20RF)', '40 Reefer (40RF)', 'Open Top (OT)', 'Flat Rack (FR)'
                      )),
  bol_number          VARCHAR(64),          -- Master Bill of Lading (MBL)
  seal_number         VARCHAR(64),
  reference_number     TEXT,                -- can hold multiple comma-separated refs, as seen on real PODs
  pickup_number       VARCHAR(64),

  weight              VARCHAR(64),
  commodity_desc      TEXT,
  packages_qty        VARCHAR(32),
  packages_desc       TEXT,

  eta_date            DATE,                 -- Estimated Time of Arrival
  lfd_date            DATE,                 -- Last Free Date
  pickup_date         DATE,
  delivery_date       DATE,
  empty_return_date   DATE,
  completed_date      DATE,                 -- only meaningful once status = 'Completed'

  carrier_rate        NUMERIC(12,2),
  customer_charge     NUMERIC(12,2),

  status              VARCHAR(32) NOT NULL DEFAULT 'Available for Pickup'
                        CHECK (status IN (
                          'New Load','Available for Pickup','Pickup Scheduled','At Port','Gate Out','Picked Up','In Transit',
                          'Delivery Scheduled','At Delivery','Delivered','POD Pending','Empty Pending','Empty / POD Pending',
                          'Empty Return Scheduled','Empty Returned','Completed','Find Carrier','Carrier Assigned','Customs Hold',
                          'Freight Hold','Exam Site','Driver Delayed','Port Congestion','Cancelled'
                        )),

  carrier_pay_status  VARCHAR(24) NOT NULL DEFAULT 'Pending'
                        CHECK (carrier_pay_status IN ('Invoice Received','Pending','Done')),
  carrier_paid_date   DATE,

  notes               TEXT,
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loads_entity     ON loads(entity_id);
CREATE INDEX IF NOT EXISTS idx_loads_customer   ON loads(customer_id);
CREATE INDEX IF NOT EXISTS idx_loads_carrier    ON loads(carrier_id);
CREATE INDEX IF NOT EXISTS idx_loads_consignee  ON loads(consignee_id);
CREATE INDEX IF NOT EXISTS idx_loads_status     ON loads(status);
CREATE INDEX IF NOT EXISTS idx_loads_dispatcher ON loads(dispatcher_user_id);

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
  status          VARCHAR(16) NOT NULL DEFAULT 'Not Sent'
                    CHECK (status IN ('Not Sent','Sent','Paid','Overdue','Void')),
  issued_date     DATE,
  due_date        DATE,
  paid_date       DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_load     ON invoices(load_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON invoices(status);

-- NOTE: updated_at auto-touch triggers live in sql/triggers.sql (PL/pgSQL,
-- requires real PostgreSQL — see scripts/migrate.js). Kept separate so the
-- test suite can load just this file into pg-mem, an in-memory SQL engine.
