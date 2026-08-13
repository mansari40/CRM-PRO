import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Globe, Pencil, Trash2, Plus, User, Handshake } from 'lucide-react';
import { api } from '../api';
import type { OrganizationDetail as OrgDetail } from '../types';
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
} from '../components/ui';

const emptyForm = { name: '', website: '', industry: '', notes: '' };

export default function OrganizationDetail() {
  const { id } = useParams();
  const orgId = Number(id);
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setOrg(await api.getOrganization(orgId));
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    await api.updateOrganization(orgId, form);
    setEditing(false);
    await load();
  };

  const confirmDelete = async () => {
    await api.deleteOrganization(orgId);
    navigate('/organizations');
  };

  if (!org) return <Loading />;

  const openDeals = org.deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost');
  const wonRevenue = org.deals.filter((d) => d.stage === 'won').reduce((s, d) => s + d.value, 0);

  return (
    <div className="page">
      <Link to="/organizations" className="back-link">
        <ArrowLeft size={15} /> Organizations
      </Link>

      <PageHeader
        title={org.name}
        subtitle={[org.industry, org.website].filter(Boolean).join(' · ') || 'No details yet'}
        actions={
          <>
            <button className="btn" onClick={() => { setForm({ name: org.name, website: org.website, industry: org.industry, notes: org.notes }); setEditing(true); }}>
              <Pencil size={15} /> Edit
            </button>
            <button className="btn btn-danger-outline" onClick={() => setDeleting(true)}>
              <Trash2 size={15} /> Delete
            </button>
          </>
        }
      />

      {org.notes && (
        <div className="notes-card">
          <h3>Notes</h3>
          <p>{org.notes}</p>
        </div>
      )}

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-header">
            <h2><User size={17} /> Contacts ({org.contacts.length})</h2>
          </div>
          {org.contacts.length === 0 ? (
            <p className="panel-empty">No contacts yet.</p>
          ) : (
            <table className="table table-compact">
              <tbody>
                {org.contacts.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => navigate(`/contacts/${c.id}`)}>
                    <td>
                      <div className="cell-primary">{c.name}</div>
                      <div className="cell-muted">{c.job_title}</div>
                    </td>
                    <td className="cell-muted">{c.email}</td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2><Handshake size={17} /> Deals ({org.deals.length})</h2>
            <div className="panel-stat">Won revenue {formatCurrency(wonRevenue)}</div>
          </div>
          {org.deals.length === 0 ? (
            <p className="panel-empty">No deals yet.</p>
          ) : (
            <table className="table table-compact">
              <tbody>
                {org.deals.map((d) => (
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

      {editing && (
        <Modal title="Edit organization" onClose={() => setEditing(false)}>
          <div className="form-grid">
            <Field label="Name" required>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Industry">
              <input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </Field>
            <Field label="Website">
              <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </Field>
            <Field label="Notes">
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} />
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
          title="Delete organization?"
          message={`"${org.name}" will be removed. Its contacts and deals will be kept but unlinked.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
