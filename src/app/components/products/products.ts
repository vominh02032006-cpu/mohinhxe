import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { StoreApi } from '../../services/store-api';
import { CartStore } from '../../services/cart-store';
import { Category, Product } from '../../models/product';

@Component({
  imports: [RouterLink],
  selector: 'app-products',
  styleUrl: './products.css',
  templateUrl: './products.html',
})
export class Products {
  private readonly api = inject(StoreApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly products = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly error = signal('');
  readonly searchQuery = signal('');
  readonly cart = inject(CartStore);
  readonly sortMode = signal<'newest' | 'bestseller' | 'discount'>('newest');
  readonly sortedProducts = computed(() => {
    const products = [...this.products()];
    switch (this.sortMode()) {
      case 'bestseller':
        return products.sort((a, b) => b.sold - a.sold);
      case 'discount':
        return products.sort((a, b) => b.discount - a.discount);
      default:
        return products.sort(
          (a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''),
        );
    }
  });

  setSort(mode: 'newest' | 'bestseller' | 'discount'): void {
    this.sortMode.set(mode);
  }

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        map((params) => params.get('search')?.trim() ?? ''),
        distinctUntilChanged(),
        tap((search) => this.searchQuery.set(search)),
        switchMap((search) =>
          this.api.getProducts(undefined, search).pipe(
            tap(() => this.error.set('')),
            catchError(() => {
              this.error.set('Không thể tải sản phẩm. Kiểm tra API và kết nối MongoDB.');
              return of([]);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((products) => this.products.set(products));

    this.api.getCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.error.set('Không thể tải danh mục. Kiểm tra API và kết nối MongoDB.'),
    });
  }
}
