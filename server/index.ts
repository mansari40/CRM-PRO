import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db';
import { seed } from './seed';
import * as store from './store';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_PORT = Number(process.env.API_PORT ?? 4901);
const WEB_PORT = Number(process.env.PORT ?? 4900);

const dbFile = process.env.CRM_DB ?? path.join(__dirname, '..', 'data', 'crm.db');
const db = openDatabase(dbFile);
seed(db);

export const app = express();
app.use(express.json());

const wrap =
  (fn: (req: express.Request, res: express.Response) => unknown) =>
  (req: express.Request, res: express.Response) => {
    try {
      const result = fn(req, res);
      if (result !== undefined) res.json(result);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err instanceof Error ? err.message : 'Bad request' });
    }
  };

const id = (req: express.Request) => Number(req.params.id);

/* ---- Organizations ---- */
app.get('/api/organizations', wrap((req, res) => store.listOrganizations(db, String(req.query.search ?? ''))));
app.get('/api/organizations/:id', wrap((req, res) => {
  const org = store.getOrganization(db, id(req)) as any;
  if (!org) { res.status(404).json({ error: 'Not found' }); return; }
  org.contacts = store.listContacts(db).filter((c: any) => c.organization_id === org.id);
  org.deals = store.listDeals(db).filter((d: any) => d.organization_id === org.id);
  return org;
}));
app.post('/api/organizations', wrap((req) => store.createOrganization(db, req.body)));
app.put('/api/organizations/:id', wrap((req) => store.updateOrganization(db, id(req), req.body)));
app.delete('/api/organizations/:id', wrap((req, res) => {
  store.deleteOrganization(db, id(req));
  res.status(204).end();
}));

/* ---- Contacts ---- */
app.get('/api/contacts', wrap((req, res) =>
  store.listContacts(db, String(req.query.search ?? ''), String(req.query.status ?? ''))));
app.get('/api/contacts/:id', wrap((req, res) => {
  const contact = store.getContact(db, id(req)) as any;
  if (!contact) { res.status(404).json({ error: 'Not found' }); return; }
  contact.organization = contact.organization_id ? store.getOrganization(db, contact.organization_id) : null;
  contact.activities = store.listActivities(db, contact.id);
  contact.deals = store.listDeals(db).filter((d: any) => d.contact_id === contact.id);
  return contact;
}));
app.post('/api/contacts', wrap((req) => store.createContact(db, req.body)));
app.put('/api/contacts/:id', wrap((req) => store.updateContact(db, id(req), req.body)));
app.delete('/api/contacts/:id', wrap((req, res) => {
  store.deleteContact(db, id(req));
  res.status(204).end();
}));

/* ---- Deals ---- */
app.get('/api/deals', wrap((req, res) =>
  store.listDeals(db, String(req.query.search ?? ''), String(req.query.stage ?? ''))));
app.get('/api/deals/:id', wrap((req, res) => {
  const deal = store.getDeal(db, id(req)) as any;
  if (!deal) { res.status(404).json({ error: 'Not found' }); return; }
  deal.organization = deal.organization_id ? store.getOrganization(db, deal.organization_id) : null;
  deal.contact = deal.contact_id ? store.getContact(db, deal.contact_id) : null;
  deal.activities = store.listActivities(db, undefined, deal.id);
  return deal;
}));
app.post('/api/deals', wrap((req) => store.createDeal(db, req.body)));
app.put('/api/deals/:id', wrap((req) => store.updateDeal(db, id(req), req.body)));
app.patch('/api/deals/:id/stage', wrap((req) => store.setDealStage(db, id(req), req.body.stage)));
app.delete('/api/deals/:id', wrap((req, res) => {
  store.deleteDeal(db, id(req));
  res.status(204).end();
}));

/* ---- Activities ---- */
app.get('/api/activities', wrap((req, res) =>
  store.listActivities(
    db,
    req.query.contactId ? Number(req.query.contactId) : undefined,
    req.query.dealId ? Number(req.query.dealId) : undefined,
    Number(req.query.limit ?? 100),
  )));
app.post('/api/activities', wrap((req) => store.createActivity(db, req.body)));
app.patch('/api/activities/:id', wrap((req) => {
  const body = req.body;
  if (typeof body.done === 'boolean') return store.setActivityDone(db, id(req), body.done);
  return store.updateActivity(db, id(req), body);
}));
app.delete('/api/activities/:id', wrap((req, res) => {
  store.deleteActivity(db, id(req));
  res.status(204).end();
}));

/* ---- Dashboard ---- */
app.get('/api/dashboard', wrap(() => store.dashboardData(db)));

/* ---- Static serving (production) ---- */
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

function listen(port: number) {
  return new Promise<void>((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => resolve());
    server.on('error', reject);
  });
}

if (process.env.NODE_ENV !== 'test' && process.argv[1] === fileURLToPath(import.meta.url)) {
  const isDev = process.argv.includes('--dev');
  const port = isDev ? API_PORT : WEB_PORT;
  listen(port).then(() => {
    console.log(`Personal CRM API listening on http://localhost:${port}`);
    if (!isDev) console.log(`Open the app at http://localhost:${port}`);
  });
}
