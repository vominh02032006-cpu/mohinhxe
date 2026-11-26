import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CustomerOrder, OrderStatus } from '../../models/order';
import { StoreApi } from '../../services/store-api';

@Component({
  imports: [RouterLink],
  selector: 'app-orders',
  styleUrl: './orders.css',
  templateUrl: './orders.html',
})
export class Orders implements OnInit {
  private readonly api = inject(StoreApi);

  readonly orders = signal<CustomerOrder[]>([]);
  readonly loading = signal(true);
  readonly loginRequired = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    this.api.getMyOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.loginRequired.set(true);
        } else {
          this.error.set(this.errorMessage(error, 'Không thể tải đơn hàng.'));
        }
      },
    });
  }

  statusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      shipping: 'Đang giao',
      delivered: 'Đã giao',
      cancelled: 'Đã hủy',
    };
    return labels[status];
  }

  formatPrice(amount: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
      .format(new Date(date));
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      return error.error.message;
    }
    return fallback;
  }
}
