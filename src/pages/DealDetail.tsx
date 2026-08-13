import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Plus } from 'lucide-react';
import { api } from '../api';
import type { DealDetail as DDetail, Organization, Contact } from '../types';
import {
  Modal,
  ConfirmDialog,
  Field,
  Loading,
  PageHeader,
  StageBadge,
  formatCurrency,
  formatDate,
  STAGE_LABELS,
} from '../components/ui';
import ActivityTimeline from '../components/ActivityTimeline';
import ActivityForm from '../components/ActivityForm';

const today = () => new Date().toISOString().slice(0, 10);

export default function DealDetail() {
  const { id } = useParams();
  const dealId = Number(id);
  const [deal, setDeal] = useState<DDetail | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    organization_id: '',
    contact_id: '',
    stage: 'new' as DDetail['stage'],
    value: '',
    probability: '',
    close_date: '',
  });
  const [deleting, setDeleting] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setDeal(await api.getDeal(dealId));
  }, [dealId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([api.listOrganizations(), api.listContacts()]).then(([o, c]) => {
      setOrgs(o);
      setContacts(c);
    });
  }, []);

  const save = async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    await api.updateDeal(dealId, {
      name: form.name,
      organization_id: form.organization_id === '' ? null : Number(form.organization_id),
      contact_id: form.contact_id === '' ? null : Number(form.contact_id),
      stage: form.stage,
      value: Number(form.value) || 0,
      probability: Number(form.probability),
      close_date: form.close_date || '',
    });    setEditing(false);
    await load();
  };

  const confirmDelete = async () => {
    await api.deleteDeal(dealId);
    navigate('/deals');
  };

  if (!deal) return <Loading />;

  const weighted = (deal.value * deal.probability) / 100;
  const overdue = deal.close_date && deal.close_date < today() && deal.stage !== 'won' && deal.stage !== 'lost';

  return (
    <div className="page">
      <Link to="/deals" className="back-link">
        <ArrowLeft size={15} /> Deals
      </Link>

      <PageHeader
        title={deal.name}
        subtitle={
          <>
            <StageBadge stage={deal.stage} />{' '}
            {deal.organization && <Link to={`/organizations/${deal.organization.id}`}>{deal.organization.name}</Link>}
          </>
        }
        actions={
          <>
            <button className="btn" onClick={() => setShowActivity(true)}>
              <Plus size={15} /> Log activity
            </button>
            <button
              className="btn"
              onClick={() => {
                setForm({
                  name: deal.name,
                  organization_id: deal.organization_id != null ? String(deal.organization_id) : '',
                  contact_id: deal.contact_id != null ? String(deal.contact_id) : '',
                  stage: deal.stage,
                  value: String(deal.value),
                  probability: String(deal.probability),
                  close_date: deal.close_date?.slice(0, 10) ?? '',
                });
                setEditing(true);
              }}
            >
              <Pencil size={15} /> Edit
            </button>
            <button className="btn btn-danger-outline" onClick={() => setDeleting(true)}>
              <Trash2 size={15} /> Delete
            </button>
          </>
        }
      />

      <div className="deal-stats">
        <div className="stat-card stat-inline">
          <div className="stat-label">Value</div>
          <div className="stat-value">{formatCurrency(deal.value)}</div>
        </div>
        <div className="stat-card stat-inline">
          <div className="stat-label">Probability</div>
          <div className="stat-value">{deal.probability}%</div>
        </div>
        <div className="stat-card stat-inline">
          <div className="stat-label">Expected value</div>
          <div className="stat-value">{formatCurrency(weighted)}</div>
          <div className="stat-sub">value × probability</div>
        </div>
        <div className={`stat-card stat-inline${overdue ? ' stat-overdue' : ''}`}>
          <div className="stat-label">Close date</div>
          <div className="stat-value">{formatDate(deal.close_date)}</div>
          <div className="stat-sub">{overdue ? 'Overdue' : deal.stage === 'won' ? 'Closed won' : deal.stage === 'lost' ? 'Closed lost' : ''}</div>
        </div>
      </div>

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Details</h2>
          </div>
          <dl className="details-list">
            <div>
              <dt>Organization</dt>
              <dd>
                {deal.organization ? (
                  <Link to={`/organizations/${deal.organization.id}`}>{deal.organization.name}</Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt>Primary contact</dt>
              <dd>
                {deal.contact ? (
                  <Link to={`/contacts/${deal.contact.id}`}>
                    {deal.contact.name}{deal.contact.job_title ? ` · ${deal.contact.job_title}` : ''}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt>Stage</dt>
              <dd>
                <select
                  className="inline-select"
                  value={deal.stage}
                  onChange={async (e) => {
                    await api.setDealStage(dealId, e.target.value);
                    await load();
                  }}
                >
                  {Object.entries(STAGE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </dd>
            </div>
            <div>
              <dt>Value</dt>
              <dd>{formatCurrency(deal.value)}</dd>
            </div>
            <div>
              <dt>Probability</dt>
              <dd>{deal.probability}%</dd>
            </div>
            <div>
              <dt>Close date</dt>
              <dd>{formatDate(deal.close_date)}</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Activity timeline</h2>
          </div>
          <ActivityTimeline activities={deal.activities} onChange={load} compact={false} />
        </section>
      </div>

      {showActivity && (
        <ActivityForm
          dealId={dealId}
          onClose={() => setShowActivity(false)}
          onSaved={() => {
            setShowActivity(false);
            load();
          }}
        />
      )}

      {editing && (
        <Modal title="Edit deal" onClose={() => setEditing(false)} wide>
          <div className="form-grid">
            <Field label="Deal name" required>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Organization">
              <select value={form.organization_id} onChange={(e) => setForm({ ...form, organization_id: e.target.value, contact_id: '' })}>
                <option value="">— None —</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Primary contact">
              <select value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}>
                <option value="">— None —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Stage">
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as DDetail['stage'] })}>
                {Object.entries(STAGE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Value (USD)">
              <input type="number" min={0} step={1000} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </Field>
            <Field label="Probability (%)">
              <input type="number" min={0} max={100} value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
            </Field>
            <Field label="Close date">
              <input type="date" value={form.close_date} onChange={(e) => setForm({ ...form, close_date: e.target.value })} />
            </Field>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save</button>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete deal?"
          message={`"${deal.name}" will be removed from the pipeline.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
