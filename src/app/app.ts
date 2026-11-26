import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Header } from './components/layout/header/header';
import { Footer } from './components/layout/footer/footer';


@Component({
  imports: [RouterOutlet, Header, Footer],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  protected readonly title = signal('bhshop');
  readonly isAdminRoute = signal(this.router.url.startsWith('/admin'));

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.isAdminRoute.set(event.urlAfterRedirects.startsWith('/admin')));
  }
}
