import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Globe, Building2 } from 'lucide-react';
import { api } from '../api';
import type { Organization } from '../types';
import { Modal, ConfirmDialog, Field, SearchBox, EmptyState, Loading, PageHeader, formatDate } from '../components/ui';

const emptyForm = { name: '', website: '', industry: '', notes: '' };

export default function Organizations() {
  const [orgs, setOrgs] = useState<Organization[] | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Organization | 'new' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState<Organization | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setOrgs(await api.listOrganizations(search));
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => orgs ?? [],
    [orgs],
  );

  const openNew = () => {
    setForm(emptyForm);
    setEditing('new');
  };

  const openEdit = (org: Organization) => {
    setForm({ name: org.name, website: org.website, industry: org.industry, notes: org.notes });
    setEditing(org);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (editing === 'new') {
      await api.createOrganization(form);
    } else if (editing) {
      await api.updateOrganization(editing.id, form);
    }
    setEditing(null);
    setError('');
    await load();
  };

  const confirmDelete = async () => {
    if (deleting) await api.deleteOrganization(deleting.id);
    setDeleting(null);
    await load();
  };

  if (!orgs) return <Loading />;

  return (
    <div className="page">
      <PageHeader
        title="Organizations"
        subtitle="The companies you do business with."
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Add organization
          </button>
        }
      />

      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search by name, industry or website…" />
      </div>

      <div className="table-card">
        {filtered.length === 0 ? (
          <EmptyState message="No organizations match your search." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Industry</th>
                <th>Website</th>
                <th className="num">Contacts</th>
                <th className="num">Deals</th>
                <th>Created</th>
                <th className="actions-col" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((org) => (
                <tr key={org.id} className="clickable" onClick={() => navigate(`/organizations/${org.id}`)}>
                  <td>
                    <div className="cell-primary">
                      <span className="cell-icon">
                        <Building2 size={16} />
                      </span>
                      {org.name}
                    </div>
                  </td>
                  <td>{org.industry || '—'}</td>
                  <td>
                    {org.website ? (
                      <span className="cell-muted">
                        <Globe size={13} /> {org.website}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="num">{(org as unknown as { contact_count: number }).contact_count ?? 0}</td>
                  <td className="num">{(org as unknown as { deal_count: number }).deal_count ?? 0}</td>
                  <td className="cell-muted">{formatDate(org.created_at)}</td>
                  <td className="actions-col" onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn" onClick={() => openEdit(org)} aria-label="Edit">
                      <Pencil size={15} />
                    </button>
                    <button className="icon-btn danger" onClick={() => setDeleting(org)} aria-label="Delete">
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
        <Modal title={editing === 'new' ? 'Add organization' : 'Edit organization'} onClose={() => setEditing(null)}>
          <div className="form-grid">
            <Field label="Name" required>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Acme Manufacturing"
                autoFocus
              />
            </Field>
            <Field label="Industry">
              <input
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                placeholder="e.g. Manufacturing"
              />
            </Field>
            <Field label="Website">
              <input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="acme.example.com"
              />
            </Field>
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={4}
                placeholder="Anything worth remembering…"
              />
            </Field>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button className="btn" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={save}>
              Save
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete organization?"
          message={`"${deleting.name}" and its details will be removed. Contacts and deals linked to it will be kept but unlinked.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
