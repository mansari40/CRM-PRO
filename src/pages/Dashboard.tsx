import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Building2, Users, Handshake, CircleDollarSign, Trophy, CheckCircle2, Circle, CalendarClock, ArrowRight } from 'lucide-react';
import { api } from '../api';
import type { ActivityWithNames, DashboardData, DealStage } from '../types';
import { Loading, PageHeader, StageBadge, formatCurrency, formatDate, formatDateTime, TypeBadge, STAGE_LABELS } from '../components/ui';

const STAGE_COLORS: Record<DealStage, string> = {
  new: '#94a3b8',
  qualified: '#209dd7',
  proposal: '#753991',
  negotiation: '#ecad0a',
  won: '#16a34a',
  lost: '#ef4444',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  const load = useCallback(async () => {
    setData(await api.dashboard());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleTask = async (a: ActivityWithNames) => {
    await api.setActivityDone(a.id, a.done === 0);
    await load();
  };

  const monthRange = useMemo(() => {
    if (!data) return [];
    const months = data.months;
    if (months.length === 0) return [];
    const first = months[0].month;
    const last = months[months.length - 1].month;
    const out: { month: string; label: string }[] = [];
    const [fy, fm] = first.split('-').map(Number);
    const [ly, lm] = last.split('-').map(Number);
    let y = fy, m = fm;
    let guard = 0;
    while (guard++ < 48) {
      out.push({ month: `${y}-${String(m).padStart(2, '0')}`, label: new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' }) });
      if (y === ly && m === lm) break;
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    return out;
  }, [data]);

  const chartData = useMemo(() => {
    const byMonth: Record<string, { wonCount: number; revenue: number }> = {};
    for (const m of monthRange) byMonth[m.month] = { wonCount: 0, revenue: 0 };
    for (const p of data?.months ?? []) {
      if (byMonth[p.month]) byMonth[p.month] = { wonCount: p.wonCount, revenue: p.revenue };
    }
    return monthRange.map(({ month, label }) => ({
      label,
      won: byMonth[month].wonCount,
      revenue: byMonth[month].revenue,
    }));
  }, [data, monthRange]);

  const pipelineChart = useMemo(() => {
    if (!data) return [];
    return data.pipeline.map((col) => ({
      stage: STAGE_LABELS[col.stage],
      totalValue: col.totalValue,
      expected: Math.round(col.weightedValue),
      count: col.count,
    }));
  }, [data]);

  if (!data) return <Loading />;

  const { summary } = data;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        subtitle={`How sales are going · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`}
      />

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label"><Building2 size={14} /> Organizations</div>
          <div className="stat-value">{summary.totalOrganizations}</div>
          <Link to="/organizations" className="stat-sub link">View all</Link>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Users size={14} /> Contacts</div>
          <div className="stat-value">{summary.totalContacts}</div>
          <Link to="/contacts" className="stat-sub link">View all</Link>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Handshake size={14} /> Open deals</div>
          <div className="stat-value">{summary.openDeals}</div>
          <div className="stat-sub">{formatCurrency(summary.openValue)} total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><CircleDollarSign size={14} /> Expected revenue</div>
          <div className="stat-value">{formatCurrency(summary.weightedValue)}</div>
          <div className="stat-sub">value × probability</div>
        </div>
        <div className="stat-card stat-won">
          <div className="stat-label"><Trophy size={14} /> Won</div>
          <div className="stat-value">{summary.wonDeals} deals</div>
          <div className="stat-sub">{formatCurrency(summary.wonRevenue)} revenue</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="panel chart-panel">
          <div className="panel-header">
            <h2>Deals won per month</h2>
            <span className="panel-stat">{summary.wonDeals} total won</span>
          </div>
          {chartData.length === 0 ? (
            <p className="panel-empty">No won deals yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Bar dataKey="won" name="Deals won" fill="#ecad0a" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel chart-panel">
          <div className="panel-header">
            <h2>Revenue won per month</h2>
            <span className="panel-stat">{formatCurrency(summary.wonRevenue)} total</span>
          </div>
          {chartData.length === 0 ? (
            <p className="panel-empty">No won revenue yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000)}k`} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={48} />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v: number | string) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#209dd7" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Line type="monotone" dataKey="revenue" name="Trend" stroke="#753991" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="panel pipeline-panel">
        <div className="panel-header">
          <h2>Pipeline health</h2>
          <Link to="/pipeline" className="panel-stat link">Open board <ArrowRight size={13} /></Link>
        </div>
        {pipelineChart.length === 0 ? (
          <p className="panel-empty">No deals in the pipeline.</p>
        ) : (
          <div className="pipeline-viz">
            <div className="pipeline-bars">
              {pipelineChart.map((row) => (
                <div key={row.stage} className="pipeline-bar-row">
                  <div className="pipeline-bar-label">
                    <span className={`stage-dot stage-dot-${row.stage.toLowerCase() as DealStage}`} />
                    {row.stage}
                    <span className="pipeline-bar-count">{row.count}</span>
                  </div>
                  <div className="pipeline-bar-track">
                    <div
                      className="pipeline-bar-fill"
                      style={{ width: `${Math.min(100, (row.totalValue / Math.max(...pipelineChart.map((r) => r.totalValue))) * 100)}%`, background: STAGE_COLORS[row.stage.toLowerCase() as DealStage] }}
                    />
                  </div>
                  <div className="pipeline-bar-values">
                    <span>{formatCurrency(row.totalValue)}</span>
                    <span className="expected">expected {formatCurrency(row.expected)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-cols">
        <div className="panel">
          <div className="panel-header">
            <h2>Follow-ups</h2>
          </div>
          {data.overdueTasks.length === 0 && data.upcomingTasks.length === 0 ? (
            <p className="panel-empty">No pending follow-ups. Everything is caught up.</p>
          ) : (
            <div className="task-list">
              {[...data.overdueTasks, ...data.upcomingTasks].map((a) => {
                const overdue = (a.due_date ?? '') < today;
                return (
                  <div key={a.id} className={`task-row${a.done === 1 ? ' done' : ''}`}>
                    <button className={`task-check${overdue ? ' overdue' : ''}`} onClick={() => toggleTask(a)}>
                      {a.done === 1 ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                    </button>
                    <div className="task-info">
                      <div className="task-text">{a.description}</div>
                      <div className="task-meta">
                        <CalendarClock size={12} />
                        <span className={overdue ? 'task-overdue' : ''}>
                          {overdue ? `Overdue · ${formatDate(a.due_date)}` : `Due ${formatDate(a.due_date)}`}
                        </span>
                        {a.contact_name && <Link to={`/contacts/${a.contact_id}`}>· {a.contact_name}</Link>}
                        {a.deal_name && <Link to={`/deals/${a.deal_id}`}>· {a.deal_name}</Link>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Recent activity</h2>
          </div>
          {data.recentActivity.length === 0 ? (
            <p className="panel-empty">No activity yet.</p>
          ) : (
            <div className="feed">
              {data.recentActivity.map((a) => (
                <div key={a.id} className="feed-item">
                  <div className="feed-head">
                    <TypeBadge type={a.type} />
                    <span className="cell-muted">{formatDateTime(a.happened_at)}</span>
                  </div>
                  <p className="feed-text">{a.description}</p>
                  <div className="feed-links">
                    {a.contact_name && (
                      <Link to={`/contacts/${a.contact_id}`} className="link-cell">
                        <Users size={12} /> {a.contact_name}
                      </Link>
                    )}
                    {a.deal_name && (
                      <Link to={`/deals/${a.deal_id}`} className="link-cell">
                        <Handshake size={12} /> {a.deal_name}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Latest deals</h2>
            <Link to="/deals" className="panel-stat link">All deals <ArrowRight size={13} /></Link>
          </div>
          {data.recentDeals.length === 0 ? (
            <p className="panel-empty">No deals yet.</p>
          ) : (
            <div className="recent-deals">
              {data.recentDeals.map((d) => (
                <Link key={d.id} to={`/deals/${d.id}`} className="recent-deal">
                  <div>
                    <div className="recent-deal-name">{d.name}</div>
                    <div className="cell-muted">{(d as unknown as { organization_name?: string }).organization_name ?? '—'}</div>
                  </div>
                  <div className="recent-deal-right">
                    <StageBadge stage={d.stage} />
                    <span className="recent-deal-value">{formatCurrency(d.value)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
