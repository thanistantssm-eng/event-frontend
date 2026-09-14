import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EMPTY, catchError, filter, forkJoin, of, switchMap } from 'rxjs';
import { OrderSummary, Stepper } from './ui-parts';
import { ApiService, apiErrorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import {
  Booking,
  CustomerDashboard,
  CustomerProfile,
  EventRecord,
  FavoriteEvent,
  ParkingLayout,
  ParkingSlot,
  Payment,
  PaymentReceipt,
  QrCode,
  Seat,
  TicketType,
  UserNotification,
  Venue,
} from '../../core/api.models';
import { UntitledIcon } from '../../shared/untitled-icon/untitled-icon';
import { QrVisual } from '../../shared/qr-visual/qr-visual';
import { BrandLogo } from '../../shared/brand-logo/brand-logo';
import { AppButton } from '../../shared/app-button/app-button';
import QRCode from 'qrcode';

type EventItem = {
  id: string;
  backendId: number;
  title: string;
  venue: string;
  date: string;
  time: string;
  category: string;
  price: number;
  image: number;
  format: string;
  status: string;
  description: string;
  posterUrl?: string | null;
  startAt: string;
};

type BookingDraft = {
  eventId: number;
  requestId?: string | null;
  fingerprint?: string | null;
  bookingId?: number | null;
  ticketId: number | null;
  seatId: number | null;
  parkingId: number | null;
  paymentMethod: string;
};

const emptyEvent: EventItem = {
  id: '0',
  backendId: 0,
  title: 'Event',
  venue: 'Venue to be announced',
  date: 'Date to be announced',
  time: '',
  category: 'Event',
  price: 0,
  image: 0,
  format: 'General Entry',
  status: 'Unavailable',
  description: '',
  startAt: '',
};

@Component({
  selector: 'app-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Stepper, OrderSummary, UntitledIcon, QrVisual, BrandLogo, AppButton, MatRippleModule, MatTooltipModule, MatSnackBarModule],
  templateUrl: './portal.html',
  styleUrl: './portal.css',
  encapsulation: ViewEncapsulation.None,
})
export class Portal {
  protected readonly sidebarOpen = signal(false);
  protected readonly profileOpen = signal(false);
  protected readonly bookingModal = signal(false);
  protected readonly toast = signal('');
  protected readonly loading = signal(false);
  protected readonly apiError = signal('');
  protected readonly eventDetailLoading = signal(false);
  protected readonly view = signal('dashboard');
  protected readonly activeEventId = signal('');
  protected readonly detailTab = signal<'about' | 'venue' | 'gallery'>('about');
  protected readonly bookingTab = signal<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  protected readonly parkingFilter = signal<'all' | 'active' | 'upcoming'>('all');
  protected readonly notificationFilter = signal<
    'all' | 'unread' | 'bookings' | 'payments' | 'parking'
  >('all');
  protected readonly settingsTab = signal<'general' | 'security' | 'notifications' | 'privacy'>(
    'general',
  );
  protected readonly query = signal('');
  protected readonly category = signal('All');
  protected readonly eventDate = signal('');
  protected readonly eventVenue = signal('All');
  protected readonly maxPrice = signal<number | null>(null);
  protected readonly selectedTicket = signal('');
  protected readonly selectedSeat = signal('');
  protected readonly selectedParking = signal('');
  protected readonly selectedPayment = signal('Card');
  protected readonly ticketTypes = signal<TicketType[]>([]);
  protected readonly availableSeats = signal<Seat[]>([]);
  protected readonly availableParking = signal<ParkingSlot[]>([]);
  protected readonly parkingLayout = signal<ParkingLayout | null>(null);
  protected readonly customerBookings = signal<Booking[]>([]);
  protected readonly customerPayments = signal<Payment[]>([]);
  protected readonly apiNotifications = signal<UserNotification[]>([]);
  protected readonly favoriteEvents = signal<FavoriteEvent[]>([]);
  protected readonly profile = signal<CustomerProfile | null>(null);
  protected readonly dashboard = signal<CustomerDashboard | null>(null);
  protected readonly currentBooking = signal<Booking | null>(null);
  protected readonly currentPayment = signal<Payment | null>(null);
  protected readonly currentReceipt = signal<PaymentReceipt | null>(null);
  protected readonly currentQr = signal<QrCode | null>(null);
  protected readonly selectedTicketId = signal<number | null>(null);
  protected readonly selectedSeatId = signal<number | null>(null);
  protected readonly selectedParkingId = signal<number | null>(null);
  protected readonly paymentOtp = signal('');
  protected readonly awaitingPaymentOtp = signal(false);

  private readonly eventRows = signal<EventItem[]>([]);
  private checkoutRequestId: string | null = null;
  private checkoutFingerprint: string | null = null;
  private get bookingDraftKey(): string {
    return `eventora-booking-draft-${this.auth.session()?.userId ?? 'anonymous'}`;
  }
  private loadedBundleEventId: number | null = null;
  protected get events(): EventItem[] {
    return this.eventRows();
  }

  protected readonly visibleEvents = computed(() => {
    const q = this.query().trim().toLowerCase();
    const category = this.category();
    const venue = this.eventVenue();
    const date = this.eventDate();
    const maxPrice = this.maxPrice();
    return this.events.filter(
      (item) =>
        (!q || `${item.title} ${item.venue} ${item.category}`.toLowerCase().includes(q)) &&
        (category === 'All' || item.category === category) &&
        (venue === 'All' || item.venue === venue) &&
        (!date || item.startAt.slice(0, 10) === date) &&
        (maxPrice === null || item.price <= maxPrice),
    );
  });
  protected readonly activeEvent = computed(
    () =>
      this.events.find((event) => event.id === this.activeEventId()) ??
      emptyEvent,
  );
  protected readonly activeEventAvailable = computed(() => this.activeEvent().backendId > 0);
  protected readonly eventCategories = computed(() => [
    ...new Set(this.events.map((event) => event.category)),
  ]);
  protected readonly eventVenues = computed(() => [...new Set(this.events.map((event) => event.venue))]);
  protected readonly upcomingBookings = computed(() =>
    this.customerBookings().filter(
      (booking) => booking.status !== 'Cancelled' && this.bookingStart(booking).getTime() >= Date.now(),
    ),
  );
  protected readonly pastBookings = computed(() =>
    this.customerBookings().filter(
      (booking) => booking.status !== 'Cancelled' && this.bookingStart(booking).getTime() < Date.now(),
    ),
  );
  protected readonly ticketBookings = computed(() =>
    this.customerBookings().filter(
      (booking) => booking.status === 'Confirmed' && booking.paymentStatus === 'Completed',
    ),
  );
  protected readonly parkingBookingCount = computed(() =>
    this.customerBookings().filter(
      (booking) => booking.status !== 'Cancelled' && !!booking.parkingSlot,
    ).length,
  );
  protected readonly recommendedEvents = computed(() => {
    const bookedIds = new Set(this.customerBookings().map((booking) => booking.eventId));
    return this.events.filter((event) => !bookedIds.has(event.backendId)).slice(0, 3);
  });
  protected readonly nextBooking = computed(() =>
    [...this.upcomingBookings()].sort(
      (a, b) => this.bookingStart(a).getTime() - this.bookingStart(b).getTime(),
    )[0],
  );
  protected readonly unreadNotificationCount = computed(
    () => this.apiNotifications().filter((notification) => !notification.isRead).length,
  );
  protected readonly pageLabel = computed(() => {
    const labels: Record<string, string> = {
      dashboard: 'Dashboard',
      events: 'Discover Events',
      'event-detail': 'Event Details',
      tickets: 'Select Tickets',
      seats: 'Select Seats',
      'parking-select': 'Select Parking',
      checkout: 'Booking Summary',
      payment: 'Secure Payment',
      confirmed: 'Booking Confirmed',
      bookings: 'My Bookings',
      'booking-detail': 'Booking Details',
      ticket: 'Digital Ticket',
      'my-tickets': 'Tickets & QR',
      'my-parking': 'My Parking',
      payments: 'Payments',
      receipt: 'Payment Receipt',
      notifications: 'Notifications',
      profile: 'My Profile',
      settings: 'Settings',
      support: 'Help & Support',
      favorites: 'Saved Events',
    };
    return labels[this.view()] ?? 'Customer Portal';
  });
  protected readonly selectedTicketType = computed(() =>
    this.ticketTypes().find((ticket) => ticket.id === this.selectedTicketId()),
  );
  protected get selectedTicketHold(): boolean {
    return !!this.selectedTicketId();
  }
  protected readonly hasParkingReservations = computed(() =>
    this.customerBookings().some((booking) => !!booking.parkingSlot),
  );

  protected readonly basePrice = computed(
    () =>
      this.ticketTypes().find((ticket) => ticket.id === this.selectedTicketId())?.price ??
      this.activeEvent()?.price ??
      0,
  );
  protected readonly parkingPrice = computed(
    () =>
      this.availableParking().find((slot) => slot.id === this.selectedParkingId())?.parkingFee ?? 0,
  );
  protected readonly total = computed(() => this.basePrice() + this.parkingPrice());
  protected readonly selectedParkingSlot = computed(() =>
    this.availableParking().find((slot) => slot.id === this.selectedParkingId()),
  );
  protected readonly selectedParkingArea = computed(() => {
    const slot = this.selectedParkingSlot();
    return slot
      ? this.parkingLayout()?.allocations.find(
          (allocation) => allocation.parkingAreaId === slot.parkingAreaId,
        )
      : undefined;
  });
  protected readonly parkingZones = computed(() => {
    const layout = this.parkingLayout();
    if (!layout) return [];
    return layout.allocations.map((allocation) => ({
      ...allocation,
      zone: this.zoneLabel(
        layout.slots.find((slot) => slot.parkingAreaId === allocation.parkingAreaId)?.slotNumber,
      ),
      slots: layout.slots.filter((slot) => slot.parkingAreaId === allocation.parkingAreaId),
    }));
  });

  protected readonly seatRows = computed(() => {
    const groups = new Map<string, Seat[]>();
    for (const seat of this.availableSeats()) {
      const label = seat.rowLabel || seat.seatNumber.replace(/\d+$/, '') || 'Seats';
      groups.set(label, [...(groups.get(label) ?? []), seat]);
    }
    return [...groups.entries()].map(([label, seats]) => ({ label, seats }));
  });
  protected readonly selectableSeats = computed(() => {
    const ticketId = this.selectedTicketId();
    return this.availableSeats().filter(
      (seat) => !seat.ticketTypeId || !ticketId || seat.ticketTypeId === ticketId,
    );
  });

  constructor(
    private readonly router: Router,
    private readonly api: ApiService,
    protected readonly auth: AuthService,
    private readonly snackBar: MatSnackBar,
  ) {
    this.syncView(this.router.url);
    this.loadInitialData();
    this.loadRouteData(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.syncView(event.urlAfterRedirects);
        this.loadRouteData(event.urlAfterRedirects);
        this.sidebarOpen.set(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  }

  private syncView(url: string): void {
    const clean = url.split('?')[0].replace(/^\//, '');
    if (clean.startsWith('admin')) this.view.set('admin');
    else if (clean.startsWith('organizer')) this.view.set('organizer');
    else if (clean.startsWith('customer/booking/tickets/')) {
      this.activeEventId.set(clean.split('/').at(-1) || '');
      this.view.set('tickets');
    } else if (clean.startsWith('customer/booking/seats/')) {
      this.activeEventId.set(clean.split('/').at(-1) || '');
      this.view.set('seats');
    } else if (clean.startsWith('customer/booking/parking/')) {
      this.activeEventId.set(clean.split('/').at(-1) || '');
      this.view.set('parking-select');
    } else if (clean.startsWith('customer/booking/summary/')) {
      this.activeEventId.set(clean.split('/').at(-1) || '');
      this.view.set('checkout');
    } else if (clean.startsWith('customer/booking/payment/')) {
      this.activeEventId.set(clean.split('/').at(-1) || '');
      this.view.set('payment');
    } else if (clean.startsWith('customer/booking/success/')) this.view.set('confirmed');
    else if (clean.startsWith('customer/booking/ticket/')) this.view.set('ticket');
    else if (clean === 'customer/dashboard') this.view.set('dashboard');
    else if (clean === 'customer/events') this.view.set('events');
    else if (clean.startsWith('customer/events/')) {
      this.activeEventId.set(clean.split('/').at(-1) || '');
      this.view.set('event-detail');
    } else if (clean === 'customer/bookings') this.view.set('bookings');
    else if (clean === 'customer/tickets') this.view.set('my-tickets');
    else if (clean.startsWith('customer/bookings/')) this.view.set('booking-detail');
    else if (clean === 'customer/parking') this.view.set('my-parking');
    else if (clean === 'customer/payments' || clean === 'customer/payment-history')
      this.view.set('payments');
    else if (clean === 'customer/payments/receipt') this.view.set('receipt');
    else if (clean === 'customer/notifications') this.view.set('notifications');
    else if (clean === 'customer/favorites') this.view.set('favorites');
    else if (clean === 'customer/profile') this.view.set('profile');
    else if (clean === 'customer/support') this.view.set('support');
    else if (clean === 'customer/settings') this.view.set('settings');
    else if (clean === 'app/events') this.view.set('events');
    else if (clean === 'app/checkout') this.view.set('checkout');
    else if (clean === 'app/payment') this.view.set('payment');
    else if (clean === 'app/confirmed') this.view.set('confirmed');
    else if (clean === 'app/bookings') this.view.set('bookings');
    else if (clean === 'app/parking') this.view.set('my-parking');
    else if (clean === 'app/payments/receipt') this.view.set('receipt');
    else if (clean === 'app/payments') this.view.set('payments');
    else if (clean === 'app/notifications') this.view.set('notifications');
    else this.view.set('dashboard');
  }

  protected go(path: string): void {
    const eventId = this.activeEventId() || this.events[0]?.id || '0';
    const bookingId = String(this.currentBooking()?.id ?? this.customerBookings()[0]?.id ?? 0);
    const legacyRoutes: Record<string, string> = {
      '/app/dashboard': '/customer/dashboard',
      '/app/events': '/customer/events',
      '/app/checkout': `/customer/booking/summary/${eventId}`,
      '/app/payment': `/customer/booking/payment/${eventId}`,
      '/app/confirmed': `/customer/booking/success/${bookingId}`,
      '/app/bookings': '/customer/bookings',
      '/app/parking': '/customer/parking',
      '/app/payments': '/customer/payments',
      '/app/payments/receipt': '/customer/payments/receipt',
      '/app/notifications': '/customer/notifications',
    };
    void this.router.navigateByUrl(legacyRoutes[path] ?? path);
  }
  protected openEvent(event: EventItem): void {
    this.go(`/customer/events/${event.backendId}`);
  }
  protected signOut(): void {
    this.auth.signOut();
    this.profileOpen.set(false);
    this.go('/login');
  }
  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
  protected chooseTicket(id: string): void {
    this.selectedTicket.set(id);
    const parsed = Number(id);
    this.selectedTicketId.set(Number.isFinite(parsed) ? parsed : null);
    this.persistBookingDraft();
  }
  protected chooseSeat(seat: Seat): void {
    this.selectedSeat.set(seat.seatNumber);
    this.selectedSeatId.set(seat.id);
    this.persistBookingDraft();
  }
  protected chooseParking(slot: ParkingSlot): void {
    if (!slot.isActive || slot.status !== 'Available') return;
    const selected = this.selectedParkingId() === slot.id;
    this.selectedParking.set(selected ? '' : slot.slotNumber);
    this.selectedParkingId.set(selected ? null : slot.id);
    this.persistBookingDraft();
  }
  protected clearParking(): void {
    this.selectedParking.set('');
    this.selectedParkingId.set(null);
    this.persistBookingDraft();
  }
  protected choosePayment(method: string): void {
    this.selectedPayment.set(method);
    this.persistBookingDraft();
  }
  protected pay(): void {
    if (this.loading()) return;
    if (this.awaitingPaymentOtp()) {
      this.verifyPayment();
      return;
    }
    const eventId = Number(this.activeEventId());
    const customerId = this.auth.session()?.customerId ?? this.profile()?.id;
    const ticket = this.ticketTypes().find((item) => item.id === this.selectedTicketId());
    if (!eventId || !customerId || !ticket) {
      this.flash('Choose an event and ticket type before payment.');
      return;
    }
    if (this.activeEvent()?.format === 'Seat Based' && !this.selectedSeatId()) {
      this.flash('Choose an available seat before payment.');
      return;
    }
    this.loading.set(true);
    const method = this.selectedPayment();
    const fingerprint = JSON.stringify([
      eventId, ticket.id, this.selectedSeatId(), this.selectedParkingId(), 1,
    ]);
    if (!this.checkoutRequestId || this.checkoutFingerprint !== fingerprint) {
      this.checkoutRequestId = crypto.randomUUID();
      this.checkoutFingerprint = fingerprint;
    }
    this.persistBookingDraft();
    this.api
      .createBooking({
        eventId,
        requestId: this.checkoutRequestId,
        seatIds: this.selectedSeatId() ? [this.selectedSeatId()!] : [],
        parkingSlotId: this.selectedParkingId(),
        ticketType: ticket.name,
        quantity: 1,
      })
      .pipe(
        switchMap((booking) => {
          this.currentBooking.set(booking);
          this.persistBookingDraft();
          if (booking.status === 'Confirmed') {
            this.loading.set(false);
            this.clearBookingDraft();
            this.go(`/customer/booking/success/${booking.id}`);
            return EMPTY;
          }
          return this.api.startPayment(booking.id, method);
        }),
        switchMap((payment) => {
          this.currentPayment.set(payment);
          if (payment.status === 'Completed') {
            this.loading.set(false);
            this.clearBookingDraft();
            this.go(`/customer/booking/success/${payment.bookingId}`);
            return EMPTY;
          }
          return this.api.requestPaymentOtp(payment.id);
        }),
      )
      .subscribe({
        next: (otp) => {
          this.loading.set(false);
          this.awaitingPaymentOtp.set(true);
          this.flash(
            otp.developmentCode
              ? `Payment OTP sent. Development code: ${otp.developmentCode}`
              : 'Payment OTP sent. Enter the code to confirm.',
          );
        },
        error: (error) => {
          this.loading.set(false);
          const message = apiErrorMessage(error);
          if (
            (error as { status?: number })?.status === 409 &&
            /parking slot/i.test(message)
          ) {
            this.clearParking();
            this.loadEventBundle(eventId);
            this.go(`/customer/booking/parking/${eventId}`);
            this.flash(message);
          } else if (
            (error as { status?: number })?.status === 409 &&
            /seat/i.test(message)
          ) {
            this.selectedSeat.set('');
            this.selectedSeatId.set(null);
            this.persistBookingDraft();
            this.loadEventBundle(eventId);
            this.go(`/customer/booking/seats/${eventId}`);
            this.flash(message);
          } else {
            if (/checkout has expired|checkout identifier/i.test(message)) {
              this.checkoutRequestId = null;
              this.checkoutFingerprint = null;
              this.currentBooking.set(null);
              this.currentPayment.set(null);
              this.awaitingPaymentOtp.set(false);
              this.persistBookingDraft();
            }
            this.flash(message);
          }
        },
      });
  }
  protected confirmCancel(): void {
    const booking = this.currentBooking();
    const customerId = this.auth.session()?.customerId ?? this.profile()?.id;
    if (!booking || !customerId) {
      this.bookingModal.set(false);
      this.flash('Booking details are not available.');
      return;
    }
    this.api.cancelBooking(booking.id).subscribe({
      next: () => {
        this.bookingModal.set(false);
        this.currentBooking.set({ ...booking, status: 'Cancelled' });
        this.loadCustomerHistory(customerId);
        this.flash('Booking cancelled successfully.');
      },
      error: (error) => this.flash(apiErrorMessage(error)),
    });
  }
  protected async download(label = 'Ticket'): Promise<void> {
    const booking = this.currentBooking();
    const eventName = booking?.eventName ?? this.activeEvent()?.title ?? 'Event';
    const bookingNumber = booking?.bookingNumber ?? 'Pending';
    const seats = booking?.seats.join(', ') || this.selectedSeat() || 'General admission';
    const parking = booking?.parkingSlot || this.selectedParking() || 'Not selected';
    const total = booking?.totalAmount ?? this.total();

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const qrValue = this.currentQr()?.payload || this.currentQr()?.token || bookingNumber;
      const qrImage = await QRCode.toDataURL(qrValue, {
        width: 640,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#15221c', light: '#ffffff' },
      });

      doc.setFillColor(247, 249, 247);
      doc.rect(0, 0, 210, 297, 'F');
      doc.setFillColor(24, 94, 65);
      doc.roundedRect(18, 18, 174, 42, 5, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('EVENTORA  /  DIGITAL PASS', 28, 34);
      doc.setFontSize(22);
      doc.text(label.toUpperCase(), 28, 49);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(220, 227, 222);
      doc.roundedRect(18, 68, 174, 188, 5, 5, 'FD');
      doc.setTextColor(21, 34, 28);
      doc.setFontSize(20);
      doc.text(doc.splitTextToSize(eventName, 104), 28, 88);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(98, 112, 104);
      doc.text(`Booking ${bookingNumber}`, 28, 112);
      doc.text('SEAT / ACCESS', 28, 132);
      doc.text('PARKING', 28, 158);
      doc.text('TOTAL', 28, 184);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(21, 34, 28);
      doc.text(seats, 28, 141);
      doc.text(parking, 28, 167);
      doc.text(`LKR ${total.toLocaleString()}`, 28, 193);
      doc.addImage(qrImage, 'PNG', 128, 105, 48, 48);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(98, 112, 104);
      doc.text('Scan this QR at the entrance', 128, 161);
      doc.text('Keep this pass ready for event and parking validation.', 28, 228);
      doc.setFontSize(8);
      doc.text('Generated securely by Eventora', 28, 246);
      doc.save(`${label.toLowerCase().replace(/\s+/g, '-')}-${bookingNumber}.pdf`);
      this.flash(`${label} PDF downloaded`);
    } catch {
      this.flash(`Unable to generate the ${label.toLowerCase()} PDF. Please try again.`);
    }
  }
  protected shareTicket(): void {
    const text = `${this.currentBooking()?.eventName ?? this.activeEvent()?.title ?? 'Event'} ticket — seat ${this.currentBooking()?.seats.join(', ') || this.selectedSeat()}`;
    if (navigator.share) {
      void navigator
        .share({ title: 'Eventora Ticket', text })
        .catch(() => this.flash('Sharing cancelled'));
      return;
    }
    void navigator.clipboard?.writeText(text);
    this.flash('Ticket details copied');
  }
  protected flash(message: string): void {
    this.toast.set(message);
    this.snackBar.open(message, 'Dismiss', { duration: 3200, horizontalPosition: 'right', verticalPosition: 'top' });
    window.setTimeout(() => this.toast.set(''), 2600);
  }
  protected spritePosition(index: number): string {
    return `${index * 33.333}% center`;
  }
  protected downloadBooking(booking: Booking): void {
    this.currentBooking.set(booking);
    this.currentQr.set(null);
    this.api.bookingQr(booking.id).subscribe({
      next: (qr) => {
        this.currentQr.set(qr);
        void this.download('Ticket');
      },
      error: () => void this.download('Ticket'),
    });
  }
  protected bookingForPayment(payment: Payment): Booking | undefined {
    return this.customerBookings().find((booking) => booking.id === payment.bookingId);
  }
  protected openReceipt(payment: Payment): void {
    this.currentPayment.set(payment);
    this.api.paymentReceipt(payment.id).subscribe({
      next: (receipt) => {
        this.currentReceipt.set(receipt);
        this.go('/customer/payments/receipt');
      },
      error: (error) => this.flash(apiErrorMessage(error)),
    });
  }
  protected openBooking(booking: Booking): void {
    this.currentBooking.set(booking);
    this.go(`/customer/bookings/${booking.id}`);
  }
  protected openTicket(booking: Booking): void {
    this.currentBooking.set(booking);
    this.go(`/customer/booking/ticket/${booking.id}`);
  }
  protected beginBooking(event: EventItem): void {
    this.activeEventId.set(event.id);
    this.go(`/customer/booking/tickets/${event.id}`);
  }
  protected isFavorite(eventId: number): boolean {
    return this.favoriteEvents().some((favorite) => favorite.eventId === eventId);
  }
  protected eventForFavorite(favorite: FavoriteEvent): EventItem | undefined {
    return this.events.find((event) => event.backendId === favorite.eventId);
  }
  protected toggleFavorite(eventId: number): void {
    const removing = this.isFavorite(eventId);
    if (removing) {
      this.api.removeFavorite(eventId).subscribe({
        next: () => {
          this.favoriteEvents.update((items) => items.filter((item) => item.eventId !== eventId));
          this.flash('Removed from saved events.');
        },
        error: (error: unknown) => this.flash(apiErrorMessage(error)),
      });
      return;
    }

    this.api.addFavorite(eventId).subscribe({
      next: (favorite) => {
        this.favoriteEvents.update((items) => [favorite, ...items]);
        this.flash('Event saved.');
      },
      error: (error: unknown) => this.flash(apiErrorMessage(error)),
    });
  }
  protected markRead(notification: UserNotification): void {
    if (notification.isRead) return;
    const request = notification.customerId
      ? this.api.markTransactionNotificationRead(notification.id)
      : this.api.markNotificationRead(notification.id);
    request.subscribe({
      next: (updated) => {
        this.apiNotifications.update((items) =>
          items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
        );
      },
      error: (error) => this.flash(apiErrorMessage(error)),
    });
  }

  protected markAllRead(): void {
    this.api.markAllTransactionNotificationsRead().subscribe({
      next: () => {
        this.apiNotifications.update((items) => items.map((item) => ({ ...item, isRead: true })));
        this.flash('All notifications marked as read.');
      },
      error: (error) => this.flash(apiErrorMessage(error)),
    });
  }

  protected saveProfile(name: string, phone: string): void {
    this.api.updateCustomerProfile(name, phone).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.flash('Profile updated successfully.');
      },
      error: (error) => this.flash(apiErrorMessage(error)),
    });
  }

  private verifyPayment(): void {
    const payment = this.currentPayment();
    if (!payment || !/^\d{6}$/.test(this.paymentOtp())) {
      this.flash('Enter the 6-digit payment OTP.');
      return;
    }
    this.loading.set(true);
    this.api.verifyPaymentOtp(payment.id, this.paymentOtp()).subscribe({
      next: (completed) => {
        this.loading.set(false);
        this.currentPayment.set(completed);
        this.awaitingPaymentOtp.set(false);
        this.clearBookingDraft();
        this.go(`/customer/booking/success/${this.currentBooking()!.id}`);
      },
      error: (error) => {
        this.loading.set(false);
        this.flash(apiErrorMessage(error));
      },
    });
  }

  private loadInitialData(): void {
    forkJoin({
      events: this.api.events({ status: 'Published' }),
      venues: this.api.venues(),
    }).subscribe({
      next: ({ events, venues }) => {
        const publishedEvents = events.filter((event) => event.status === 'Published');
        this.eventRows.set(
          publishedEvents.map((event, index) => this.toEventItem(event, venues, index)),
        );
        if (!this.activeEventId() && this.events[0]) {
          this.activeEventId.set(this.events[0].id);
        }
      },
      error: (error) => this.apiError.set(apiErrorMessage(error)),
    });
    this.api.customerProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loadCustomerHistory(profile.id);
      },
      error: (error) => this.apiError.set(apiErrorMessage(error)),
    });
    this.api.customerDashboard().subscribe({ next: (data) => this.dashboard.set(data) });
    this.api.favorites().subscribe({
      next: (items) => this.favoriteEvents.set(items),
      error: (error) => this.apiError.set(apiErrorMessage(error)),
    });
    this.api.myTransactionNotifications().subscribe({
      next: (items) => this.apiNotifications.set(items),
      error: (error) => this.apiError.set(apiErrorMessage(error)),
    });
  }

  private loadCustomerHistory(customerId: number): void {
    forkJoin({
      bookings: this.api.myBookings(),
      payments: this.api.myPayments(),
    }).subscribe({
      next: ({ bookings, payments }) => {
        this.customerBookings.set(bookings);
        this.customerPayments.set(payments);
      },
      error: (error) => this.apiError.set(apiErrorMessage(error)),
    });
  }

  private loadRouteData(url: string): void {
    const clean = url.split('?')[0].replace(/^\//, '');
    const last = Number(clean.split('/').at(-1));
    if (
      Number.isFinite(last) &&
      last > 0 &&
      (clean.startsWith('customer/events/') || clean.startsWith('customer/booking/')) &&
      !clean.includes('/success/') &&
      !clean.includes('/ticket/')
    ) {
      this.loadEventBundle(last);
    }
    if (
      Number.isFinite(last) &&
      (clean.startsWith('customer/bookings/') ||
        clean.includes('/success/') ||
        clean.includes('/ticket/'))
    ) {
      this.api.booking(last).subscribe({
        next: (booking) => {
          this.currentBooking.set(booking);
          this.activeEventId.set(String(booking.eventId));
          if (clean.includes('/ticket/')) {
            this.api.bookingQr(booking.id).subscribe({ next: (qr) => this.currentQr.set(qr) });
          }
        },
        error: (error) => this.apiError.set(apiErrorMessage(error)),
      });
    }
  }

  private loadEventBundle(eventId: number): void {
    if (this.loadedBundleEventId !== eventId) {
      this.loadedBundleEventId = eventId;
      const draft = this.readBookingDraft(eventId);
      this.checkoutRequestId = draft?.requestId ?? null;
      this.checkoutFingerprint = draft?.fingerprint ?? null;
      this.selectedTicketId.set(draft?.ticketId ?? null);
      this.selectedSeatId.set(draft?.seatId ?? null);
      this.selectedParkingId.set(draft?.parkingId ?? null);
      this.selectedPayment.set(draft?.paymentMethod || 'Card');
      this.selectedTicket.set('');
      this.selectedSeat.set('');
      this.selectedParking.set('');
    }
    this.eventDetailLoading.set(true);
    this.apiError.set('');
    forkJoin({
      event: this.api.event(eventId),
      venues: this.api.venues(),
      tickets: this.api.tickets(eventId),
      seats: this.api.seats(eventId),
      parking: this.api.eventParkingLayout(eventId),
      booking: this.readBookingDraft(eventId)?.bookingId
        ? this.api.booking(this.readBookingDraft(eventId)!.bookingId!).pipe(catchError(() => of(null)))
        : of(null),
    }).subscribe({
      next: ({ event, venues, tickets, seats, parking, booking }) => {
        if (booking?.eventId === eventId) this.currentBooking.set(booking);
        this.eventDetailLoading.set(false);
        const mapped = this.toEventItem(event, venues, 0);
        this.eventRows.update((items) => {
          const existingIndex = items.findIndex((item) => item.backendId === event.id);
          return existingIndex >= 0
            ? items.map((item, index) => (index === existingIndex ? mapped : item))
            : [mapped, ...items];
        });
        this.ticketTypes.set(tickets.filter((item) => item.isActive));
        this.availableSeats.set(seats.filter((item) => item.isActive));
        this.parkingLayout.set(parking);
        this.availableParking.set(parking.slots.filter((item) => item.isActive));
        const activeTickets = tickets.filter((item) => item.isActive);
        const selectedTicket = activeTickets.find(
          (ticket) => ticket.id === this.selectedTicketId(),
        );
        if (selectedTicket) {
          this.selectedTicket.set(String(selectedTicket.id));
        } else if (activeTickets[0]) {
          this.chooseTicket(String(activeTickets[0].id));
        } else {
          this.selectedTicketId.set(null);
        }
        const selectedSeat = seats.find(
          (seat) =>
            seat.id === this.selectedSeatId() && seat.isActive &&
            (seat.status === 'Available' ||
              (this.currentBooking()?.eventId === eventId &&
                this.currentBooking()?.status === 'PendingPayment' &&
                this.currentBooking()?.seats.includes(seat.seatNumber))),
        );
        this.selectedSeatId.set(selectedSeat?.id ?? null);
        this.selectedSeat.set(selectedSeat?.seatNumber ?? '');
        const selectedParking = parking.slots.find(
          (slot) =>
            slot.id === this.selectedParkingId() && slot.isActive &&
            (slot.status === 'Available' ||
              (this.currentBooking()?.eventId === eventId &&
                this.currentBooking()?.status === 'PendingPayment' &&
                this.currentBooking()?.parkingSlot === slot.slotNumber &&
                this.currentBooking()?.parkingArea === parking.allocations.find(
                  (area) => area.parkingAreaId === slot.parkingAreaId)?.parkingAreaName)),
        );
        this.selectedParkingId.set(selectedParking?.id ?? null);
        this.selectedParking.set(selectedParking?.slotNumber ?? '');
        this.persistBookingDraft();
      },
      error: (error) => {
        this.eventDetailLoading.set(false);
        this.apiError.set(apiErrorMessage(error));
      },
    });
  }

  private readBookingDraft(eventId: number): BookingDraft | null {
    try {
      const stored = sessionStorage.getItem(this.bookingDraftKey);
      if (!stored) return null;
      const draft = JSON.parse(stored) as Partial<BookingDraft>;
      return draft.eventId === eventId
        ? {
            eventId,
            requestId: typeof draft.requestId === 'string' ? draft.requestId : null,
            fingerprint: typeof draft.fingerprint === 'string' ? draft.fingerprint : null,
            bookingId: typeof draft.bookingId === 'number' ? draft.bookingId : null,
            ticketId: typeof draft.ticketId === 'number' ? draft.ticketId : null,
            seatId: typeof draft.seatId === 'number' ? draft.seatId : null,
            parkingId: typeof draft.parkingId === 'number' ? draft.parkingId : null,
            paymentMethod: typeof draft.paymentMethod === 'string' ? draft.paymentMethod : 'Card',
          }
        : null;
    } catch {
      sessionStorage.removeItem(this.bookingDraftKey);
      return null;
    }
  }

  private persistBookingDraft(): void {
    const eventId = Number(this.activeEventId());
    if (!Number.isFinite(eventId) || eventId <= 0) return;
    const draft: BookingDraft = {
      eventId,
      requestId: this.checkoutRequestId,
      fingerprint: this.checkoutFingerprint,
      bookingId: this.currentBooking()?.eventId === eventId ? this.currentBooking()?.id : null,
      ticketId: this.selectedTicketId(),
      seatId: this.selectedSeatId(),
      parkingId: this.selectedParkingId(),
      paymentMethod: this.selectedPayment(),
    };
    sessionStorage.setItem(this.bookingDraftKey, JSON.stringify(draft));
  }

  private clearBookingDraft(): void {
    sessionStorage.removeItem(this.bookingDraftKey);
    this.checkoutRequestId = null;
    this.checkoutFingerprint = null;
  }

  private toEventItem(event: EventRecord, venues: Venue[], index: number): EventItem {
    const start = new Date(event.startDateTime);
    return {
      id: String(event.id),
      backendId: event.id,
      title: event.name,
      venue:
        event.venueMode === 'ExternalProperty'
          ? event.externalVenueName || 'External venue'
          : venues.find((venue) => venue.id === event.venueId)?.name ?? `Venue #${event.venueId}`,
      date: start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      category: event.eventCategoryName || 'Event',
      price: event.ticketPrice,
      image: index % 4,
      format: event.eventType === 'SeatBased' ? 'Seat Based' : 'General Entry',
      status: event.status,
      description: event.description,
      posterUrl: event.posterUrl,
      startAt: event.startDateTime,
    };
  }

  protected bookingVenue(booking: Booking): string {
    return (
      booking.externalVenueName ||
      this.events.find((event) => event.backendId === booking.eventId)?.venue ||
      'Venue to be announced'
    );
  }

  protected bookingStart(booking: Booking): Date {
    const value =
      booking.eventStartDateTime ||
      this.events.find((event) => event.backendId === booking.eventId)?.startAt ||
      booking.createdAtUtc;
    return new Date(value);
  }

  protected zoneLabel(slotNumber?: string): string {
    const zone = slotNumber?.match(/^[A-Za-z]+/)?.[0]?.toUpperCase();
    return zone ? `Zone ${zone}` : 'Parking Zone';
  }
}
