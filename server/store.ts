import type Database from 'better-sqlite3';
import { STAGE_PROBABILITY } from './db';

type DB = Database.Database;

export interface OrgInput {
  name: string;
  website?: string;
  industry?: string;
  notes?: string;
}
export interface ContactInput {
  name: string;
  email?: string;
  phone?: string;
  job_title?: string;
  organization_id?: number | null;
  status?: string;
}
export interface DealInput {
  name: string;
  organization_id?: number | null;
  contact_id?: number | null;
  stage?: string;
  value?: number;
  probability?: number;
  close_date?: string;
}
export interface ActivityInput {
  type: string;
  contact_id?: number | null;
  deal_id?: number | null;
  description?: string;
  happened_at?: string;
  due_date?: string | null;
  done?: number;
}

function row<T>(db: DB, sql: string, params: unknown[] = []): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

function rows<T>(db: DB, sql: string, params: unknown[] = []): T[] {
  return db.prepare(sql).all(...params) as T[];
}

/* ---------------- Organizations ---------------- */

export function listOrganizations(db: DB, search = ''): unknown[] {
  const q = `%${search}%`;
  return rows(
    db,
    `SELECT o.*,
       (SELECT COUNT(*) FROM contacts c WHERE c.organization_id = o.id) AS contact_count,
       (SELECT COUNT(*) FROM deals d WHERE d.organization_id = o.id) AS deal_count
     FROM organizations o
     WHERE o.name LIKE ? OR o.industry LIKE ? OR o.website LIKE ?
     ORDER BY o.name COLLATE NOCASE`,
    [q, q, q],
  );
}

export function getOrganization(db: DB, id: number): unknown | undefined {
  return row(db, 'SELECT * FROM organizations WHERE id = ?', [id]);
}

export function createOrganization(db: DB, input: OrgInput): unknown {
  const info = db
    .prepare(
      `INSERT INTO organizations (name, website, industry, notes) VALUES (@name, @website, @industry, @notes)`,
    )
    .run({
      name: input.name,
      website: input.website ?? '',
      industry: input.industry ?? '',
      notes: input.notes ?? '',
    });
  return getOrganization(db, Number(info.lastInsertRowid));
}

export function updateOrganization(db: DB, id: number, input: Partial<OrgInput>): unknown | undefined {
  const current = getOrganization(db, id);
  if (!current) return undefined;
  db.prepare(
    `UPDATE organizations SET name = @name, website = @website, industry = @industry, notes = @notes WHERE id = @id`,
  ).run({
    id,
    name: input.name ?? (current as OrgInput).name,
    website: input.website ?? (current as any).website,
    industry: input.industry ?? (current as any).industry,
    notes: input.notes ?? (current as any).notes,
  });
  return getOrganization(db, id);
}

export function deleteOrganization(db: DB, id: number): boolean {
  return db.prepare('DELETE FROM organizations WHERE id = ?').run(id).changes > 0;
}

/* ---------------- Contacts ---------------- */

export function listContacts(db: DB, search = '', status = ''): unknown[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (search) {
    const q = `%${search}%`;
    where.push('(c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.job_title LIKE ? OR o.name LIKE ?)');
    params.push(q, q, q, q, q);
  }
  if (status) {
    where.push('c.status = ?');
    params.push(status);
  }
  return rows(
    db,
    `SELECT c.*, o.name AS organization_name, o.industry AS organization_industry
     FROM contacts c LEFT JOIN organizations o ON o.id = c.organization_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY c.name COLLATE NOCASE`,
    params,
  );
}

export function getContact(db: DB, id: number): unknown | undefined {
  return row(db, 'SELECT * FROM contacts WHERE id = ?', [id]);
}

export function createContact(db: DB, input: ContactInput): unknown {
  const info = db
    .prepare(
      `INSERT INTO contacts (name, email, phone, job_title, organization_id, status)
       VALUES (@name, @email, @phone, @job_title, @organization_id, @status)`,
    )
    .run({
      name: input.name,
      email: input.email ?? '',
      phone: input.phone ?? '',
      job_title: input.job_title ?? '',
      organization_id: input.organization_id ?? null,
      status: input.status ?? 'lead',
    });
  return getContact(db, Number(info.lastInsertRowid));
}

export function updateContact(db: DB, id: number, input: Partial<ContactInput>): unknown | undefined {
  const current = getContact(db, id);
  if (!current) return undefined;
  const c = current as Record<string, unknown>;
  db.prepare(
    `UPDATE contacts SET name = @name, email = @email, phone = @phone, job_title = @job_title,
       organization_id = @organization_id, status = @status WHERE id = @id`,
  ).run({
    id,
    name: input.name ?? c.name,
    email: input.email ?? c.email,
    phone: input.phone ?? c.phone,
    job_title: input.job_title ?? c.job_title,
    organization_id: input.organization_id !== undefined ? input.organization_id : c.organization_id,
    status: input.status ?? c.status,
  });
  return getContact(db, id);
}

