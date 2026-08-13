import type Database from 'better-sqlite3';

const daysFromNow = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
const dateFromNow = (days: number) => {
  const d = new Date(Date.now() + days * 86400000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const dateInPast = (monthsAgo: number, day = 15) => {
  const d = new Date(Date.now() - monthsAgo * 30.44 * 86400000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(day)}`;
};

export function seed(db: Database.Database) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM organizations').get() as { n: number };
  if (count.n > 0) return;

  const insertOrg = db.prepare(
    'INSERT INTO organizations (name, website, industry, notes) VALUES (?,?,?,?)',
  );
  const orgs = [
    ['Acme Manufacturing', 'acme.example.com', 'Manufacturing', 'Mid-sized manufacturer of industrial fasteners. Prefers phone calls over email.'],
    ['Northwind Traders', 'northwind.example.com', 'Wholesale Distribution', 'Wholesale distributor of food and beverage products across three states.'],
    ['Globex Corporation', 'globex.example.com', 'Technology', 'Enterprise software consultancy. Decision cycle runs 4–6 weeks.'],
    ['Initech', 'initech.example.com', 'Technology', 'Legacy IT services firm. Budgets locked in Q1, slow procurement.'],
    ['Stark Industries', 'stark.example.com', 'Aerospace', 'Aerospace components supplier. Strict security review on new vendors.'],
    ['Wayne Enterprises', 'wayne.example.com', 'Conglomerate', 'Conglomerate with strong brand recognition. Expansions planned next year.'],
    ['Umbrella Health', 'umbrella.example.com', 'Healthcare', 'Healthcare network. Renewals and upgrades evaluated each fall.'],
    ['Vandelay Industries', 'vandelay.example.com', 'Construction', 'Construction firm focused on commercial projects.'],
    ['Hooli', 'hooli.example.com', 'Technology', 'Large tech company with aggressive timelines.'],
    ['Pied Piper', 'piedpiper.example.com', 'Software', 'Startup building data compression tools. Small team, fast decisions.'],
  ] as const;
  const orgIds = orgs.map((o) => Number(insertOrg.run(...o).lastInsertRowid));

  const insertContact = db.prepare(
    'INSERT INTO contacts (name, email, phone, job_title, organization_id, status) VALUES (?,?,?,?,?,?)',
  );
  const contacts: [string, string, string, string, number, string][] = [
    ['Sarah Mitchell', 'sarah.mitchell@acme.example.com', '555-0142', 'VP Procurement', orgIds[0], 'customer'],
    ['James O\'Brien', 'james.obrien@acme.example.com', '555-0187', 'Operations Director', orgIds[0], 'qualified'],
    ['Laura Chen', 'laura.chen@northwind.example.com', '555-0119', 'Purchasing Manager', orgIds[1], 'customer'],
    ['Michael Foster', 'michael.foster@northwind.example.com', '555-0164', 'CFO', orgIds[1], 'lead'],
    ['Priya Sharma', 'priya.sharma@globex.example.com', '555-0133', 'Head of Engineering', orgIds[2], 'qualified'],
    ['David Kim', 'david.kim@globex.example.com', '555-0158', 'IT Director', orgIds[2], 'customer'],
    ['Rachel Green', 'rachel.green@initech.example.com', '555-0121', 'CIO', orgIds[3], 'qualified'],
    ['Tony Alvarez', 'tony.alvarez@stark.example.com', '555-0147', 'Supply Chain Lead', orgIds[4], 'lead'],
    ['Bruce Wayne', 'bruce.wayne@wayne.example.com', '555-0109', 'Director of Operations', orgIds[5], 'qualified'],
    ['Emily Watson', 'emily.watson@umbrella.example.com', '555-0172', 'Clinical Procurement', orgIds[6], 'customer'],
    ['George Costanza', 'george.costanza@vandelay.example.com', '555-0151', 'Import/Export Analyst', orgIds[7], 'lead'],
    ['Gavin Belson', 'gavin.belson@hooli.example.com', '555-0193', 'SVP Enterprise Sales', orgIds[8], 'qualified'],
    ['Richard Hendricks', 'richard.hendricks@piedpiper.example.com', '555-0138', 'CEO', orgIds[9], 'qualified'],
    ['Erlich Bachman', 'erlich.bachman@piedpiper.example.com', '555-0126', 'Growth Advisor', orgIds[9], 'lead'],
  ];
  const contactIds = contacts.map((c) => Number(insertContact.run(...c).lastInsertRowid));

  const insertDeal = db.prepare(
    'INSERT INTO deals (name, organization_id, contact_id, stage, value, probability, close_date) VALUES (?,?,?,?,?,?,?)',
  );
  const deals: [string, number, number, string, number, number, string][] = [
    ['Fastener renewal — Q3', orgIds[0], contactIds[0], 'won', 42000, 100, dateInPast(2, 18)],
    ['Automation line expansion', orgIds[0], contactIds[1], 'negotiation', 87500, 75, dateFromNow(14)],
    ['Inventory tracking rollout', orgIds[0], contactIds[1], 'proposal', 32000, 50, dateFromNow(30)],
    ['Seasonal restock — Northwind', orgIds[1], contactIds[2], 'won', 96000, 100, dateInPast(1, 10)],
    ['Distribution network upgrade', orgIds[1], contactIds[2], 'qualified', 150000, 25, dateFromNow(60)],
    ['Cold-chain monitoring pilot', orgIds[1], contactIds[3], 'new', 28000, 10, dateFromNow(90)],
    ['Analytics platform (enterprise)', orgIds[2], contactIds[4], 'negotiation', 120000, 75, dateFromNow(21)],
    ['Dev tooling license renewal', orgIds[2], contactIds[5], 'won', 54000, 100, dateInPast(4, 22)],
    ['Legacy system modernization', orgIds[3], contactIds[6], 'proposal', 210000, 50, dateFromNow(45)],
    ['Hardware refresh assessment', orgIds[3], contactIds[6], 'qualified', 45000, 25, dateFromNow(75)],
    ['Component supply agreement', orgIds[4], contactIds[7], 'new', 300000, 10, dateFromNow(120)],
    ['Enterprise logistics suite', orgIds[5], contactIds[8], 'proposal', 185000, 50, dateFromNow(35)],
    ['Medical imaging procurement', orgIds[6], contactIds[9], 'won', 76000, 100, dateInPast(3, 8)],
    ['Pharmacy management upgrade', orgIds[6], contactIds[9], 'qualified', 64000, 25, dateFromNow(50)],
    ['Import documentation tooling', orgIds[7], contactIds[10], 'new', 18000, 10, dateFromNow(100)],
    ['Enterprise data platform', orgIds[8], contactIds[11], 'lost', 250000, 0, dateInPast(2, 5)],
    ['Compression SDK licensing', orgIds[9], contactIds[12], 'qualified', 82000, 25, dateFromNow(40)],
    ['Compression SDK — enterprise tier', orgIds[9], contactIds[13], 'new', 125000, 10, dateFromNow(70)],
    ['Inventory tracking — add-on modules', orgIds[0], contactIds[1], 'won', 14500, 100, dateInPast(5, 12)],
    ['Seasonal restock — spring', orgIds[1], contactIds[2], 'won', 88000, 100, dateInPast(6, 20)],
  ];
  deals.forEach((d) => insertDeal.run(...d));

  const insertActivity = db.prepare(
    'INSERT INTO activities (type, contact_id, deal_id, description, happened_at, due_date, done) VALUES (?,?,?,?,?,?,?)',
  );
  const activities: [string, number | null, number | null, string, string, string | null, number][] = [
    ['call', contactIds[0], 1, 'Spoke with Sarah about the Q3 renewal — signed off, contract sent.', daysFromNow(-60), null, 1],
    ['email', contactIds[1], 2, 'Sent revised proposal with updated pricing on line expansion.', daysFromNow(-3), dateFromNow(2), 0],
    ['call', contactIds[1], 3, 'Walked through the inventory tracking demo. Team impressed.', daysFromNow(-8), null, 1],
    ['note', contactIds[2], 4, 'Northwind restock order shipped in full. Chase add-on modules.', daysFromNow(-25), dateFromNow(10), 0],
    ['call', contactIds[3], 5, 'Intro call with Michael (CFO) — budget approved for network upgrade.', daysFromNow(-6), null, 1],
    ['note', contactIds[3], 6, 'Pilot scope: three cold-chain facilities. Needs IT sign-off.', daysFromNow(-1), dateFromNow(5), 0],
    ['call', contactIds[4], 7, 'Priya confirmed technical fit for analytics platform. Legal reviewing.', daysFromNow(-2), null, 1],
    ['email', contactIds[6], 9, 'Sent SOW for legacy modernization. Waiting on procurement.', daysFromNow(-5), dateFromNow(4), 0],
    ['call', contactIds[8], 12, 'Bruce wants a security questionnaire before final proposal.', daysFromNow(-4), null, 1],
    ['note', contactIds[9], 13, 'Umbrella Health renewal closed. Schedule Q4 check-in.', daysFromNow(-80), dateFromNow(20), 0],
    ['email', contactIds[11], 16, 'Hooli went with a competitor — keep in touch for next cycle.', daysFromNow(-50), null, 1],
    ['call', contactIds[12], 17, 'Richard demoed SDK integration. Moving to trial license.', daysFromNow(-1), dateFromNow(3), 0],
    ['note', contactIds[5], 8, 'Annual renewal completed with no pushback.', daysFromNow(-120), null, 1],
    ['call', contactIds[10], 15, 'George interested but budget is tight. Nurture for next quarter.', daysFromNow(-2), dateFromNow(15), 0],
    ['email', contactIds[13], 18, 'Sent enterprise tier deck to Erlich.', daysFromNow(-7), dateFromNow(7), 0],
    ['note', contactIds[7], 11, 'Stark security review in progress — vendor forms submitted.', daysFromNow(-9), dateFromNow(12), 0],
  ];
  activities.forEach((a) => insertActivity.run(...a));
}
