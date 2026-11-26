export interface Product {
  _id?: string;
  id?: number;
  slug: string;
  name: string;
  price: string;
  oldPrice: string;
  image: string;
  description?: string;
  discount: number;
  sold: number;
  createdAt?: string;
  category?: Category | string;

  badge?: string;
  badgeClass?: string;
}

export interface Category {
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

export interface Blog {
  _id?: string;
  title: string;
  slug: string;
  summary: string;
  content?: string;
  image: string;
  publishedAt: string;
  category: string;
}

export interface Banner {
  _id?: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  link: string;
}

export interface HomePageData {
  banners: Banner[];
  newProducts: Product[];
  bestSellingProducts: Product[];
  promotionProducts: Product[];
  latestBlogs: Blog[];
}