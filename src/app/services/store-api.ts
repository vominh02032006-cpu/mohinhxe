import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Banner, Blog, Category, HomePageData, Product } from '../models/product';
import { CreateOrderPayload, CustomerOrder, CustomerUser, OrderStatus } from '../models/order';

const API_URL = '/api';

export type AdminCollection = 'products' | 'categories' | 'blogs' | 'banners';

export interface AdminRecord {
  slug: string;
  [key: string]: string | number | boolean | undefined;
}

@Injectable({ providedIn: 'root' })
export class StoreApi {
  private readonly http = inject(HttpClient);

  getHome(): Observable<HomePageData> {
    return this.http.get<HomePageData>(`${API_URL}/home`);
  }

  getProducts(categorySlug?: string, searchTerm?: string): Observable<Product[]> {
    let params = new HttpParams();
    if (categorySlug) {
      params = params.set('category', categorySlug);
    }
    if (searchTerm?.trim()) {
      params = params.set('search', searchTerm.trim());
    }
    return this.http.get<Product[]>(`${API_URL}/products`, { params });
  }

  getProduct(slug: string): Observable<Product> {
    return this.http.get<Product>(`${API_URL}/products/${encodeURIComponent(slug)}`);
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${API_URL}/categories`);
  }

  getCategory(slug: string): Observable<Category> {
    return this.http.get<Category>(`${API_URL}/categories/${encodeURIComponent(slug)}`);
  }

  getBlogs(): Observable<Blog[]> {
    return this.http.get<Blog[]>(`${API_URL}/blogs`);
  }

  getBanners(): Observable<Banner[]> {
    return this.http.get<Banner[]>(`${API_URL}/banners`);
  }

  getPromotions(): Observable<Product[]> {
    return this.http.get<Product[]>(`${API_URL}/products?promotion=true`);
  }

  adminLogin(username: string, password: string): Observable<{ authenticated: boolean }> {
    return this.http.post<{ authenticated: boolean }>(
      `${API_URL}/admin/login`,
      { username, password },
      { withCredentials: true },
    );
  }

  getAdminSession(): Observable<{ authenticated: boolean; username: string }> {
    return this.http.get<{ authenticated: boolean; username: string }>(
      `${API_URL}/admin/session`,
      { withCredentials: true },
    );
  }

  adminLogout(): Observable<void> {
    return this.http.post<void>(`${API_URL}/admin/logout`, {}, { withCredentials: true });
  }

  getAdminItems(collection: AdminCollection): Observable<AdminRecord[]> {
    return this.http.get<AdminRecord[]>(`${API_URL}/${collection}`, { withCredentials: true });
  }

  createAdminItem(
    collection: AdminCollection,
    item: Record<string, string | number | boolean>,
  ): Observable<AdminRecord> {
    return this.http.post<AdminRecord>(`${API_URL}/${collection}`, item, { withCredentials: true });
  }

  updateAdminItem(
    collection: AdminCollection,
    slug: string,
    item: Record<string, string | number | boolean>,
  ): Observable<AdminRecord> {
    return this.http.put<AdminRecord>(
      `${API_URL}/${collection}/${encodeURIComponent(slug)}`,
      item,
      { withCredentials: true },
    );
  }

  deleteAdminItem(collection: AdminCollection, slug: string): Observable<void> {
    return this.http.delete<void>(
      `${API_URL}/${collection}/${encodeURIComponent(slug)}`,
      { withCredentials: true },
    );
  }

  registerCustomer(input: {
    name: string;
    email: string;
    password: string;
  }): Observable<{ user: CustomerUser }> {
    return this.http.post<{ user: CustomerUser }>(
      `${API_URL}/auth/register`,
      input,
      { withCredentials: true },
    );
  }

  loginCustomer(email: string, password: string): Observable<{ user: CustomerUser }> {
    return this.http.post<{ user: CustomerUser }>(
      `${API_URL}/auth/login`,
      { email, password },
      { withCredentials: true },
    );
  }

  getCustomer(): Observable<{ user: CustomerUser }> {
    return this.http.get<{ user: CustomerUser }>(
      `${API_URL}/auth/me`,
      { withCredentials: true },
    );
  }

  logoutCustomer(): Observable<void> {
    return this.http.post<void>(`${API_URL}/auth/logout`, {}, { withCredentials: true });
  }

  createOrder(order: CreateOrderPayload): Observable<CustomerOrder> {
    return this.http.post<CustomerOrder>(`${API_URL}/orders`, order, { withCredentials: true });
  }

  getMyOrders(): Observable<CustomerOrder[]> {
    return this.http.get<CustomerOrder[]>(`${API_URL}/orders/mine`, { withCredentials: true });
  }

  getAdminOrders(): Observable<CustomerOrder[]> {
    return this.http.get<CustomerOrder[]>(`${API_URL}/orders`, { withCredentials: true });
  }

  updateOrderStatus(id: string, status: OrderStatus): Observable<CustomerOrder> {
    return this.http.patch<CustomerOrder>(
      `${API_URL}/orders/${encodeURIComponent(id)}/status`,
      { status },
      { withCredentials: true },
    );
  }
}
