import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../api';
import type { Deal, Organization, Contact } from '../types';
import {
  Modal,
  ConfirmDialog,
  Field,
  SearchBox,
  EmptyState,
  Loading,
  PageHeader,
  StageBadge,
  formatCurrency,
  formatDate,
  STAGE_LABELS,
} from '../components/ui';

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  name: '',
  organization_id: '' as string | number,
  contact_id: '' as string | number,
  stage: 'new',
  value: '',
  probability: '10',
  close_date: '',
};

export default function Deals() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [editing, setEditing] = useState<Deal | 'new' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState<Deal | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setDeals(await api.listDeals(search, stage));
  }, [search, stage]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([api.listOrganizations(), api.listContacts()]).then(([o, c]) => {
      setOrgs(o);
      setContacts(c);
    });
  }, []);

  const orgContacts = useMemo(() => {
    const orgId = form.organization_id === '' ? null : Number(form.organization_id);
    if (orgId === null) return contacts;
    return contacts.filter((c) => c.organization_id === orgId);
  }, [contacts, form.organization_id]);

  const stageTotals = useMemo(() => {
    if (!deals) return 0;
    return deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').reduce((s, d) => s + d.value, 0);
  }, [deals]);

  const openNew = () => {
    setForm(emptyForm);
    setEditing('new');
  };

  const openEdit = (d: Deal) => {
    setForm({
      name: d.name,
      organization_id: d.organization_id ?? '',
      contact_id: d.contact_id ?? '',
      stage: d.stage,
      value: String(d.value),
      probability: String(d.probability),
      close_date: d.close_date?.slice(0, 10) ?? '',
    });
    setEditing(d);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    const value = Number(form.value);
    if (!Number.isFinite(value) || value < 0) {
      setError('Value must be a positive number.');
      return;
    }
    const body: Partial<Deal> = {
      name: form.name,
      organization_id: form.organization_id === '' ? null : Number(form.organization_id),
      contact_id: form.contact_id === '' ? null : Number(form.contact_id),
      stage: form.stage as Deal['stage'],
      value,
      probability: Number(form.probability),
      close_date: form.close_date || '',
    };
    if (editing === 'new') {
      await api.createDeal(body);
    } else if (editing) {
      await api.updateDeal(editing.id, body);
    }
    setEditing(null);
    setError('');
    await load();
  };

  const confirmDelete = async () => {
    if (deleting) await api.deleteDeal(deleting.id);
    setDeleting(null);
    await load();
  };

  if (!deals) return <Loading />;

  return (
    <div className="page">
      <PageHeader
        title="Deals"
        subtitle="Potential sales you're working on."
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Add deal
          </button>
        }
      />

      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search by deal, organization or contact…" />
        <select className="toolbar-select" value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">All stages</option>
          {Object.entries(STAGE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {deals.length > 0 && (
          <span className="toolbar-total">Open value {formatCurrency(stageTotals)}</span>
        )}
      </div>

      <div className="table-card">
        {deals.length === 0 ? (
          <EmptyState message="No deals match your search." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Organization</th>
                <th>Primary contact</th>
                <th>Stage</th>
                <th className="num">Value</th>
                <th className="num">Prob.</th>
                <th>Close date</th>
                <th className="actions-col" />
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="clickable" onClick={() => navigate(`/deals/${d.id}`)}>
                  <td>
                    <div className="cell-primary">{d.name}</div>
                  </td>
                  <td>{(d as unknown as { organization_name?: string }).organization_name ?? '—'}</td>
                  <td>{(d as unknown as { contact_name?: string }).contact_name ?? '—'}</td>
                  <td><StageBadge stage={d.stage} /></td>
                  <td className="num cell-strong">{formatCurrency(d.value)}</td>
                  <td className="num cell-muted">{d.probability}%</td>
                  <td className={d.close_date ? (d.close_date < today() && d.stage !== 'won' && d.stage !== 'lost' ? 'close-date overdue' : '') : ''}>
                    {formatDate(d.close_date)}
                  </td>
                  <td className="actions-col" onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn" onClick={() => openEdit(d)} aria-label="Edit">
                      <Pencil size={15} />
                    </button>
                    <button className="icon-btn danger" onClick={() => setDeleting(d)} aria-label="Delete">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Add deal' : 'Edit deal'} onClose={() => setEditing(null)} wide>
          <div className="form-grid">
            <Field label="Deal name" required>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Q3 platform renewal"
                autoFocus
              />
            </Field>
            <Field label="Organization">
              <select
                value={form.organization_id}
                onChange={(e) => {
                  setForm({ ...form, organization_id: e.target.value, contact_id: '' });
                }}
              >
                <option value="">— None —</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Primary contact">
              <select value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}>
                <option value="">— None —</option>
                {orgContacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Stage">
              <select
                value={form.stage}
                onChange={(e) => {
                  const stage = e.target.value;
                  const defaults: Record<string, number> = { new: 10, qualified: 25, proposal: 50, negotiation: 75, won: 100, lost: 0 };
                  setForm({ ...form, stage, probability: String(defaults[stage] ?? form.probability) });
                }}
              >
                {Object.entries(STAGE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Value (USD)">
              <input
                type="number"
                min={0}
                step={1000}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="50000"
              />
            </Field>
            <Field label="Probability of close (%)">
              <input
                type="number"
                min={0}
                max={100}
                value={form.probability}
                onChange={(e) => setForm({ ...form, probability: e.target.value })}
              />
            </Field>
            <Field label="Close date">
              <input
                type="date"
                value={form.close_date}
                onChange={(e) => setForm({ ...form, close_date: e.target.value })}
              />
            </Field>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save</button>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete deal?"
          message={`"${deleting.name}" will be removed from the pipeline.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
