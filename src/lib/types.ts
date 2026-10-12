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
