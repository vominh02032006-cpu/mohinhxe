import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Home } from './home';
import { StoreApi } from '../../services/store-api';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    localStorage.removeItem('bhgarage-feedback');
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        {
          provide: StoreApi,
          useValue: {
            getHome: () => of({
              banners: [],
              newProducts: [],
              bestSellingProducts: [],
              promotionProducts: [],
              latestBlogs: [],
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('stores newsletter signups without duplicate email addresses', () => {
    component.subscribe(new SubmitEvent('submit'), ' Driver@example.com ');
    component.subscribe(new SubmitEvent('submit'), 'driver@example.com');

    expect(component.newsletterEmails()).toEqual(['driver@example.com']);
    expect(component.newsletterStatus()).toContain('đã đăng ký');
  });

  it('moves through banners and wraps around at both ends', () => {
    component.banners.set([
      { slug: 'first', title: 'First', description: '', image: '', link: '/' },
      { slug: 'second', title: 'Second', description: '', image: '', link: '/' },
    ]);

    component.nextBanner();
    expect(component.bannerIndex()).toBe(1);

    component.nextBanner();
    expect(component.bannerIndex()).toBe(0);

    component.previousBanner();
    expect(component.bannerIndex()).toBe(1);
  });

  it('adds valid customer feedback to the feedback array', () => {
    component.addFeedback(
      new SubmitEvent('submit'),
      'Khánh',
      '4',
      'Mô hình đẹp và giao hàng cẩn thận.',
    );

    expect(component.feedbacks()[0]).toMatchObject({
      name: 'Khánh',
      rating: 4,
      message: 'Mô hình đẹp và giao hàng cẩn thận.',
    });

    const reloadedComponent = TestBed.createComponent(Home).componentInstance;
    expect(reloadedComponent.feedbacks()[0]).toMatchObject({
      name: 'Khánh',
      rating: 4,
      message: 'Mô hình đẹp và giao hàng cẩn thận.',
    });
  });
});
