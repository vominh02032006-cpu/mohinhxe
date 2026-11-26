import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StoreApi } from '../../services/store-api';
import { CartStore } from '../../services/cart-store';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-checkout',
  styleUrl: './checkout.css',
  templateUrl: './checkout.html',
})
export class Checkout implements OnInit {
  private readonly api = inject(StoreApi);
  private readonly router = inject(Router);
  readonly cart = inject(CartStore);

  readonly checkingAccount = signal(true);
  readonly authenticated = signal(false);
  readonly pending = signal(false);
  readonly error = signal('');

  name = '';
  phone = '';
  address = '';
  note = '';

  ngOnInit(): void {
    this.api.getCustomer().subscribe({
      next: (response) => {
        this.name = response.user.name;
        this.authenticated.set(true);
        this.checkingAccount.set(false);
      },
      error: (error: unknown) => {
        this.checkingAccount.set(false);
        if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
          this.error.set(this.errorMessage(error, 'Không thể xác thực tài khoản.'));
        }
      },
    });
  }

  placeOrder(): void {
    this.error.set('');
    this.pending.set(true);
    this.api.createOrder({
      name: this.name.trim(),
      phone: this.phone.trim(),
      address: this.address.trim(),
      note: this.note.trim(),
      items: this.cart.items().map((item) => ({
        slug: item.product.slug,
        quantity: item.quantity,
      })),
    }).subscribe({
      next: () => {
        this.cart.clear();
        void this.router.navigateByUrl('/orders');
      },
      error: (error: unknown) => {
        this.pending.set(false);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.authenticated.set(false);
        }
        this.error.set(this.errorMessage(error, 'Không thể tạo đơn hàng.'));
      },
    });
  }

  formatPrice(amount: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      return error.error.message;
    }
    return fallback;
  }
}
