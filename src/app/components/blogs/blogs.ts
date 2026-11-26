import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Blog } from '../../models/product';
import { StoreApi } from '../../services/store-api';

@Component({
  imports: [RouterLink, DatePipe],
  selector: 'app-blogs',
  templateUrl: './blogs.html',
  styleUrl: './blogs.css',
})
export class Blogs implements OnInit {
  private readonly api = inject(StoreApi);
  readonly blogs = signal<Blog[]>([]);
  readonly error = signal('');

  ngOnInit(): void {
    this.api.getBlogs().subscribe({
      next: (blogs) => this.blogs.set(blogs),
      error: () => this.error.set('Không thể tải bài viết. Kiểm tra API và MongoDB.'),
    });
  }
}