export function deleteContact(db: DB, id: number): boolean {
  return db.prepare('DELETE FROM contacts WHERE id = ?').run(id).changes > 0;
}

/* ---------------- Deals ---------------- */

export function listDeals(db: DB, search = '', stage = ''): unknown[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (search) {
    const q = `%${search}%`;
    where.push('(d.name LIKE ? OR o.name LIKE ? OR c.name LIKE ?)');
    params.push(q, q, q);
  }
  if (stage) {
    where.push('d.stage = ?');
    params.push(stage);
  }
  return rows(
    db,
    `SELECT d.*, o.name AS organization_name, c.name AS contact_name
     FROM deals d
     LEFT JOIN organizations o ON o.id = d.organization_id
     LEFT JOIN contacts c ON c.id = d.contact_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY d.close_date ASC, d.id DESC`,
    params,
  );
}

export function getDeal(db: DB, id: number): unknown | undefined {
  return row(
    db,
    `SELECT d.*, o.name AS organization_name, o.website AS organization_website,
       c.name AS contact_name, c.email AS contact_email, c.job_title AS contact_job_title,
       c.organization_id AS contact_organization_id
     FROM deals d
     LEFT JOIN organizations o ON o.id = d.organization_id
     LEFT JOIN contacts c ON c.id = d.contact_id
     WHERE d.id = ?`,
    [id],
  );
}

export function createDeal(db: DB, input: DealInput): unknown {
  const stage = input.stage ?? 'new';
  const info = db
    .prepare(
      `INSERT INTO deals (name, organization_id, contact_id, stage, value, probability, close_date)
       VALUES (@name, @organization_id, @contact_id, @stage, @value, @probability, @close_date)`,
    )
    .run({
      name: input.name,
      organization_id: input.organization_id ?? null,
      contact_id: input.contact_id ?? null,
      stage,
      value: input.value ?? 0,
      probability:
        input.probability !== undefined ? input.probability : (STAGE_PROBABILITY[stage] ?? 10),
      close_date: input.close_date ?? '',
    });
  return getDeal(db, Number(info.lastInsertRowid));
}

export function updateDeal(db: DB, id: number, input: Partial<DealInput>): unknown | undefined {
  const current = getDeal(db, id);
  if (!current) return undefined;
  const d = current as Record<string, unknown>;
  let probability = input.probability;
  if (probability === undefined) {
    if (input.stage && input.stage !== d.stage) {
      probability = STAGE_PROBABILITY[input.stage] ?? Number(d.probability);
    } else {
      probability = Number(d.probability);
    }
  }
  db.prepare(
    `UPDATE deals SET name = @name, organization_id = @organization_id, contact_id = @contact_id,
       stage = @stage, value = @value, probability = @probability, close_date = @close_date
     WHERE id = @id`,
  ).run({
    id,
    name: input.name ?? d.name,
    organization_id: input.organization_id !== undefined ? input.organization_id : d.organization_id,
    contact_id: input.contact_id !== undefined ? input.contact_id : d.contact_id,
    stage: input.stage ?? d.stage,
    value: input.value !== undefined ? input.value : Number(d.value),
    probability,
    close_date: input.close_date ?? d.close_date,
  });
  return getDeal(db, id);
}

export function setDealStage(db: DB, id: number, stage: string): unknown | undefined {
  const deal = getDeal(db, id);
  if (!deal) return undefined;
  return updateDeal(db, id, { stage, probability: STAGE_PROBABILITY[stage] ?? Number((deal as any).probability) });
}

export function deleteDeal(db: DB, id: number): boolean {
  return db.prepare('DELETE FROM deals WHERE id = ?').run(id).changes > 0;
}

/* ---------------- Activities ---------------- */

const ACTIVITY_SELECT = `SELECT a.*, c.name AS contact_name, d.name AS deal_name, o.name AS organization_name
  FROM activities a
  LEFT JOIN contacts c ON c.id = a.contact_id
  LEFT JOIN deals d ON d.id = a.deal_id
  LEFT JOIN organizations o ON o.id = d.organization_id`;

export function listActivities(db: DB, contactId?: number, dealId?: number, limit = 100): unknown[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (contactId !== undefined) {
    where.push('a.contact_id = ?');
    params.push(contactId);
  }
  if (dealId !== undefined) {
    where.push('a.deal_id = ?');
    params.push(dealId);
  }
  const sql = `${ACTIVITY_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY a.happened_at DESC, a.id DESC LIMIT ?`;
  return rows(db, sql, [...params, limit]);
}

