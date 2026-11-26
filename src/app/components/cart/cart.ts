import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStore } from '../../services/cart-store';

@Component({
  imports: [RouterLink],
  selector: 'app-cart',
  styleUrl: './cart.css',
  templateUrl: './cart.html',
})
export class Cart {
  readonly cart = inject(CartStore);

  formatPrice(amount: number): string {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(amount)}đ`;
  }
}

