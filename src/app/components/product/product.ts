import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StoreApi } from '../../services/store-api';
import { Product as ProductModel } from '../../models/product';
import { CartStore } from '../../services/cart-store';

@Component({
  imports: [RouterLink],
  selector: 'app-product',
  styleUrl: './product.css',
  templateUrl: './product.html',
})
export class Product implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(StoreApi);
  readonly cart = inject(CartStore);
  readonly product = signal<ProductModel | null>(null);
  readonly error = signal('');

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.error.set('Đường dẫn sản phẩm không hợp lệ.');
        return;
      }

      this.api.getProduct(slug).subscribe({
        next: (product) => this.product.set(product),
        error: () => this.error.set('Không tìm thấy sản phẩm hoặc API đang không hoạt động.'),
      });
    });
  }
}
