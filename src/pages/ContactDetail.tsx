import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Mail, Phone, Plus, Building2 } from 'lucide-react';
import { api } from '../api';
import type { ContactDetail as CDetail, ActivityType, Organization } from '../types';
import {
  Modal,
  ConfirmDialog,
  Field,
  Loading,
  PageHeader,
  StatusBadge,
  StageBadge,
  formatCurrency,
  formatDate,
  STATUS_LABELS,
} from '../components/ui';
import ActivityTimeline from '../components/ActivityTimeline';
import ActivityForm from '../components/ActivityForm';

const emptyForm = { name: '', email: '', phone: '', job_title: '', organization_id: '' as string | number, status: 'lead' };

export default function ContactDetail() {
  const { id } = useParams();
  const contactId = Number(id);
  const [contact, setContact] = useState<CDetail | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState(false);
  const [showActivity, setShowActivity] = useState<ActivityType | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setContact(await api.getContact(contactId));
  }, [contactId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.listOrganizations().then(setOrgs).catch(() => setOrgs([]));
  }, []);

  const save = async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    await api.updateContact(contactId, {
      ...form,
      organization_id: form.organization_id === '' ? null : Number(form.organization_id),
      status: form.status as CDetail['status'],
    });
    setEditing(false);
    await load();
  };

  const confirmDelete = async () => {
    await api.deleteContact(contactId);
    navigate('/contacts');
  };

  if (!contact) return <Loading />;

  const openValue = contact.deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').reduce((s, d) => s + d.value, 0);

  return (
    <div className="page">
      <Link to="/contacts" className="back-link">
        <ArrowLeft size={15} /> Contacts
      </Link>

      <PageHeader
        title={contact.name}
        subtitle={contact.job_title || 'Contact'}
        actions={
          <>
            <button className="btn" onClick={() => setShowActivity('call')}>
              <Plus size={15} /> Log activity
            </button>
            <button
              className="btn"
              onClick={() => {
                setForm({
                  name: contact.name,
                  email: contact.email,
                  phone: contact.phone,
                  job_title: contact.job_title,
                  organization_id: contact.organization_id ?? '',
                  status: contact.status,
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

      <div className="contact-banner">
        <div className="avatar avatar-lg">{contact.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div>
        <div className="contact-banner-info">
          <div className="contact-fields">
            {contact.email && (
              <span className="contact-chip">
                <Mail size={14} /> {contact.email}
              </span>
            )}
            {contact.phone && (
              <span className="contact-chip">
                <Phone size={14} /> {contact.phone}
              </span>
            )}
            {contact.organization && (
              <Link to={`/organizations/${contact.organization.id}`} className="contact-chip link-chip">
                <Building2 size={14} /> {contact.organization.name}
              </Link>
            )}
          </div>
          <div className="contact-fields">
            <StatusBadge status={contact.status} />
            <span className="cell-muted">Since {formatDate(contact.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Activity timeline</h2>
          </div>
          <ActivityTimeline activities={contact.activities} onChange={load} compact={false} />
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Deals ({contact.deals.length})</h2>
            <div className="panel-stat">Open value {formatCurrency(openValue)}</div>
          </div>
          {contact.deals.length === 0 ? (
            <p className="panel-empty">No deals with this contact.</p>
          ) : (
            <table className="table table-compact">
              <tbody>
                {contact.deals.map((d) => (
                  <tr key={d.id} className="clickable" onClick={() => navigate(`/deals/${d.id}`)}>
                    <td>
                      <div className="cell-primary">{d.name}</div>
                      <div className="cell-muted">Closes {formatDate(d.close_date)}</div>
                    </td>
                    <td className="num cell-strong">{formatCurrency(d.value)}</td>
                    <td><StageBadge stage={d.stage} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {showActivity && (
        <ActivityForm
          initialType={showActivity}
          contactId={contactId}
          onClose={() => setShowActivity(null)}
          onSaved={() => {
            setShowActivity(null);
            load();
          }}
        />
      )}

      {editing && (
        <Modal title="Edit contact" onClose={() => setEditing(false)} wide>
          <div className="form-grid">
            <Field label="Name" required>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Job title">
              <input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
            </Field>
            <Field label="Email">
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Organization">
              <select value={form.organization_id} onChange={(e) => setForm({ ...form, organization_id: e.target.value })}>
                <option value="">— None —</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="lead">Lead</option>
                <option value="qualified">Qualified</option>
                <option value="customer">Customer</option>
              </select>
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
          title="Delete contact?"
          message={`"${contact.name}" will be removed along with their activity history.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
