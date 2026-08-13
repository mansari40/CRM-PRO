import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { api } from '../api';
import type { Deal, DealStage } from '../types';
import { Loading, PageHeader, formatCurrency, STAGE_LABELS } from '../components/ui';

const STAGES: DealStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

function DealCard({ deal, onOpen }: { deal: Deal; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(deal.id),
  });
  const style = { transform: CSS.Translate.toString(transform) };
  const lost = deal.stage === 'lost';
  const won = deal.stage === 'won';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={`pipeline-card${lost ? ' is-lost' : ''}${won ? ' is-won' : ''}${isDragging ? ' dragging' : ''}`}
    >
      <div className="pipeline-card-head">
        <span className="pipeline-card-name">{deal.name}</span>
        <GripVertical size={14} className="grip" />
      </div>
      <div className="pipeline-card-org">{(deal as unknown as { organization_name?: string }).organization_name ?? 'No organization'}</div>
      <div className="pipeline-card-foot">
        <span className="pipeline-card-value">{formatCurrency(deal.value)}</span>
        <span className="pipeline-card-prob">{deal.probability}%</span>
      </div>
      {deal.close_date && (
        <div className="pipeline-card-close">Closes {new Date(deal.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
      )}
    </div>
  );
}

function Column({
  stage,
  deals,
  onOpenDeal,
}: {
  stage: DealStage;
  deals: Deal[];
  onOpenDeal: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((s, d) => s + d.value, 0);
  const weighted = deals.reduce((s, d) => s + (d.value * d.probability) / 100, 0);

  return (
    <div className={`pipeline-column${isOver ? ' drop-over' : ''}`}>
      <div className="pipeline-column-head">
        <span className={`stage-dot stage-dot-${stage}`} />
        <h3>{STAGE_LABELS[stage]}</h3>
        <span className="pipeline-count">{deals.length}</span>
      </div>
      <div ref={setNodeRef} className="pipeline-column-body">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onOpen={() => onOpenDeal(deal.id)} />
        ))}
        {deals.length === 0 && <div className="pipeline-empty">Drop deals here</div>}
      </div>
      <div className="pipeline-column-foot">
        <span>Total {formatCurrency(total)}</span>
        <span className="expected">Expected {formatCurrency(weighted)}</span>
      </div>
    </div>
  );
}

export default function Pipeline() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(async () => {
    setDeals(await api.listDeals());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const s of STAGES) map[s] = [];
    for (const d of deals ?? []) map[d.stage]?.push(d);
    return map;
  }, [deals]);

  const draggingDeal = useMemo(
    () => (deals ?? []).find((d) => String(d.id) === draggingId),
    [deals, draggingId],
  );

  const onDragStart = (e: DragStartEvent) => setDraggingId(String(e.active.id));

  const PROBABILITY: Record<DealStage, number> = {
    new: 10,
    qualified: 25,
    proposal: 50,
    negotiation: 75,
    won: 100,
    lost: 0,
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setDraggingId(null);
    const dealId = Number(e.active.id);
    const target = e.over?.id as string | undefined;
    if (!target || !STAGES.includes(target as DealStage)) return;
    const deal = deals?.find((d) => d.id === dealId);
    if (!deal || deal.stage === target) return;

    setDeals((prev) =>
      (prev ?? []).map((d) =>
        d.id === dealId ? { ...d, stage: target as DealStage, probability: PROBABILITY[target as DealStage] } : d,
      ),
    );
    await api.setDealStage(dealId, target);
    await load();
  };

  if (!deals) return <Loading />;

  const openValue = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').reduce((s, d) => s + d.value, 0);
  const expected = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').reduce((s, d) => s + (d.value * d.probability) / 100, 0);

  return (
    <div className="page pipeline-page">
      <PageHeader
        title="Pipeline"
        subtitle="Drag a deal card between columns to update its stage."
      />
      <div className="pipeline-summary">
        <span>Open pipeline value <strong>{formatCurrency(openValue)}</strong></span>
        <span>Expected revenue <strong>{formatCurrency(expected)}</strong></span>
      </div>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDraggingId(null)}>
        <div className="pipeline-board">
          {STAGES.map((stage) => (
            <Column key={stage} stage={stage} deals={byStage[stage]} onOpenDeal={(id) => navigate(`/deals/${id}`)} />
          ))}
        </div>
        <DragOverlay>
          {draggingDeal && (
            <div className="pipeline-card overlay-card">
              <div className="pipeline-card-head">
                <span className="pipeline-card-name">{draggingDeal.name}</span>
              </div>
              <div className="pipeline-card-org">{(draggingDeal as unknown as { organization_name?: string }).organization_name ?? 'No organization'}</div>
              <div className="pipeline-card-foot">
                <span className="pipeline-card-value">{formatCurrency(draggingDeal.value)}</span>
                <span className="pipeline-card-prob">{draggingDeal.probability}%</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