export function getActivity(db: DB, id: number): unknown | undefined {
  return row(db, `${ACTIVITY_SELECT} WHERE a.id = ?`, [id]);
}

export function createActivity(db: DB, input: ActivityInput): unknown {
  const info = db
    .prepare(
      `INSERT INTO activities (type, contact_id, deal_id, description, happened_at, due_date, done)
       VALUES (@type, @contact_id, @deal_id, @description, @happened_at, @due_date, @done)`,
    )
    .run({
      type: input.type,
      contact_id: input.contact_id ?? null,
      deal_id: input.deal_id ?? null,
      description: input.description ?? '',
      happened_at: input.happened_at ?? new Date().toISOString(),
      due_date: input.due_date ?? null,
      done: input.done ?? 0,
    });
  return getActivity(db, Number(info.lastInsertRowid));
}

export function setActivityDone(db: DB, id: number, done: boolean): unknown | undefined {
  const info = db.prepare('UPDATE activities SET done = ? WHERE id = ?').run(done ? 1 : 0, id);
  if (info.changes === 0) return undefined;
  return getActivity(db, id);
}

export function updateActivity(db: DB, id: number, input: Partial<ActivityInput>): unknown | undefined {
  const current = getActivity(db, id);
  if (!current) return undefined;
  const a = current as Record<string, unknown>;
  db.prepare(
    `UPDATE activities SET type = @type, description = @description, due_date = @due_date, done = @done WHERE id = @id`,
  ).run({
    id,
    type: input.type ?? a.type,
    description: input.description ?? a.description,
    due_date: input.due_date !== undefined ? input.due_date : a.due_date,
    done: input.done !== undefined ? input.done : a.done,
  });
  return getActivity(db, id);
}

export function deleteActivity(db: DB, id: number): boolean {
  return db.prepare('DELETE FROM activities WHERE id = ?').run(id).changes > 0;
}

/* ---------------- Dashboard ---------------- */

export function dashboardData(db: DB): unknown {
  const summary = row(
    db,
    `SELECT
       (SELECT COUNT(*) FROM organizations) AS totalOrganizations,
       (SELECT COUNT(*) FROM contacts) AS totalContacts,
       (SELECT COUNT(*) FROM deals WHERE stage NOT IN ('won','lost')) AS openDeals,
       (SELECT COALESCE(SUM(value),0) FROM deals WHERE stage NOT IN ('won','lost')) AS openValue,
       (SELECT COALESCE(SUM(CAST(value AS REAL) * probability / 100),0) FROM deals WHERE stage NOT IN ('won','lost')) AS weightedValue,
       (SELECT COUNT(*) FROM deals WHERE stage = 'won') AS wonDeals,
       (SELECT COALESCE(SUM(value),0) FROM deals WHERE stage = 'won') AS wonRevenue`,
  );

  const months = rows(
    db,
    `SELECT strftime('%Y-%m', close_date) AS month,
       COUNT(*) AS wonCount,
       COALESCE(SUM(value),0) AS revenue
     FROM deals WHERE stage = 'won' AND close_date != ''
     GROUP BY strftime('%Y-%m', close_date)
     ORDER BY month ASC`,
  );

  const pipeline = rows(
    db,
    `SELECT d.stage AS stage,
       COUNT(*) AS count,
       COALESCE(SUM(d.value),0) AS totalValue,
       COALESCE(SUM(CAST(d.value AS REAL) * d.probability / 100),0) AS weightedValue
     FROM deals d
     GROUP BY d.stage`,
  );

  const upcomingTasks = rows(
    db,
    `${ACTIVITY_SELECT} WHERE a.due_date IS NOT NULL AND a.due_date != '' AND a.done = 0
     ORDER BY a.due_date ASC LIMIT 10`,
  );

  const overdueTasks = rows(
    db,
    `${ACTIVITY_SELECT} WHERE a.due_date IS NOT NULL AND a.due_date != '' AND a.done = 0
     AND a.due_date < date('now') ORDER BY a.due_date ASC LIMIT 10`,
  );

  const recentActivity = rows(db, `${ACTIVITY_SELECT} ORDER BY a.happened_at DESC, a.id DESC LIMIT 10`);

  const recentDeals = rows(
    db,
    `SELECT d.*, o.name AS organization_name, c.name AS contact_name
     FROM deals d LEFT JOIN organizations o ON o.id = d.organization_id
     LEFT JOIN contacts c ON c.id = d.contact_id
     ORDER BY d.created_at DESC LIMIT 5`,
  );

  return { summary, months, pipeline, upcomingTasks, overdueTasks, recentActivity, recentDeals };
}
