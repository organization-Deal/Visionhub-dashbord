export type Content = {
  id: string;
  title: string;
  product: string;
  project?: string | null;
  content_type?: string | null;
  purpose?: string | null;
  platform?: string | null;
  format?: string | null;
  production_level?: string | null;
  camera_required?: string | null;
  camera_used?: string | null;
  owner?: string | null;
  status: string;
  shoot_date?: string | null;
  publish_date?: string | null;
  script?: string | null;
  cta?: string | null;
};

export type Overview = {
  content: { total?: number; posted?: number; overdue?: number };
  camera: { dslr_required: number; dslr_used: number; compliance: number };
  performance: {
    views?: number;
    reach?: number;
    shares?: number;
    saves?: number;
    spend?: number;
    leads?: number;
    qualified_leads?: number;
    appointments?: number;
    closed?: number;
    revenue?: number;
  };
  ai: { avg_score?: number; reviews?: number };
  statuses: Array<{ status: string; count: number }>;
  products: Array<{ product: string; count: number }>;
  top_contents: Array<Content & { views: number; reach: number; shares: number; saves: number; leads: number; qualified_leads: number; revenue: number }>;
  upcoming: Array<Content>;
};

export type ConfigStatus = {
  lark: boolean;
  openai: boolean;
  meta: boolean;
  meta_ads: boolean;
  tiktok: boolean;
  admin_token: boolean;
};
