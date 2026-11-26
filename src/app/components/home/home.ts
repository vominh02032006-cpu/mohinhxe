
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Banner, Blog, Product } from '../../models/product';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreApi } from '../../services/store-api';
import { CartStore } from '../../services/cart-store';

interface CustomerFeedback {
  name: string;
  rating: number;
  message: string;
  createdAt: string;
}

const defaultFeedbacks: CustomerFeedback[] = [
  {
    name: 'Minh Anh',
    rating: 5,
    message: 'Mô hình đẹp, nước sơn chỉn chu và đóng gói rất cẩn thận.',
    createdAt: '2026-11-10',
  },
  {
    name: 'Quốc Bảo',
    rating: 5,
    message: 'Xe giống ảnh, có đế trưng bày nên đặt lên kệ rất nổi bật.',
    createdAt: '2026-11-12',
  },
];

@Component({
  imports: [RouterLink, FormsModule],
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit, OnDestroy {
  private readonly api = inject(StoreApi);
  readonly cart = inject(CartStore);
  readonly banners = signal<Banner[]>([]);
  readonly bannerIndex = signal(0);
  readonly newProducts = signal<Product[]>([]);
  readonly saleProducts = signal<Product[]>([]);
  readonly bestSellingProducts = signal<Product[]>([]);
  readonly latestBlogs = signal<Blog[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  private bannerTimer?: ReturnType<typeof setInterval>;

  newsletterEmails = signal<string[]>([]);
  newsletterStatus = signal('');

  private readonly feedbackStorageKey = 'bhgarage-feedback';
  feedbacks = signal<CustomerFeedback[]>(this.loadFeedbacks());
  feedbackStatus = signal('');

  ngOnInit(): void {
    this.api.getHome().subscribe({
      next: (data) => {
        this.banners.set(data.banners);
        this.newProducts.set(data.newProducts);
        this.saleProducts.set(data.promotionProducts);
        this.bestSellingProducts.set(data.bestSellingProducts);
        this.latestBlogs.set(data.latestBlogs);
        this.loading.set(false);
        if (data.banners.length > 1) {
          this.bannerTimer = setInterval(() => this.nextBanner(), 5000);
        }
      },
      error: () => {
        this.loadError.set('Không thể tải dữ liệu trang chủ. Kiểm tra API và kết nối MongoDB.');
        this.loading.set(false);
      },
    });
  }

  selectBanner(index: number): void {
    if (index >= 0 && index < this.banners().length) {
      this.bannerIndex.set(index);
    }
  }

  nextBanner(): void {
    const count = this.banners().length;
    if (count > 1) {
      this.bannerIndex.update((index) => (index + 1) % count);
    }
  }

  previousBanner(): void {
    const count = this.banners().length;
    if (count > 1) {
      this.bannerIndex.update((index) => (index - 1 + count) % count);
    }
  }

  ngOnDestroy(): void {
    if (this.bannerTimer) {
      clearInterval(this.bannerTimer);
    }
  }

  subscribe(event: SubmitEvent, email: string): void {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      this.newsletterStatus.set('Vui lòng nhập email hợp lệ.');
      return;
    }

    if (this.newsletterEmails().includes(normalizedEmail)) {
      this.newsletterStatus.set('Email này đã đăng ký nhận tin rồi.');
      return;
    }

    this.newsletterEmails.update((emails) => [...emails, normalizedEmail]);
    this.newsletterStatus.set('Đăng ký thành công! Tin mới sẽ được gửi đến email của bạn.');
  }

  addFeedback(event: Event, name: string, rating: string, message: string): void {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedMessage = message.trim();
    const numericRating = Number(rating);

    if (
      !trimmedName ||
      !trimmedMessage ||
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      this.feedbackStatus.set('Vui lòng nhập tên, chọn số sao và viết nhận xét.');
      return;
    }

    const updatedFeedbacks = [
      {
        name: trimmedName,
        rating: numericRating,
        message: trimmedMessage,
        createdAt: new Date().toISOString().slice(0, 10),
      },
      ...this.feedbacks(),
    ];

    try {
      localStorage.setItem(this.feedbackStorageKey, JSON.stringify(updatedFeedbacks));
    } catch (error) {
      if (error instanceof DOMException) {
        this.feedbackStatus.set('Không thể lưu đánh giá trên thiết bị này. Vui lòng thử lại.');
        return;
      }
      throw error;
    }

    this.feedbacks.set(updatedFeedbacks);
    this.feedbackStatus.set('Cảm ơn bạn đã gửi đánh giá!');
  }

  private loadFeedbacks(): CustomerFeedback[] {
    const savedFeedbacks = localStorage.getItem(this.feedbackStorageKey);
    if (!savedFeedbacks) {
      return [...defaultFeedbacks];
    }

    try {
      const parsedFeedbacks: unknown = JSON.parse(savedFeedbacks);
      if (!Array.isArray(parsedFeedbacks)) {
        return [...defaultFeedbacks];
      }
      return parsedFeedbacks.filter((feedback): feedback is CustomerFeedback =>
        this.isCustomerFeedback(feedback),
      );
    } catch (error) {
      if (error instanceof SyntaxError) {
        return [...defaultFeedbacks];
      }
      throw error;
    }
  }

  private isCustomerFeedback(value: unknown): value is CustomerFeedback {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    return (
      'name' in value &&
      typeof value.name === 'string' &&
      'rating' in value &&
      typeof value.rating === 'number' &&
      Number.isInteger(value.rating) &&
      value.rating >= 1 &&
      value.rating <= 5 &&
      'message' in value &&
      typeof value.message === 'string' &&
      'createdAt' in value &&
      typeof value.createdAt === 'string'
    );
  }

}
