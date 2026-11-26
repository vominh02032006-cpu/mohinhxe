import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CartStore } from '../../../services/cart-store';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {
  private readonly router = inject(Router);
  readonly cart = inject(CartStore);
  searchTerm = '';

  search(): void {
    const searchTerm = this.searchTerm.trim();
    void this.router.navigate(['/products'], {
      queryParams: { search: searchTerm || null },
    });
  }
}