import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../models/product';
import { CartStore } from '../../services/cart-store';
import { StoreApi } from '../../services/store-api';

@Component({
  imports: [RouterLink],
  selector: 'app-promotions',
  standalone: true,
  templateUrl: './promotions.html',
  styleUrl: './promotions.css',
})
export class Promotions {
  private readonly api = inject(StoreApi);
  readonly cart = inject(CartStore);
  readonly saleProducts = signal<Product[]>([]);
  readonly error = signal('');

  ngOnInit(): void {
    this.api.getPromotions().subscribe({
      next: (products) => this.saleProducts.set(products),
      error: () => this.error.set('Không thể tải sản phẩm khuyến mãi. Kiểm tra API và MongoDB.'),
    });
  }
}
