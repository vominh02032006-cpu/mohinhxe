import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home/home').then((m) => m.Home),
  },
  {
    path: 'products',
    loadComponent: () => import('./components/products/products').then((m) => m.Products),
  },
  {
    path: 'bai_viet',
    loadComponent: () => import('./components/blogs/blogs').then((m) => m.Blogs),
  },
  {
    path: 'category/:slug',
    loadComponent: () => import('./components/category/category').then((m) => m.CategoryPage),
  },
  {
    path: 'promotions',
    loadComponent: () => import('./components/promotions/promotions').then((m) => m.Promotions),
  },
  {
    path: 'product/:slug',
    loadComponent: () => import('./components/product/product').then((m) => m.Product),
  },
  {
    path: 'cart',
    loadComponent: () => import('./components/cart/cart').then((m) => m.Cart),
  },
  {
    path: 'account',
    loadComponent: () => import('./components/account/account').then((m) => m.Account),
  },
  {
    path: 'checkout',
    loadComponent: () => import('./components/checkout/checkout').then((m) => m.Checkout),
  },
  {
    path: 'orders',
    loadComponent: () => import('./components/orders/orders').then((m) => m.Orders),
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin/admin').then((m) => m.Admin),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
