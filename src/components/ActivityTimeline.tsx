import { useState } from 'react';
import { PhoneCall, Mail, StickyNote, CheckCircle2, Circle, CalendarClock, Trash2 } from 'lucide-react';
import { api } from '../api';
import type { ActivityWithNames } from '../types';
import { formatDate, formatDateTime, TypeBadge } from './ui';

const TYPE_ICONS = {
  note: StickyNote,
  call: PhoneCall,
  email: Mail,
};

export default function ActivityTimeline({
  activities,
  onChange,
  compact,
}: {
  activities: ActivityWithNames[];
  onChange: () => void;
  compact?: boolean;
}) {
  const [deleting, setDeleting] = useState<number | null>(null);

  if (activities.length === 0) {
    return <p className="panel-empty">No activity logged yet.</p>;
  }

  const toggleDone = async (a: ActivityWithNames) => {
    await api.setActivityDone(a.id, a.done === 0);
    onChange();
  };

  const remove = async (id: number) => {
    setDeleting(id);
    await api.deleteActivity(id);
    setDeleting(null);
    onChange();
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="timeline">
      {activities.map((a) => {
        const Icon = TYPE_ICONS[a.type];
        const isTask = a.due_date !== null && a.due_date !== '';
        const isOverdue = isTask && a.done === 0 && (a.due_date ?? '') < today;
        return (
          <div key={a.id} className={`timeline-item${a.done === 1 ? ' done' : ''}`}>
            <div className="timeline-icon">
              <Icon size={15} />
            </div>
            <div className="timeline-body">
              <div className="timeline-head">
                <TypeBadge type={a.type} />
                <span className="cell-muted">{formatDateTime(a.happened_at)}</span>
                {!compact && a.contact_name && <span className="cell-muted">· {a.contact_name}</span>}
                {!compact && a.deal_name && (
                  <button
                    className="link-cell"
                    onClick={async () => {
                      const deal = await api.getDeal(Number(a.deal_id));
                      window.location.href = `/deals/${deal.id}`;
                    }}
                  >
                    · {a.deal_name}
                  </button>
                )}
                <div className="timeline-actions">
                  {isTask && (
                    <button
                      className={`task-toggle${a.done === 1 ? ' on' : ''}${isOverdue ? ' overdue' : ''}`}
                      onClick={() => toggleDone(a)}
                      title={a.done === 1 ? 'Mark not done' : 'Mark done'}
                    >
                      {a.done === 1 ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                      <span>
                        {a.done === 1
                          ? 'Done'
                          : isOverdue
                            ? `Overdue · ${formatDate(a.due_date)}`
                            : `Due ${formatDate(a.due_date)}`}
                      </span>
                    </button>
                  )}
                  <button className="icon-btn danger" onClick={() => remove(a.id)} aria-label="Delete activity">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {isTask && a.done === 0 && (
                <div className={`due-flag${isOverdue ? ' overdue' : ''}`}>
                  <CalendarClock size={13} />
                  {isOverdue ? 'Overdue' : 'Upcoming'} · {formatDate(a.due_date)}
                </div>
              )}
              {a.description && <p className="timeline-text">{a.description}</p>}
            </div>
          </div>
        );
      })}
      {deleting !== null && <div className="loading-inline">Deleting…</div>}
    </div>
  );
}
