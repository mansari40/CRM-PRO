import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase } from '../server/db';
import * as store from '../server/store';
import { seed } from '../server/seed';
import type Database from 'better-sqlite3';

let db: Database.Database;

beforeEach(() => {
  db = openDatabase(':memory:');
  seed(db);
});

describe('organizations CRUD', () => {
  it('lists seeded organizations', () => {
    const orgs = store.listOrganizations(db);
    expect(orgs.length).toBeGreaterThanOrEqual(5);
    expect(orgs[0]).toHaveProperty('name');
  });

  it('creates an organization', () => {
    const org = store.createOrganization(db, { name: 'Test Corp', website: 'test.example.com' }) as any;
    expect(org.id).toBeGreaterThan(0);
    expect(org.name).toBe('Test Corp');
    expect(org.website).toBe('test.example.com');
  });

  it('reads an organization', () => {
    const org = store.createOrganization(db, { name: 'Read Co' }) as any;
    const found = store.getOrganization(db, org.id) as any;
    expect(found.name).toBe('Read Co');
    expect(store.getOrganization(db, 99999)).toBeUndefined();
  });

  it('updates an organization', () => {
    const org = store.createOrganization(db, { name: 'Old Name' }) as any;
    const updated = store.updateOrganization(db, org.id, { name: 'New Name', industry: 'Tech' }) as any;
    expect(updated.name).toBe('New Name');
    expect(updated.industry).toBe('Tech');
  });

  it('deletes an organization', () => {
    const org = store.createOrganization(db, { name: 'To Delete' }) as any;
    expect(store.deleteOrganization(db, org.id)).toBe(true);
    expect(store.getOrganization(db, org.id)).toBeUndefined();
    expect(store.deleteOrganization(db, 99999)).toBe(false);
  });

  it('searches organizations by name and industry', () => {
    const results = store.listOrganizations(db, 'Acme');
    expect(results.length).toBe(1);
    const industry = store.listOrganizations(db, 'Technology');
    expect(industry.length).toBeGreaterThanOrEqual(3);
    expect(store.listOrganizations(db, 'zzz-no-match')).toHaveLength(0);
  });
});

describe('contacts CRUD', () => {
  it('creates a contact', () => {
    const contact = store.createContact(db, {
      name: 'Jane Doe',
      email: 'jane@example.com',
      status: 'qualified',
    }) as any;
    expect(contact.id).toBeGreaterThan(0);
    expect(contact.status).toBe('qualified');
  });

  it('reads and updates a contact', () => {
    const contact = store.createContact(db, { name: 'Jane Doe' }) as any;
    const updated = store.updateContact(db, contact.id, { email: 'new@example.com', status: 'customer' }) as any;
    expect(updated.email).toBe('new@example.com');
    expect(updated.status).toBe('customer');
  });

  it('deletes a contact', () => {
    const contact = store.createContact(db, { name: 'Jane Doe' }) as any;
    expect(store.deleteContact(db, contact.id)).toBe(true);
    expect(store.getContact(db, contact.id)).toBeUndefined();
  });

  it('searches contacts by name and email', () => {
    const byName = store.listContacts(db, 'Laura');
    expect(byName.length).toBe(1);
    const byEmail = store.listContacts(db, 'laura.chen@');
    expect(byEmail.length).toBe(1);
    const byOrg = store.listContacts(db, 'Acme');
    expect(byOrg.length).toBeGreaterThanOrEqual(2);
  });

  it('filters contacts by status', () => {
    const leads = store.listContacts(db, '', 'lead');
    expect(leads.length).toBeGreaterThan(0);
    expect(leads.every((c: any) => c.status === 'lead')).toBe(true);
    const customers = store.listContacts(db, '', 'customer');
    expect(customers.every((c: any) => c.status === 'customer')).toBe(true);
  });
});

