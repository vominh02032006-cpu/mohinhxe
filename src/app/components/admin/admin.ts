import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CustomerOrder, OrderStatus } from '../../models/order';
import {
  AdminCollection,
  AdminRecord,
  StoreApi,
} from '../../services/store-api';

type AdminFieldType = 'text' | 'number' | 'date' | 'textarea' | 'checkbox' | 'category-select';

interface AdminField {
  key: string;
  label: string;
  type: AdminFieldType;
  required?: boolean;
  min?: number;
  max?: number;
}

interface AdminCollectionConfig {
  key: AdminCollection;
  label: string;
  titleKey: string;
  fields: AdminField[];
}

const collectionConfigs: AdminCollectionConfig[] = [
  {
    key: 'products',
    label: 'Sản phẩm',
    titleKey: 'name',
    fields: [
      { key: 'name', label: 'Tên sản phẩm', type: 'text', required: true },
      { key: 'price', label: 'Giá bán', type: 'text', required: true },
      { key: 'oldPrice', label: 'Giá cũ', type: 'text' },
      { key: 'image', label: 'Đường dẫn hình ảnh', type: 'text', required: true },
      { key: 'description', label: 'Mô tả', type: 'textarea' },
      { key: 'discount', label: 'Giảm giá (%)', type: 'number', min: 0, max: 100 },
      { key: 'sold', label: 'Đã bán', type: 'number', min: 0 },
      { key: 'category', label: 'Danh mục', type: 'category-select', required: true },
    ],
  },
  {
    key: 'categories',
    label: 'Danh mục',
    titleKey: 'name',
    fields: [
      { key: 'name', label: 'Tên danh mục', type: 'text', required: true },
      { key: 'description', label: 'Mô tả', type: 'textarea' },
      { key: 'image', label: 'Đường dẫn hình ảnh', type: 'text' },
    ],
  },
  {
    key: 'blogs',
    label: 'Bài viết',
    titleKey: 'title',
    fields: [
      { key: 'title', label: 'Tiêu đề', type: 'text', required: true },
      { key: 'summary', label: 'Tóm tắt', type: 'textarea', required: true },
      { key: 'content', label: 'Nội dung', type: 'textarea' },
      { key: 'image', label: 'Đường dẫn hình ảnh', type: 'text', required: true },
      { key: 'category', label: 'Chủ đề', type: 'text', required: true },
      { key: 'publishedAt', label: 'Ngày đăng', type: 'date', required: true },
    ],
  },
  {
    key: 'banners',
    label: 'Banner',
    titleKey: 'title',
    fields: [
      { key: 'title', label: 'Tiêu đề', type: 'text', required: true },
      { key: 'description', label: 'Mô tả', type: 'textarea' },
      { key: 'image', label: 'Đường dẫn hình ảnh', type: 'text', required: true },
      { key: 'link', label: 'Đường dẫn khi nhấn', type: 'text', required: true },
      { key: 'isActive', label: 'Đang hiển thị', type: 'checkbox' },
    ],
  },
];

type FormValue = string | number | boolean;

@Component({
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
  selector: 'app-admin',
  styleUrl: './admin.css',
  templateUrl: './admin.html',
})
export class Admin implements OnInit {
  private readonly api = inject(StoreApi);

  readonly collections = collectionConfigs;
  readonly selectedCollection = signal<AdminCollection>('products');
  readonly currentConfig = computed(
    () => collectionConfigs.find((item) => item.key === this.selectedCollection())!,
  );
  readonly fields = computed(() => this.currentConfig().fields);
  readonly items = signal<AdminRecord[]>([]);
  readonly orders = signal<CustomerOrder[]>([]);
  readonly showOrders = signal(false);
  readonly categories = signal<AdminRecord[]>([]);
  readonly checkingSession = signal(true);
  readonly authenticated = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loginPending = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly editingSlug = signal<string | null>(null);

  username = '';
  password = '';
  draft: Record<string, FormValue> = {};

