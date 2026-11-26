import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Product } from './product';
import { StoreApi } from '../../services/store-api';

describe('Product', () => {
  let component: Product;
  let fixture: ComponentFixture<Product>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Product],
      providers: [
        provideRouter([]),
        {
          provide: StoreApi,
          useValue: {
            getProduct: () => of(null),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Product);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
