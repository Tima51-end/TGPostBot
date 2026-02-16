export interface GlobalSettings {
  id: number;
  description: string | null;
  link: string | null;
}

export interface ScheduledPost {
  id: number;
  media_urls: Array<{ type: "photo" | "video"; file_id: string }>;
  custom_desc?: string;
  scheduled_at: string;
  is_published: boolean;
}

export interface SessionData {
  step:
    | "idle"
    | "waiting_description"
    | "waiting_link"
    | "waiting_post_media"
    | "waiting_post_desc"
    | "waiting_post_time";
  tempPost?: {
    media: Array<{ type: "photo" | "video"; file_id: string }>;
    custom_desc?: string | undefined;
  };
}
