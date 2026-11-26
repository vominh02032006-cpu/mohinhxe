import { TestBed } from '@angular/core/testing';
import { CartStore } from './cart-store';
import { Product } from '../models/product';

describe('CartStore', () => {
  let cart: CartStore;

  const porsche: Product = {
    slug: 'porsche-911',
    name: 'Porsche 911',
    price: '850.000đ',
    oldPrice: '-',
    image: 'porsche.jpg',
    discount: 0,
    sold: 0,
  };

  beforeEach(() => {
    localStorage.removeItem('bhgarage-cart');
    TestBed.configureTestingModule({});
    cart = TestBed.inject(CartStore);
  });

  afterEach(() => {
    localStorage.removeItem('bhgarage-cart');
  });

  it('stores products, combines duplicate adds, and computes the subtotal', () => {
    cart.add(porsche);
    cart.add(porsche);

    expect(cart.itemCount()).toBe(2);
    expect(cart.subtotal()).toBe(1_700_000);
    expect(JSON.parse(localStorage.getItem('bhgarage-cart') || '[]')[0].quantity).toBe(2);
  });

  it('updates quantities and removes products from the saved cart', () => {
    cart.add(porsche);
    cart.setQuantity(porsche.slug, 3);

    expect(cart.subtotal()).toBe(2_550_000);

    cart.remove(porsche.slug);
    expect(cart.items()).toEqual([]);
    expect(cart.subtotal()).toBe(0);
  });

  it('restores saved products when the cart service is recreated', () => {
    cart.add(porsche);
    cart.add(porsche);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    cart = TestBed.inject(CartStore);

    expect(cart.itemCount()).toBe(2);
    expect(cart.subtotal()).toBe(1_700_000);
  });
});
