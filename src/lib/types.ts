export type AdStatus = "pending" | "approved" | "rejected";

export interface Ad {
  id: string;
  owner_id: string;
  advertiser_name: string;
  title: string;
  link_url: string | null;
  cta_text: string;
  contact: string | null;
  image_path: string;
  requested_days: number;
  status: AdStatus;
  reject_reason: string | null;
  display_seconds: number;
  sort_order: number;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  decided_at: string | null;
}

/** الصف الذي يرجعه العرض العام live_ads */
export interface LiveAd {
  id: string;
  advertiser_name: string;
  title: string;
  link_url: string | null;
  cta_text: string;
  image_path: string;
  display_seconds: number;
  sort_order: number;
  end_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  role: "advertiser" | "admin";
}

export interface AdStats {
  ad_id: string;
  views: number;
  clicks: number;
}