describe('deals CRUD', () => {
  it('creates a deal with defaults', () => {
    const deal = store.createDeal(db, { name: 'Big Deal', value: 50000, close_date: '2026-12-31' }) as any;
    expect(deal.stage).toBe('new');
    expect(deal.probability).toBe(10);
    expect(deal.value).toBe(50000);
  });

  it('reads and updates a deal', () => {
    const deal = store.createDeal(db, { name: 'Big Deal', value: 50000 }) as any;
    const updated = store.updateDeal(db, deal.id, { value: 60000, close_date: '2027-01-15' }) as any;
    expect(updated.value).toBe(60000);
    expect(updated.close_date).toBe('2027-01-15');
  });

  it('deletes a deal', () => {
    const deal = store.createDeal(db, { name: 'Big Deal' }) as any;
    expect(store.deleteDeal(db, deal.id)).toBe(true);
    expect(store.getDeal(db, deal.id)).toBeUndefined();
  });

  it('searches deals by name and organization', () => {
    const byName = store.listDeals(db, 'Fastener');
    expect(byName.length).toBe(1);
    const byOrg = store.listDeals(db, 'Northwind');
    expect(byOrg.length).toBeGreaterThanOrEqual(3);
  });

  it('filters deals by stage', () => {
    const won = store.listDeals(db, '', 'won');
    expect(won.length).toBeGreaterThan(0);
    expect(won.every((d: any) => d.stage === 'won')).toBe(true);
  });

  it('sets stage via pipeline drag with matching probability', () => {
    const deal = store.createDeal(db, { name: 'Pipeline Deal', value: 100000 }) as any;
    const stages: [string, number][] = [
      ['qualified', 25],
      ['proposal', 50],
      ['negotiation', 75],
      ['won', 100],
      ['lost', 0],
    ];
    for (const [stage, probability] of stages) {
      const updated = store.setDealStage(db, deal.id, stage) as any;
      expect(updated.stage).toBe(stage);
      expect(updated.probability).toBe(probability);
    }
  });
});

describe('activities', () => {
  it('creates and reads an activity', () => {
    const contact = store.createContact(db, { name: 'Jane Doe' }) as any;
    const activity = store.createActivity(db, {
      type: 'call',
      contact_id: contact.id,
      description: 'Talked through requirements',
      due_date: '2026-12-01',
    }) as any;
    expect(activity.id).toBeGreaterThan(0);
    expect(activity.done).toBe(0);
    expect(activity.contact_name).toBe('Jane Doe');
  });

  it('toggles activity done state', () => {
    const activity = store.createActivity(db, { type: 'note', description: 'Todo' }) as any;
    const done = store.setActivityDone(db, activity.id, true) as any;
    expect(done.done).toBe(1);
    const undone = store.setActivityDone(db, activity.id, false) as any;
    expect(undone.done).toBe(0);
  });

  it('lists activities newest first', () => {
    const contact = store.createContact(db, { name: 'Jane Doe' }) as any;
    store.createActivity(db, { type: 'note', contact_id: contact.id, description: 'first', happened_at: '2026-01-01T10:00:00Z' });
    store.createActivity(db, { type: 'note', contact_id: contact.id, description: 'second', happened_at: '2026-01-02T10:00:00Z' });
    const list = store.listActivities(db, contact.id) as any[];
    expect(list[0].description).toBe('second');
  });

  it('deletes an activity', () => {
    const activity = store.createActivity(db, { type: 'email', description: 'Go away' }) as any;
    expect(store.deleteActivity(db, activity.id)).toBe(true);
    expect(store.getActivity(db, activity.id)).toBeUndefined();
  });
});

describe('seed data', () => {
  it('has deals in multiple stages', () => {
    const deals = store.listDeals(db) as any[];
    const stages = new Set(deals.map((d) => d.stage));
    expect(stages.size).toBeGreaterThanOrEqual(4);
    expect(deals.some((d) => d.stage === 'won')).toBe(true);
    expect(deals.some((d) => d.stage === 'lost')).toBe(true);
  });

  it('has activities in the database', () => {
    const activities = store.listActivities(db);
    expect(activities.length).toBeGreaterThanOrEqual(10);
  });
});
