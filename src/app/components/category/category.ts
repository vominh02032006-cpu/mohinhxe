import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Category, Product } from '../../models/product';
import { StoreApi } from '../../services/store-api';

@Component({
  imports: [RouterLink],
  selector: 'app-category-page',
  templateUrl: './category.html',
  styleUrl: './category.css',
})
export class CategoryPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(StoreApi);
  readonly category = signal<Category | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly error = signal('');

  ngOnInit(): void {
    this.api.getCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.error.set('Không thể tải danh sách danh mục.'),
    });

    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.error.set('Đường dẫn danh mục không hợp lệ.');
        return;
      }

      this.api.getCategory(slug).subscribe({
        next: (category) => this.category.set(category),
        error: () => this.error.set('Không tìm thấy danh mục.'),
      });
      this.api.getProducts(slug).subscribe({
        next: (products) => this.products.set(products),
        error: () => this.error.set('Không thể tải sản phẩm của danh mục.'),
      });
    });
  }
}
