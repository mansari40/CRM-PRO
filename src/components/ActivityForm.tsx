import { useState } from 'react';
import { Modal, Field } from './ui';
import { api } from '../api';
import type { ActivityType } from '../types';

const today = () => new Date().toISOString().slice(0, 10);

export default function ActivityForm({
  initialType = 'note',
  contactId,
  dealId,
  onClose,
  onSaved,
}: {
  initialType?: ActivityType;
  contactId?: number;
  dealId?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<ActivityType>(initialType);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [happenedAt, setHappenedAt] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    if (!description.trim()) {
      setError('Please describe the activity.');
      return;
    }
    await api.createActivity({
      type,
      contact_id: contactId ?? null,
      deal_id: dealId ?? null,
      description: description.trim(),
      due_date: dueDate || null,
      happened_at: happenedAt ? new Date(happenedAt).toISOString() : new Date().toISOString(),
    });
    onSaved();
  };

  return (
    <Modal title="Log activity" onClose={onClose} wide>
      <div className="activity-form">
        <div className="segmented" role="tablist">
          {(['note', 'call', 'email'] as ActivityType[]).map((t) => (
            <button key={t} className={type === t ? 'seg-active' : ''} onClick={() => setType(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <Field label="Description" required>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder={
              type === 'call'
                ? 'What was discussed on the call?'
                : type === 'email'
                  ? 'What was sent or received?'
                  : 'Write a quick note…'
            }
            autoFocus
          />
        </Field>
        <div className="form-grid">
          <Field label="Date">
            <input type="datetime-local" value={happenedAt} onChange={(e) => setHappenedAt(e.target.value)} />
          </Field>
          <Field label="Follow-up due date (optional)">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={today()} />
          </Field>
        </div>
        <p className="field-hint">
          Give this activity a due date to turn it into a follow-up task on the dashboard.
        </p>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save activity</button>
        </div>
      </div>
    </Modal>
  );
}
