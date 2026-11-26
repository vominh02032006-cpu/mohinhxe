import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CustomerUser } from '../../models/order';
import { StoreApi } from '../../services/store-api';

type AccountMode = 'login' | 'register';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-account',
  styleUrl: './account.css',
  templateUrl: './account.html',
})
export class Account implements OnInit {
  private readonly api = inject(StoreApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly mode = signal<AccountMode>('login');
  readonly checking = signal(true);
  readonly pending = signal(false);
  readonly user = signal<CustomerUser | null>(null);
  readonly error = signal('');
  name = '';
  email = '';
  password = '';

  ngOnInit(): void {
    this.api.getCustomer().subscribe({
      next: (response) => {
        this.user.set(response.user);
        this.checking.set(false);
      },
      error: (error: unknown) => {
        this.checking.set(false);
        if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
          this.error.set(this.errorMessage(error, 'Không thể kiểm tra trạng thái tài khoản.'));
        }
      },
    });
  }

  setMode(mode: AccountMode): void {
    this.mode.set(mode);
    this.error.set('');
  }

  submit(): void {
    this.error.set('');
    this.pending.set(true);
    const request = this.mode() === 'register'
      ? this.api.registerCustomer({
        name: this.name.trim(),
        email: this.email.trim(),
        password: this.password,
      })
      : this.api.loginCustomer(this.email.trim(), this.password);

    request.subscribe({
      next: (response) => {
        this.user.set(response.user);
        this.password = '';
        this.pending.set(false);
        void this.router.navigateByUrl(this.returnUrl());
      },
      error: (error: unknown) => {
        this.pending.set(false);
        this.error.set(this.errorMessage(error, 'Không thể xử lý yêu cầu tài khoản.'));
      },
    });
  }

  logout(): void {
    this.api.logoutCustomer().subscribe({
      next: () => {
        this.user.set(null);
        this.error.set('');
      },
      error: (error: unknown) => this.error.set(this.errorMessage(error, 'Không thể đăng xuất.')),
    });
  }

  private returnUrl(): string {
    const requested = this.route.snapshot.queryParamMap.get('returnUrl');
    return requested?.startsWith('/') && !requested.startsWith('//') && !requested.startsWith('/admin')
      ? requested
      : '/orders';
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      return error.error.message;
    }
    return fallback;
  }
}
