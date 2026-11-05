export type Member = {
  id: string;
  name: string;
  email: string;
  color: string;
  is_admin: boolean;
  wish_count: number;
};

export type Wish = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  link: string;
  image_url: string;
  image_path: string | null;
};

export type Settings = {
  budget: string;
  handover: string;
};

export type DrawStatus = {
  drawn: boolean;
  opened: number;
  total: number;
};

export type ChatKind = "giftee" | "santa";

/** Konverzace z pohledu přihlášeného. U „santa“ záměrně žádné údaje o dárci. */
export type ChatInfo = {
  kind: ChatKind;
  thread_id: string;
  title: string | null;
  color: string | null;
  can_write: boolean;
  unread: number;
};

export type ChatMessage = {
  id: string;
  mine: boolean;
  body: string;
  wish_title: string | null;
  created_at: string;
};
