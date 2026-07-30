export type Reader = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  comment: string | null;
  created_at: string;
};

export type BookReview = {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  body: string;
  rating: number | null;
  created_at: string;
  /** 自分が書いた感想か */
  mine: boolean;
};

export type Book = {
  id: string;
  isbn13: string;
  title: string;
  authors: string | null;
  publisher: string | null;
  published_date: string | null;
  cover_url: string | null;
  description: string | null;
  created_at: string;
  readers: Reader[];
  reviews: BookReview[];
  registered_by_me: boolean;
};

export type BookPreview = {
  isbn13: string;
  title: string;
  authors: string | null;
  publisher: string | null;
  published_date: string | null;
  cover_url: string | null;
  description: string | null;
  source: string | null;
  already_on_shelf: boolean;
  registered_by_me: boolean;
};
