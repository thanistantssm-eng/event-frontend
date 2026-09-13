import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Portal } from './portal';

describe('Portal navigation', () => {
  beforeEach(async () => {
    const api = {
      events: () => of([]),
      venues: () => of([]),
      customerProfile: () => throwError(() => new Error('Preview without API session')),
      customerDashboard: () => of(null),
      favorites: () => of([]),
      myTransactionNotifications: () => of([]),
    };
    const auth = {
      session: signal({
        token: 'test-token',
        expiresAt: '2099-01-01T00:00:00.000Z',
        userId: 1,
        customerId: 1,
        username: 'Test Customer',
        email: 'customer@example.com',
        role: 'Customer',
      }),
      signOut: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Portal],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
  });

  it('renders complete desktop and mobile customer navigation', () => {
    const fixture = TestBed.createComponent(Portal);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const desktopLinks = element.querySelectorAll('.side-nav nav a');
    const mobileLinks = element.querySelectorAll('.mobile-bottom-nav a');

    expect(desktopLinks.length).toBe(10);
    expect(mobileLinks.length).toBe(5);
    expect(element.querySelector('.side-nav a.active')?.textContent).toContain('Dashboard');
    expect(element.querySelector('.profile-trigger')).toBeTruthy();
    expect(element.querySelector('.mobile-menu')).toBeTruthy();
    expect(element.querySelector('a[href="/customer/tickets"]')?.textContent).toContain('Tickets');
  });
});
