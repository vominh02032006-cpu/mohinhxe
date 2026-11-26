import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Products } from './products';
import { StoreApi } from '../../services/store-api';

describe('Products', () => {
  let component: Products;
  let fixture: ComponentFixture<Products>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Products],
      providers: [
        provideRouter([]),
        {
          provide: StoreApi,
          useValue: {
            getProducts: () => of([]),
            getCategories: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Products);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sorts the list when choosing newest, bestselling, or discounted products', () => {
    component.products.set([
      {
        slug: 'old-low-sales',
        name: 'Old model',
        price: '1đ',
        oldPrice: '-',
        image: '',
        discount: 30,
        sold: 1,
        createdAt: '2026-01-01',
      },
      {
        slug: 'new-high-sales',
        name: 'New model',
        price: '2đ',
        oldPrice: '-',
        image: '',
        discount: 5,
        sold: 50,
        createdAt: '2026-02-01',
      },
      {
        slug: 'middle-best-seller',
        name: 'Best seller',
        price: '3đ',
        oldPrice: '-',
        image: '',
        discount: 15,
        sold: 100,
        createdAt: '2026-01-15',
      },
    ]);

    component.setSort('bestseller');
    expect(component.sortedProducts().map((product) => product.slug)).toEqual([
      'middle-best-seller',
      'new-high-sales',
      'old-low-sales',
    ]);

    component.setSort('discount');
    expect(component.sortedProducts().map((product) => product.slug)).toEqual([
      'old-low-sales',
      'middle-best-seller',
      'new-high-sales',
    ]);

    component.setSort('newest');
    expect(component.sortedProducts().map((product) => product.slug)).toEqual([
      'new-high-sales',
      'middle-best-seller',
      'old-low-sales',
    ]);
  });
});
