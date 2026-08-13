import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Mail, Phone } from 'lucide-react';
import { api } from '../api';
import type { Contact, Organization } from '../types';
import {
  Modal,
  ConfirmDialog,
  Field,
  SearchBox,
  EmptyState,
  Loading,
  PageHeader,
  StatusBadge,
  formatDate,
  STATUS_LABELS,
} from '../components/ui';

const emptyForm = { name: '', email: '', phone: '', job_title: '', organization_id: '' as string | number, status: 'lead' };

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<Contact | 'new' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setContacts(await api.listContacts(search, status));
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.listOrganizations().then(setOrgs).catch(() => setOrgs([]));
  }, []);

  const openNew = () => {
    setForm(emptyForm);
    setEditing('new');
  };

  const openEdit = (c: Contact) => {
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone,
      job_title: c.job_title,
      organization_id: c.organization_id ?? '',
      status: c.status,
    });
    setEditing(c);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    const body = {
      ...form,
      organization_id: form.organization_id === '' ? null : Number(form.organization_id),
      status: form.status as Contact['status'],
    };
    if (editing === 'new') {
      await api.createContact(body);
    } else if (editing) {
      await api.updateContact(editing.id, body);
    }
    setEditing(null);
    setError('');
    await load();
  };

  const confirmDelete = async () => {
    if (deleting) await api.deleteContact(deleting.id);
    setDeleting(null);
    await load();
  };

  if (!contacts) return <Loading />;

  return (
    <div className="page">
      <PageHeader
        title="Contacts"
        subtitle="The people you deal with, across every organization."
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Add contact
          </button>
        }
      />

      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search by name, email, phone or title…" />
        <div className="segmented" role="tablist">
          {['', 'lead', 'qualified', 'customer'].map((s) => (
            <button
              key={s || 'all'}
              className={status === s ? 'seg-active' : ''}
              onClick={() => setStatus(s)}
            >
              {s === '' ? 'All' : STATUS_LABELS[s as keyof typeof STATUS_LABELS]}
            </button>
          ))}
        </div>
      </div>

      <div className="table-card">
        {contacts.length === 0 ? (
          <EmptyState message="No contacts match your search." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Title</th>
                <th>Organization</th>
                <th>Status</th>
                <th>Created</th>
                <th className="actions-col" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="clickable" onClick={() => navigate(`/contacts/${c.id}`)}>
                  <td>
                    <div className="cell-primary">
                      <span className="avatar">{c.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
                      {c.name}
                    </div>
                  </td>
                  <td className="cell-muted">{c.email || '—'}</td>
                  <td className="cell-muted">{c.phone || '—'}</td>
                  <td>{c.job_title || '—'}</td>
                  <td>{(c as unknown as { organization_name?: string }).organization_name ?? '—'}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="cell-muted">{formatDate(c.created_at)}</td>
                  <td className="actions-col" onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn" onClick={() => openEdit(c)} aria-label="Edit">
                      <Pencil size={15} />
                    </button>
                    <button className="icon-btn danger" onClick={() => setDeleting(c)} aria-label="Delete">
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
        <Modal title={editing === 'new' ? 'Add contact' : 'Edit contact'} onClose={() => setEditing(null)} wide>
          <div className="form-grid">
            <Field label="Name" required>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Jane Smith"
                autoFocus
              />
            </Field>
            <Field label="Job title">
              <input
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                placeholder="e.g. Procurement Manager"
              />
            </Field>
            <Field label="Email">
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@company.com"
              />
            </Field>
            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="555-0100"
              />
            </Field>
            <Field label="Organization">
              <select
                value={form.organization_id}
                onChange={(e) => setForm({ ...form, organization_id: e.target.value })}
              >
                <option value="">— None —</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="lead">Lead</option>
                <option value="qualified">Qualified</option>
                <option value="customer">Customer</option>
              </select>
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
          title="Delete contact?"
          message={`"${deleting.name}" will be removed from your CRM.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
