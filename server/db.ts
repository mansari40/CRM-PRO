import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export const STAGES = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;
export const STATUSES = ['lead', 'qualified', 'customer'] as const;
export const ACTIVITY_TYPES = ['note', 'call', 'email'] as const;

export const STAGE_PROBABILITY: Record<string, number> = {
  new: 10,
  qualified: 25,
  proposal: 50,
  negotiation: 75,
  won: 100,
  lost: 0,
};

export const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

export const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  customer: 'Customer',
};

export function openDatabase(filename: string): Database.Database {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      website TEXT NOT NULL DEFAULT '',
      industry TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      job_title TEXT NOT NULL DEFAULT '',
      organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead','qualified','customer')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new','qualified','proposal','negotiation','won','lost')),
      value INTEGER NOT NULL DEFAULT 0,
      probability INTEGER NOT NULL DEFAULT 10,
      close_date TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('note','call','email')),
      contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
      deal_id INTEGER REFERENCES deals(id) ON DELETE CASCADE,
      description TEXT NOT NULL DEFAULT '',
      happened_at TEXT NOT NULL DEFAULT (datetime('now')),
      due_date TEXT,
      done INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(organization_id);
    CREATE INDEX IF NOT EXISTS idx_deals_org ON deals(organization_id);
    CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
    CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
    CREATE INDEX IF NOT EXISTS idx_activities_deal ON activities(deal_id);
    CREATE INDEX IF NOT EXISTS idx_activities_due ON activities(due_date);
  `);
}