  ngOnInit(): void {
    this.api.getAdminSession().subscribe({
      next: () => this.onAuthenticated(),
      error: (error: unknown) => {
        this.checkingSession.set(false);
        if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
          this.error.set(this.errorMessage(error, 'Không kiểm tra được trạng thái đăng nhập.'));
        }
      },
    });
  }

  login(): void {
    this.error.set('');
    this.notice.set('');
    this.loginPending.set(true);
    this.api.adminLogin(this.username.trim(), this.password).subscribe({
      next: () => {
        this.password = '';
        this.onAuthenticated();
      },
      error: (error: unknown) => {
        this.loginPending.set(false);
        this.error.set(this.errorMessage(error, 'Đăng nhập thất bại.'));
      },
    });
  }

  logout(): void {
    this.api.adminLogout().subscribe({
      next: () => {
        this.authenticated.set(false);
        this.items.set([]);
        this.orders.set([]);
        this.showOrders.set(false);
        this.editingSlug.set(null);
        this.error.set('');
        this.notice.set('Đã đăng xuất.');
      },
      error: (error: unknown) => this.error.set(this.errorMessage(error, 'Không thể đăng xuất.')),
    });
  }

  selectCollection(collection: AdminCollection): void {
    this.showOrders.set(false);
    this.selectedCollection.set(collection);
    this.cancelEdit();
    this.loadItems();
  }

  selectOrders(): void {
    this.showOrders.set(true);
    this.error.set('');
    this.notice.set('');
    this.loading.set(true);
    this.api.getAdminOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.errorMessage(error, 'Không thể tải danh sách đơn hàng.'));
      },
    });
  }

  updateOrderStatus(order: CustomerOrder, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !isOrderStatus(target.value)) return;

    this.error.set('');
    this.api.updateOrderStatus(order.id, target.value).subscribe({
      next: (updatedOrder) => {
        this.orders.update((orders) =>
          orders.map((item) => item.id === updatedOrder.id ? updatedOrder : item),
        );
        this.notice.set('Đã cập nhật trạng thái đơn hàng.');
      },
      error: (error: unknown) => {
        this.error.set(this.errorMessage(error, 'Không thể cập nhật đơn hàng.'));
        this.selectOrders();
      },
    });
  }

  startCreate(): void {
    this.editingSlug.set(null);
    this.draft = this.createEmptyDraft();
    this.error.set('');
    this.notice.set('');
  }

  edit(item: AdminRecord): void {
    this.editingSlug.set(item.slug);
    this.draft = this.createEmptyDraft();
    for (const field of this.fields()) {
      const value = item[field.key];
      if (field.type === 'date' && typeof value === 'string') {
        this.draft[field.key] = value.slice(0, 10);
      } else if (value !== undefined) {
        this.draft[field.key] = value;
      }
    }
    this.error.set('');
    this.notice.set('');
  }

  cancelEdit(): void {
    this.editingSlug.set(null);
    this.draft = this.createEmptyDraft();
  }

  save(): void {
    this.error.set('');
    this.notice.set('');

    const payload: Record<string, string | number | boolean> = {};
    for (const field of this.fields()) {
      const value = this.draft[field.key];
      if (field.type === 'number') {
        const number = Number(value || 0);
        if (!Number.isFinite(number) || number < (field.min ?? 0) || (field.max !== undefined && number > field.max)) {
          this.error.set(`${field.label} không hợp lệ.`);
          return;
        }
        payload[field.key] = number;
      } else if (field.type === 'checkbox') {
        payload[field.key] = Boolean(value);
      } else if (field.type === 'date' && typeof value === 'string') {
        payload[field.key] = new Date(`${value}T00:00:00.000Z`).toISOString();
      } else {
        payload[field.key] = typeof value === 'string' ? value.trim() : '';
      }
    }

    this.saving.set(true);
    const slug = this.editingSlug();
    const request = slug
      ? this.api.updateAdminItem(this.selectedCollection(), slug, payload)
      : this.api.createAdminItem(this.selectedCollection(), payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notice.set(slug ? 'Đã cập nhật nội dung.' : 'Đã thêm nội dung.');
        this.cancelEdit();
        this.loadItems();
        if (this.selectedCollection() === 'categories') this.loadCategories();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.error.set(this.errorMessage(error, 'Không thể lưu dữ liệu.'));
      },
    });
  }

  delete(item: AdminRecord): void {
    const title = item[this.currentConfig().titleKey] ?? item.slug;
    if (!window.confirm(`Xóa "${title}" khỏi dữ liệu?`)) return;

    this.error.set('');
    this.notice.set('');
    this.api.deleteAdminItem(this.selectedCollection(), item.slug).subscribe({
      next: () => {
        this.notice.set('Đã xóa nội dung.');
        if (this.editingSlug() === item.slug) this.cancelEdit();
        this.loadItems();
        if (this.selectedCollection() === 'categories') this.loadCategories();
      },
      error: (error: unknown) => this.error.set(this.errorMessage(error, 'Không thể xóa dữ liệu.')),
    });
  }

  private onAuthenticated(): void {
    this.authenticated.set(true);
    this.checkingSession.set(false);
    this.loginPending.set(false);
    this.loadCategories();
    this.loadItems();
  }

  private loadItems(): void {
    this.loading.set(true);
    this.api.getAdminItems(this.selectedCollection()).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.errorMessage(error, 'Không thể tải dữ liệu.'));
      },
    });
  }

  private loadCategories(): void {
    this.api.getAdminItems('categories').subscribe({
      next: (categories) => this.categories.set(categories),
      error: (error: unknown) => this.error.set(this.errorMessage(error, 'Không thể tải danh mục.')),
    });
  }

  private createEmptyDraft(): Record<string, FormValue> {
    const draft: Record<string, FormValue> = {};
    for (const field of this.fields()) {
      if (field.type === 'checkbox') {
        draft[field.key] = true;
      } else if (field.type === 'number') {
        draft[field.key] = 0;
      } else if (field.type === 'date') {
        draft[field.key] = new Date().toISOString().slice(0, 10);
      } else {
        draft[field.key] = '';
      }
    }
    return draft;
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      return error.error.message;
    }
    return fallback;
  }
}

function isOrderStatus(value: string): value is OrderStatus {
  return ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'].includes(value);
}
