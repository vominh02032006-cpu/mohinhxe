import { Injectable, computed, inject, signal } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Product } from '../models/product';

export interface CartItem {
  product: Product;
  quantity: number;
}

const storageKey = 'bhgarage-cart';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCartItem(value: unknown): value is CartItem {
  if (!isRecord(value) || !isRecord(value['product'])) {
    return false;
  }

  const product = value['product'];
  const quantity = value['quantity'];
  const price = product['price'];
  return (
    typeof product['slug'] === 'string' &&
    typeof product['name'] === 'string' &&
    typeof price === 'string' &&
    typeof product['oldPrice'] === 'string' &&
    typeof product['image'] === 'string' &&
    typeof quantity === 'number' &&
    Number.isSafeInteger(quantity) &&
    quantity > 0 &&
    CartStore.parsePrice(price) !== undefined
  );
}

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly items = signal<CartItem[]>([]);
  readonly error = signal('');
  readonly itemCount = computed(() =>
    this.items().reduce((count, item) => count + item.quantity, 0),
  );
  readonly subtotal = computed(() =>
    this.items().reduce((sum, item) => sum + this.itemTotal(item), 0),
  );

  constructor() {
    this.restore();
  }

  add(product: Product): boolean {
    if (!product.slug || CartStore.parsePrice(product.price) === undefined) {
      this.error.set('Sản phẩm không có giá hợp lệ nên chưa thể thêm vào giỏ.');
      return false;
    }

    const items = [...this.items()];
    const existingIndex = items.findIndex((item) => item.product.slug === product.slug);
    if (existingIndex >= 0) {
      const existing = items[existingIndex];
      if (existing.quantity >= Number.MAX_SAFE_INTEGER) {
        this.error.set('Số lượng sản phẩm đã vượt giới hạn.');
        return false;
      }
      items[existingIndex] = { ...existing, product, quantity: existing.quantity + 1 };
    } else {
      items.push({ product, quantity: 1 });
    }

    return this.save(items);
  }

  setQuantity(slug: string, quantity: number): boolean {
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      this.error.set('Số lượng phải là số nguyên lớn hơn 0.');
      return false;
    }

    const items = this.items().map((item) =>
      item.product.slug === slug ? { ...item, quantity } : item,
    );
    return this.save(items);
  }

  remove(slug: string): boolean {
    return this.save(this.items().filter((item) => item.product.slug !== slug));
  }

  clear(): boolean {
    return this.save([]);
  }

  itemTotal(item: CartItem): number {
    return this.unitPrice(item.product) * item.quantity;
  }

  unitPrice(product: Product): number {
    return CartStore.parsePrice(product.price) ?? 0;
  }

  static parsePrice(price: string): number | undefined {
    const digits = price.replace(/[^\d]/g, '');
    if (!digits) {
      return undefined;
    }
    const amount = Number(digits);
    return Number.isSafeInteger(amount) ? amount : undefined;
  }

  private restore(): void {
    if (!this.isBrowser) {
      return;
    }

    let saved: string | null;
    try {
      saved = localStorage.getItem(storageKey);
    } catch (error) {
      if (error instanceof DOMException) {
        this.error.set('Không thể đọc giỏ hàng từ bộ nhớ trình duyệt.');
        return;
      }
      throw error;
    }

    if (!saved) {
      return;
    }

    try {
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed) || !parsed.every(isCartItem)) {
        this.error.set('Dữ liệu giỏ hàng đã lưu không hợp lệ.');
        return;
      }
      this.items.set(parsed);
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.error.set('Dữ liệu giỏ hàng đã lưu bị lỗi.');
        return;
      }
      throw error;
    }
  }

  private save(items: CartItem[]): boolean {
    if (!this.isBrowser) {
      this.error.set('Không thể lưu giỏ hàng trong môi trường hiện tại.');
      return false;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
      if (error instanceof DOMException) {
        this.error.set('Không thể lưu giỏ hàng trên thiết bị này. Vui lòng thử lại.');
        return false;
      }
      throw error;
    }

    this.items.set(items);
    this.error.set('');
    return true;
  }
}
