import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Booking, Payment } from '../../core/api.models';
import { AuthService } from '../../core/auth.service';
import { Portal } from './portal';

describe('Portal navigation', () => {
  const publishedEvent = {
    id: 10,
    name: 'Published Test Event',
    description: 'Full backend event description',
    eventType: 'NonSeatBased',
    organizerId: 2,
    venueId: 4,
    venueMode: 'OurProperty',
    eventCategoryId: 7,
    eventCategoryName: 'Concert',
    startDateTime: '2099-06-01T18:00:00.000Z',
    endDateTime: '2099-06-01T21:00:00.000Z',
    ticketPrice: 2500,
    status: 'Published',
    posterUrl: 'https://example.test/poster.jpg',
    createdAt: '2099-01-01T00:00:00.000Z',
    updatedAt: '2099-01-01T00:00:00.000Z',
  };
  const draftEvent = { ...publishedEvent, id: 11, name: 'Hidden Draft', status: 'Draft' };

  beforeEach(async () => {
    sessionStorage.clear();
    const api = {
      events: () => of([publishedEvent, draftEvent]),
      event: () => of(publishedEvent),
      venues: () => of([{ id: 4, propertyId: 1, name: 'Test Arena', capacity: 500, isActive: true }]),
      customerProfile: () => throwError(() => new Error('Preview without API session')),
      customerDashboard: () => of(null),
      favorites: () => of([]),
      myTransactionNotifications: () => of([]),
      tickets: () => of([{ id: 1, eventId: 10, name: 'General', price: 2500, quantity: 50, isActive: true }]),
      seats: () => of([]),
      eventParkingLayout: () => of({
        eventId: 10,
        allocations: [{ id: 5, eventId: 10, parkingAreaId: 3, parkingAreaName: 'Sky Arena Parking', allocatedSlotCount: 3, parkingFee: 500, isActive: true }],
        slots: [
          { id: 31, parkingAreaId: 3, slotNumber: 'A01', slotType: 'Standard', isActive: true, status: 'Available', parkingFee: 500 },
          { id: 32, parkingAreaId: 3, slotNumber: 'A02', slotType: 'Accessible', isActive: true, status: 'Available', parkingFee: 500 },
          { id: 33, parkingAreaId: 3, slotNumber: 'A03', slotType: 'EV Charging', isActive: true, status: 'Occupied', parkingFee: 500 },
        ],
      }),
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
  }, 30_000);

  it('renders an interactive parking map from backend layout records', () => {
    const fixture = TestBed.createComponent(Portal);
    const component = fixture.componentInstance as unknown as {
      syncView(url: string): void;
      loadEventBundle(eventId: number): void;
    };
    component.syncView('/customer/booking/parking/10');
    component.loadEventBundle(10);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const slots = element.querySelectorAll<HTMLButtonElement>('.parking-space');
    expect(slots.length).toBe(3);
    expect(element.querySelector('.parking-zone')?.textContent).toContain('Sky Arena Parking');
    expect(element.querySelector('.no-parking-choice')?.textContent).toContain('No Parking');
    expect(slots[2].disabled).toBe(true);
    expect(slots[2].textContent).toContain('Booked');
  });

  it('opens the clicked published event with its backend id and hides drafts', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Portal);
    const component = fixture.componentInstance as unknown as { syncView(url: string): void };
    component.syncView('/customer/events');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const cards = element.querySelectorAll<HTMLElement>('.event-card');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Published Test Event');
    expect(element.textContent).not.toContain('Hidden Draft');

    cards[0].click();
    expect(navigate).toHaveBeenCalledWith('/customer/events/10');
  });

  it('loads a direct event-details route from GET events by id', () => {
    const fixture = TestBed.createComponent(Portal);
    const component = fixture.componentInstance as unknown as {
      syncView(url: string): void;
      loadRouteData(url: string): void;
    };
    component.syncView('/customer/events/10');
    component.loadRouteData('/customer/events/10');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Published Test Event');
    expect(text).toContain('Full backend event description');
    expect(text).toContain('Test Arena');
    expect(text).toContain('General');
    expect(text).toContain('A01');
  });

  it('reuses the checkout request id after an OTP delivery failure', () => {
    const api = TestBed.inject(ApiService);
    const payloads: { requestId?: string }[] = [];
    const booking = { id: 71, eventId: 10, status: 'PendingPayment', seats: [],
      parkingSlot: null, ticketType: 'General', quantity: 1 };
    api.createBooking = vi.fn((payload) => {
      payloads.push(payload);
      return of(booking as unknown as Booking);
    });
    api.startPayment = vi.fn(() => of({ id: 81, bookingId: 71, status: 'PendingOtp' } as Payment));
    api.requestPaymentOtp = vi.fn(() => throwError(() => new HttpErrorResponse({
      status: 503, error: { title: 'Service Unavailable', detail: 'OTP delivery unavailable' },
    })));
    const fixture = TestBed.createComponent(Portal);
    const component = fixture.componentInstance as unknown as {
      syncView(url: string): void; loadEventBundle(id: number): void;
      pay(): void; toast(): string;
    };
    component.syncView('/customer/booking/payment/10');
    component.loadEventBundle(10);
    component.pay();
    component.pay();
    expect(payloads).toHaveLength(2);
    expect(payloads[0].requestId).toBeTruthy();
    expect(payloads[0].requestId).toBe(payloads[1].requestId);
    expect(component.toast()).toBe('OTP delivery unavailable');
  });

  it('does not mislabel a payment conflict as a parking conflict', () => {
    const api = TestBed.inject(ApiService);
    api.createBooking = vi.fn(() => of({ id: 71, eventId: 10, status: 'PendingPayment', seats: [] } as unknown as Booking));
    api.startPayment = vi.fn(() => throwError(() => new HttpErrorResponse({
      status: 409, error: { title: 'Conflict', detail: 'The existing payment is no longer active.' },
    })));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Portal);
    const component = fixture.componentInstance as unknown as {
      syncView(url: string): void; loadEventBundle(id: number): void; pay(): void; toast(): string;
    };
    component.syncView('/customer/booking/payment/10');
    component.loadEventBundle(10);
    component.pay();
    expect(component.toast()).toBe('The existing payment is no longer active.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('routes a real parking conflict to refreshed parking selection', () => {
    const api = TestBed.inject(ApiService);
    api.createBooking = vi.fn(() => throwError(() => new HttpErrorResponse({
      status: 409, error: { title: 'Conflict', detail: 'The selected parking slot is no longer available.' },
    })));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Portal);
    const component = fixture.componentInstance as unknown as {
      syncView(url: string): void; loadEventBundle(id: number): void; pay(): void; toast(): string;
    };
    component.syncView('/customer/booking/payment/10');
    component.loadEventBundle(10);
    component.pay();
    expect(component.toast()).toBe('The selected parking slot is no longer available.');
    expect(navigate).toHaveBeenCalledWith('/customer/booking/parking/10');
  });
});
