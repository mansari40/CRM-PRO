export type ContactStatus = 'lead' | 'qualified' | 'customer';
export type DealStage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type ActivityType = 'note' | 'call' | 'email';

export interface Organization {
  id: number;
  name: string;
  website: string;
  industry: string;
  notes: string;
  created_at: string;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  job_title: string;
  organization_id: number | null;
  status: ContactStatus;
  created_at: string;
}

export interface Deal {
  id: number;
  name: string;
  organization_id: number | null;
  contact_id: number | null;
  stage: DealStage;
  value: number;
  probability: number;
  close_date: string;
  created_at: string;
}

export interface Activity {
  id: number;
  type: ActivityType;
  contact_id: number | null;
  deal_id: number | null;
  description: string;
  happened_at: string;
  due_date: string | null;
  done: 0 | 1;
}

export interface ActivityWithNames extends Activity {
  contact_name: string | null;
  deal_name: string | null;
}

export interface OrganizationDetail extends Organization {
  contacts: Contact[];
  deals: Deal[];
}

export interface ContactDetail extends Contact {
  organization: Organization | null;
  activities: ActivityWithNames[];
  deals: Deal[];
}

export interface DealDetail extends Deal {
  organization: Organization | null;
  contact: Contact | null;
  activities: ActivityWithNames[];
}

export interface PipelineColumn {
  stage: DealStage;
  label: string;
  deals: Deal[];
  expectedRevenue: number;
  weightedRevenue: number;
  count: number;
  totalValue: number;
  weightedValue: number;
}

export interface MonthPoint {
  month: string;
  label: string;
  wonCount: number;
  revenue: number;
}

export interface DashboardData {
  summary: {
    totalOrganizations: number;
    totalContacts: number;
    openDeals: number;
    openValue: number;
    weightedValue: number;
    wonDeals: number;
    wonRevenue: number;
  };
  months: MonthPoint[];
  pipeline: PipelineColumn[];
  upcomingTasks: ActivityWithNames[];
  overdueTasks: ActivityWithNames[];
  recentActivity: ActivityWithNames[];
  recentDeals: Deal[];
}
