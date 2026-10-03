export type Bindings = {
  DB: D1Database;
  APP_ENV?: string;
  ALLOWED_ORIGIN?: string;
  DASHBOARD_ADMIN_TOKEN?: string;

  LARK_APP_ID?: string;
  LARK_APP_SECRET?: string;
  LARK_BASE_APP_TOKEN?: string;
  LARK_BASE_TABLE_ID?: string;
  LARK_WORK_TABLE_ID?: string;
  LARK_DATA_TABLE_ID?: string;
  LARK_FIELD_MAP?: string;
  LARK_CONTENT_ID_FIELD?: string;

  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;

  META_ACCESS_TOKEN?: string;
  META_IG_USER_ID?: string;
  META_AD_ACCOUNT_ID?: string;
  META_GRAPH_VERSION?: string;
  META_MEDIA_METRICS?: string;

  TIKTOK_ACCESS_TOKEN?: string;
};

export type ContentRow = {
  id: string;
  content_code?: string | null;
  lark_record_id?: string | null;
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
  cameraman?: string | null;
  editor?: string | null;
  reviewer?: string | null;
  status: string;
  shoot_date?: string | null;
  publish_date?: string | null;
  location?: string | null;
  hook?: string | null;
  key_message?: string | null;
  script?: string | null;
  shot_list?: string | null;
  cta?: string | null;
  notes?: string | null;
  source_url?: string | null;
  thumbnail_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AIReviewPayload = {
  overall_score: number;
  hook_score: number;
  clarity_score: number;
  proof_score: number;
  cta_score: number;
  brand_score: number;
  visual_score: number;
  summary: string;
  recommendations: string[];
  purpose_detected?: string[];
  issues?: string[];
};
