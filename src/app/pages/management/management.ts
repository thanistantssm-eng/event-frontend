import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, filter, finalize, forkJoin, of, switchMap } from 'rxjs';
import { ApiService, apiErrorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import {
  AdminDashboard,
  AdminReport,
  Approval,
  Booking,
  EventCategory,
  EventRecord,
  EventReport,
  Organizer,
  OrganizerDashboard,
  OrganizerTicketSales,
  ParkingArea,
  ParkingLayout,
  ParkingSlot,
  Payment,
  Property,
  Seat,
  TicketType,
  UserNotification,
  User,
  Venue,
} from '../../core/api.models';
import { UntitledIcon } from '../../shared/untitled-icon/untitled-icon';
import { QrVisual } from '../../shared/qr-visual/qr-visual';
import { BrandLogo } from '../../shared/brand-logo/brand-logo';
import { AppButton } from '../../shared/app-button/app-button';

type Role = 'organizer' | 'admin';
type RowStatus =
  | 'Published'
  | 'Approved'
  | 'Pending'
  | 'Draft'
  | 'Rejected'
  | 'Confirmed'
  | 'Paid'
  | 'Active'
  | 'Inactive'
  | 'Cancelled';

type EventRow = {
  id: string;
  backendId: number;
  organizerId: number | null;
  categoryId: number;
  title: string;
  venue: string;
  date: string;
  type: string;
  status: RowStatus;
  bookings: number;
  revenue: string;
  image: string;
};

@Component({
  selector: 'app-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, UntitledIcon, QrVisual, BrandLogo, AppButton, MatRippleModule, MatTooltipModule, MatSnackBarModule],
  templateUrl: './management.html',
  styleUrl: './management.css',
})
export class Management {
  protected readonly role = signal<Role>('organizer');
  protected readonly view = signal('dashboard');
  protected readonly toast = signal('');
  protected readonly sidebarOpen = signal(false);
  protected readonly query = signal('');
  protected readonly statusFilter = signal('All');
  protected readonly activeWizardStep = signal(1);
  protected readonly showModal = signal(false);
  protected readonly seatCells = Array.from({ length: 64 });
  protected readonly miniSeatCells = Array.from({ length: 36 });
  protected readonly parkingCells = Array.from({ length: 48 });
  protected readonly modalMode = signal<'approve' | 'reject' | 'delete' | 'cancel-event' | 'delete-event'>('approve');
  protected readonly selectedName = signal('');
  protected readonly selectedEventActionId = signal<number | null>(null);
  protected readonly actionReason = signal('');
  protected readonly selectedSeatIndex = signal<number | null>(null);
  protected readonly selectedParkingIndex = signal<number | null>(null);
  protected readonly selectedWizardType = signal<'seat' | 'general'>('seat');
  protected readonly setupMode = signal<'seat' | 'general'>('seat');
  protected readonly notificationTab = signal('All');
  protected readonly settingsSection = signal('General');
  protected readonly loading = signal(false);
  protected readonly actionLoading = signal(false);
  protected readonly apiError = signal('');
  protected readonly properties = signal<Property[]>([]);
  protected readonly venues = signal<Venue[]>([]);
  protected readonly organizers = signal<Organizer[]>([]);
  protected readonly approvals = signal<Approval[]>([]);
  protected readonly categories = signal<EventCategory[]>([]);
  protected readonly activeVenues = computed(() => this.venues().filter((venue) => venue.isActive));
  protected readonly activeCategories = computed(() =>
    this.categories().filter((category) => category.isActive),
  );
  protected readonly activeProperties = computed(() =>
    this.properties().filter((property) => property.isActive),
  );
  protected readonly users = signal<User[]>([]);
  protected readonly parkingAreas = signal<ParkingArea[]>([]);
  protected readonly adminDashboard = signal<AdminDashboard | null>(null);
  protected readonly organizerDashboard = signal<OrganizerDashboard | null>(null);
  protected readonly adminReport = signal<AdminReport | null>(null);
  protected readonly ticketSales = signal<OrganizerTicketSales | null>(null);
  protected readonly bookings = signal<Booking[]>([]);
  protected readonly payments = signal<Payment[]>([]);
  protected readonly apiNotifications = signal<UserNotification[]>([]);
  protected readonly organizerProfile = signal<Organizer | null>(null);
  protected readonly eventTickets = signal<TicketType[]>([]);
  protected readonly eventSeats = signal<Seat[]>([]);
  protected readonly eventParking = signal<ParkingLayout | null>(null);
  protected readonly eventReport = signal<EventReport | null>(null);
  protected readonly generatedAdminEventReport = signal<EventReport | null>(null);
  protected readonly adminReportOrganizerId = signal<number>(0);
  protected readonly adminReportEventId = signal<number>(0);
  protected readonly parkingAreaSlots = signal<ParkingSlot[]>([]);
  protected readonly selectedParkingAreaId = signal<number>(0);
  protected readonly selectedApprovalId = signal<number | null>(null);
  protected readonly selectedCategoryId = signal<number | null>(null);
  protected readonly eventForm = {
    organizerId: 0,
    name: '',
    description: '',
    eventType: 'NonSeatBased',
    venueMode: 'OurProperty' as 'OurProperty' | 'ExternalProperty',
    venueId: 0,
    externalVenueName: '',
    externalVenueAddress: '',
    eventCategoryId: 0,
    startDateTime: '',
    endDateTime: '',
    ticketPrice: 0,
    posterUrl: '',
  };
  protected readonly propertyForm = { name: '', address: '', city: '', description: '' };
  protected readonly venueForm = { propertyId: 0, name: '', location: '', capacity: 1 };
  protected readonly categoryForm = { name: '', description: '' };
  protected readonly ticketForm = { name: '', description: '', price: 0, quantity: 1 };
  protected readonly seatForm = {
    ticketTypeId: 0,
    seatNumber: '',
    rowLabel: '',
    columnNumber: 1,
    priceOverride: null as number | null,
  };
  protected readonly bulkSeatForm = {
    startRow: 'A',
    rowCount: 1,
    seatsPerRow: 10,
    startNumber: 1,
    ticketTypeId: 0,
    priceOverride: null as number | null,
  };
  protected readonly parkingForm = { parkingAreaId: 0, allocatedSlotCount: 1, parkingFee: 0 };
  protected readonly parkingAreaForm = { venueId: 0, name: '', description: '', capacity: 20 };
  protected readonly bulkParkingForm = {
    startingZone: 'A',
    zoneCount: 1,
    slotsPerZone: 10,
    startingNumber: 1,
    slotType: 'Standard',
  };

  protected readonly adminReportEvents = computed(() =>
    this.eventRows().filter((event) => event.organizerId === this.adminReportOrganizerId()),
  );

  private readonly eventRows = signal<EventRow[]>([]);
  private visibleEventRecords: EventRecord[] = [];
  private loadedVenues: Venue[] = [];
  protected get organizerEvents(): EventRow[] {
    return this.eventRows();
  }

  protected readonly filteredEvents = computed(() => {
    const q = this.query().toLowerCase().trim();
    const s = this.statusFilter();
    return this.organizerEvents.filter(
      (e) =>
        (!q || `${e.title} ${e.venue} ${e.type}`.toLowerCase().includes(q)) &&
        (s === 'All' || e.status === s),
    );
  });

  protected readonly visibleBookings = computed(() => {
    const eventId = this.routeEventId();
    return eventId
      ? this.bookings().filter((booking) => booking.eventId === eventId)
      : this.bookings();
  });

  protected readonly adminNav = [
    ['Dashboard', '/admin/dashboard', 'home-line'],
    ['Venues', '/admin/venues', 'marker-pin-01'],
    ['Properties', '/admin/properties', 'building-02'],
    ['Organizers', '/admin/organizers', 'users-01'],
    ['Categories', '/admin/categories', 'ticket-01'],
    ['Events', '/admin/events', 'calendar'],
    ['Parkings', '/admin/parking', 'car-01'],
    ['Bookings', '/admin/bookings', 'ticket-01'],
    ['Payments', '/admin/payments', 'credit-card-01'],
    ['Approvals', '/admin/approvals', 'check-circle'],
    ['Reports', '/admin/reports', 'bar-chart-square-02'],
    ['Users', '/admin/users', 'user-01'],
    ['Notifications', '/admin/notifications', 'bell-01'],
    ['Settings', '/admin/settings', 'settings-01'],
  ];
  protected readonly organizerNav = [
    ['Dashboard', '/organizer/dashboard', 'home-line'],
    ['My Events', '/organizer/my-events', 'calendar'],
    ['Create Event', '/organizer/events/create/type', 'plus'],
    ['Approvals', '/organizer/approvals', 'check-circle'],
    ['Bookings', '/organizer/bookings', 'ticket-01'],
    ['Reports', '/organizer/reports', 'bar-chart-square-02'],
    ['Notifications', '/organizer/notifications', 'bell-01'],
    ['Profile', '/organizer/profile', 'user-01'],
    ['Settings', '/organizer/settings', 'settings-01'],
  ];

  constructor(
    protected readonly router: Router,
    private readonly api: ApiService,
    protected readonly auth: AuthService,
    private readonly snackBar: MatSnackBar,
  ) {
    this.sync(this.router.url);
    this.loadData();
    this.loadRouteEntity(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.sync(e.urlAfterRedirects);
        this.loadRouteEntity(e.urlAfterRedirects);
        this.sidebarOpen.set(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  }

  private sync(url: string): void {
    const clean = url.split('?')[0].replace(/^\//, '');
    this.role.set(clean.startsWith('admin') ? 'admin' : 'organizer');
    const parts = clean.split('/');
    if (this.role() === 'organizer') {
      if (clean === 'organizer' || clean === 'organizer/dashboard') this.view.set('dashboard');
      else if (clean === 'organizer/events/create') {
        this.activeWizardStep.set(1);
        this.view.set('create-type');
      } else if (clean === 'organizer/my-events') this.view.set('my-events');
      else if (clean.includes('/events/create/type')) {
        this.activeWizardStep.set(1);
        this.view.set('create-type');
      } else if (clean.includes('/events/create/details')) {
        this.activeWizardStep.set(2);
        this.view.set('create-details');
      } else if (clean.includes('/events/create/seats-or-capacity')) {
        this.activeWizardStep.set(3);
        this.view.set('create-seats');
      } else if (clean.includes('/events/create/ticket-pricing')) {
        this.activeWizardStep.set(4);
        this.view.set('create-pricing');
      } else if (clean.includes('/events/create/parking')) {
        this.activeWizardStep.set(5);
        this.view.set('create-parking');
      } else if (clean.includes('/events/create/poster-qr')) {
        this.activeWizardStep.set(6);
        this.view.set('create-poster');
      } else if (clean.includes('/events/create/review')) {
        this.activeWizardStep.set(7);
        this.view.set('create-review');
      } else if (clean.includes('/events/create/submit')) {
        this.activeWizardStep.set(8);
        this.view.set('create-submit');
      } else if (clean.endsWith('/seats')) this.view.set('seat-manage');
      else if (clean.endsWith('/ticket-pricing')) this.view.set('pricing-manage');
      else if (clean.endsWith('/parking-setup')) this.view.set('parking-manage');
      else if (clean.endsWith('/bookings')) this.view.set('event-bookings');
      else if (clean.endsWith('/reports')) this.view.set('event-reports');
      else if (clean.endsWith('/poster-qr')) this.view.set('poster-qr');
      else if (clean.endsWith('/edit')) this.view.set('event-edit');
      else if (clean === 'organizer/approvals') this.view.set('approvals');
      else if (clean === 'organizer/bookings') this.view.set('event-bookings');
      else if (clean === 'organizer/notifications') this.view.set('notifications');
      else if (clean === 'organizer/reports') this.view.set('reports');
      else if (clean === 'organizer/profile') this.view.set('profile');
      else if (clean === 'organizer/settings') this.view.set('settings');
      else if (parts[1] === 'events' && parts.length >= 3) this.view.set('event-detail');
      else this.view.set('dashboard');
    } else {
      if (clean === 'admin' || clean === 'admin/dashboard') this.view.set('dashboard');
      else if (clean === 'admin/properties') this.view.set('properties');
      else if (clean === 'admin/venues') this.view.set('venues');
      else if (clean === 'admin/properties/create') this.view.set('property-form');
      else if (clean.endsWith('/edit') && clean.startsWith('admin/properties/'))
        this.view.set('property-form');
      else if (/^admin\/properties\/[^/]+$/.test(clean)) this.view.set('property-detail');
      else if (clean === 'admin/organizers') this.view.set('organizers');
      else if (clean === 'admin/users') this.view.set('users');
      else if (/^admin\/organizers\/[^/]+$/.test(clean)) this.view.set('organizer-detail');
      else if (clean === 'admin/events') this.view.set('events');
      else if (clean === 'admin/events/create') this.view.set('admin-event-form');
      else if (clean.endsWith('/edit') && clean.startsWith('admin/events/'))
        this.view.set('event-edit');
      else if (clean.endsWith('/seats') && clean.startsWith('admin/events/'))
        this.view.set('seat-manage');
      else if (clean.endsWith('/ticket-pricing') && clean.startsWith('admin/events/'))
        this.view.set('pricing-manage');
      else if (/^admin\/events\/[^/]+\/layout$/.test(clean)) this.view.set('admin-layout');
      else if (/^admin\/events\/[^/]+$/.test(clean)) this.view.set('admin-event-detail');
      else if (clean === 'admin/approvals') this.view.set('admin-approvals');
      else if (/^admin\/approvals\/[^/]+$/.test(clean)) this.view.set('approval-detail');
      else if (clean === 'admin/bookings') this.view.set('admin-bookings');
      else if (/^admin\/bookings\/[^/]+$/.test(clean)) this.view.set('booking-detail');
      else if (clean === 'admin/payments') this.view.set('admin-payments');
      else if (/^admin\/payments\/[^/]+$/.test(clean)) this.view.set('payment-detail');
      else if (clean === 'admin/parking') this.view.set('admin-parking');
      else if (clean === 'admin/reports') this.view.set('admin-reports');
      else if (clean === 'admin/categories') this.view.set('categories');
      else if (clean === 'admin/notifications') this.view.set('admin-notifications');
      else if (clean === 'admin/settings') this.view.set('admin-settings');
      else this.view.set('dashboard');
    }
  }

  protected go(path: string): void {
    void this.router.navigateByUrl(path);
  }
  protected showBackNavigation(): boolean {
    return ![
      'dashboard',
      'my-events',
      'approvals',
      'event-bookings',
      'reports',
      'notifications',
      'profile',
      'settings',
      'properties',
      'venues',
      'organizers',
      'users',
      'events',
      'admin-approvals',
      'admin-bookings',
      'admin-payments',
      'admin-parking',
      'admin-reports',
      'categories',
      'admin-notifications',
      'admin-settings',
    ].includes(this.view());
  }
  protected goBack(): void {
    const current = this.view();
    if (this.role() === 'organizer') {
      const eventChildViews = ['event-detail', 'event-edit', 'seat-manage', 'pricing-manage', 'parking-manage', 'event-reports', 'poster-qr'];
      this.go(eventChildViews.includes(current) ? '/organizer/my-events' : '/organizer/dashboard');
      return;
    }

    if (['admin-event-detail', 'admin-event-form', 'event-edit', 'seat-manage', 'pricing-manage', 'admin-layout'].includes(current)) {
      this.go('/admin/events');
    } else if (current === 'approval-detail') {
      this.go('/admin/approvals');
    } else if (current === 'booking-detail') {
      this.go('/admin/bookings');
    } else if (current === 'payment-detail') {
      this.go('/admin/payments');
    } else if (current === 'organizer-detail') {
      this.go('/admin/organizers');
    } else if (['property-detail', 'property-form'].includes(current)) {
      this.go('/admin/properties');
    } else {
      this.go('/admin/dashboard');
    }
  }
  protected goToNotifications(): void {
    this.go(this.role() === 'admin' ? '/admin/notifications' : '/organizer/notifications');
  }
  protected goToAccount(): void {
    this.go(this.role() === 'admin' ? '/admin/settings' : '/organizer/profile');
  }
  protected flash(message: string): void {
    this.toast.set(message);
    this.snackBar.open(message, 'Dismiss', { duration: 3200, horizontalPosition: 'right', verticalPosition: 'top' });
    window.setTimeout(() => this.toast.set(''), 2200);
  }
  protected openAction(
    name: string,
    mode: 'approve' | 'reject' | 'delete' | 'cancel-event' | 'delete-event',
    approvalId?: number,
  ): void {
    this.selectedEventActionId.set(null);
    this.selectedName.set(name);
    this.modalMode.set(mode);
    this.selectedApprovalId.set(approvalId ?? null);
    this.actionReason.set('');
    this.showModal.set(true);
  }
  protected confirmAction(): void {
    if (this.actionLoading()) return;
    const eventActionId = this.selectedEventActionId();
    if (eventActionId && this.modalMode() === 'cancel-event') {
      const reason = this.actionReason().trim();
      if (!reason) {
        this.flash('A cancellation reason is required.');
        return;
      }
      this.actionLoading.set(true);
      this.api.cancelEvent(eventActionId, reason).pipe(finalize(() => this.actionLoading.set(false))).subscribe({
        next: (updated) => {
          this.replaceEvent(updated);
          this.showModal.set(false);
          this.selectedEventActionId.set(null);
          this.flash('Event cancelled and affected bookings, seats, parking and QR records were updated.');
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
      return;
    }
    if (eventActionId && this.modalMode() === 'delete-event') {
      this.actionLoading.set(true);
      this.api.deleteEvent(eventActionId).pipe(finalize(() => this.actionLoading.set(false))).subscribe({
        next: () => {
          this.visibleEventRecords = this.visibleEventRecords.filter((event) => event.id !== eventActionId);
          this.refreshEventRows();
          this.showModal.set(false);
          this.selectedEventActionId.set(null);
          this.flash('Unused event deleted.');
          this.go(this.role() === 'admin' ? '/admin/events' : '/organizer/my-events');
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
      return;
    }
    const approvalId = this.selectedApprovalId();
    if (approvalId && this.modalMode() !== 'delete') {
      if (this.modalMode() === 'reject' && !this.actionReason().trim()) {
        this.flash('A rejection reason is required.');
        return;
      }
      const request =
        this.modalMode() === 'approve'
          ? this.api.approve(approvalId)
          : this.api.reject(approvalId, this.actionReason().trim());
      this.actionLoading.set(true);
      request.pipe(finalize(() => this.actionLoading.set(false))).subscribe({
        next: (approval) => {
          this.approvals.update((items) =>
            items.map((item) => (item.id === approval.id ? approval : item)),
          );
          const eventStatus = approval.status === 'Approved' ? 'Approved' : 'Rejected';
          this.visibleEventRecords = this.visibleEventRecords.map((event) =>
            event.id === approval.eventId ? { ...event, status: eventStatus } : event,
          );
          this.refreshEventRows();
          this.showModal.set(false);
          if (approval.status === 'Approved') {
            this.flash(`${this.selectedName()} approved. Review the event and publish it.`);
            this.go(`/admin/events/${approval.eventId}`);
          } else {
            this.flash(`${this.selectedName()} rejected successfully`);
          }
          this.loadData();
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
      return;
    }
    const categoryId = this.selectedCategoryId();
    if (categoryId && this.modalMode() === 'delete') {
      this.actionLoading.set(true);
      this.api
        .deleteCategory(categoryId)
        .pipe(finalize(() => this.actionLoading.set(false)))
        .subscribe({
          next: () => {
            this.categories.update((items) => items.filter((item) => item.id !== categoryId));
            this.showModal.set(false);
            this.flash(`${this.selectedName()} removed successfully`);
          },
          error: (error) => this.flash(apiErrorMessage(error)),
        });
      return;
    }
    this.flash(
      `${this.selectedName()} ${this.modalMode() === 'approve' ? 'approved' : this.modalMode() === 'reject' ? 'rejected' : 'removed'} successfully`,
    );
    this.showModal.set(false);
  }
  protected isActive(path: string): boolean {
    return (
      this.router.url.split('?')[0] === path ||
      (path.endsWith('/dashboard') &&
        (this.router.url === '/admin' || this.router.url === '/organizer'))
    );
  }
  protected seatLabel(index: number): string {
    return `${String.fromCharCode(65 + Math.floor(index / 8))}${(index % 8) + 1}`;
  }
  protected slotLabel(index: number): string {
    return `${String.fromCharCode(65 + Math.floor(index / 12))}${(index % 12) + 1}`;
  }
  protected selectSeat(index: number): void {
    this.selectedSeatIndex.set(this.selectedSeatIndex() === index ? null : index);
  }
  protected selectParking(index: number): void {
    this.selectedParkingIndex.set(this.selectedParkingIndex() === index ? null : index);
  }

  protected nextWizard(): void {
    const paths = [
      '/organizer/events/create/type',
      '/organizer/events/create/details',
      '/organizer/events/create/seats-or-capacity',
      '/organizer/events/create/ticket-pricing',
      '/organizer/events/create/parking',
      '/organizer/events/create/poster-qr',
      '/organizer/events/create/review',
      '/organizer/events/create/submit',
    ];
    const i = Math.min(this.activeWizardStep(), 7);
    this.go(paths[i]);
  }
  protected prevWizard(): void {
    const paths = [
      '/organizer/events/create/type',
      '/organizer/events/create/details',
      '/organizer/events/create/seats-or-capacity',
      '/organizer/events/create/ticket-pricing',
      '/organizer/events/create/parking',
      '/organizer/events/create/poster-qr',
      '/organizer/events/create/review',
      '/organizer/events/create/submit',
    ];
    const i = Math.max(this.activeWizardStep() - 2, 0);
    this.go(paths[i]);
  }

  protected verifyOrganizer(organizer: Organizer): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);
    this.api
      .setOrganizerVerification(organizer.id, !organizer.isVerified)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (updated) => {
          this.organizers.update((items) =>
            items.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.flash(
            updated.isVerified ? 'Organizer verified successfully' : 'Verification removed',
          );
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected submitEventForApproval(eventId: number): void {
    if (this.actionLoading()) return;
    const event = this.eventRows().find((item) => item.backendId === eventId);
    if (event) {
      const issues = this.approvalIssues(event);
      if (issues.length) {
        this.flash(issues[0]);
        return;
      }
    }
    this.actionLoading.set(true);
    this.api
      .submitApproval(eventId)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (approval) => {
          this.approvals.update((items) => [approval, ...items]);
          this.visibleEventRecords = this.visibleEventRecords.map((item) =>
            item.id === eventId ? { ...item, status: 'PendingApproval' } : item,
          );
          this.refreshEventRows();
          this.flash('Event submitted for approval');
          this.loadData();
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected deleteCategory(category: EventCategory): void {
    this.selectedCategoryId.set(category.id);
    this.selectedApprovalId.set(null);
    this.openAction(category.name, 'delete');
    this.selectedCategoryId.set(category.id);
  }

  protected venueCountForProperty(propertyId: number): number {
    return this.venues().filter((venue) => venue.propertyId === propertyId).length;
  }

  protected capacityForProperty(propertyId: number): number {
    return this.venues()
      .filter((venue) => venue.propertyId === propertyId)
      .reduce((total, venue) => total + venue.capacity, 0);
  }

  protected eventCountForOrganizer(organizerId: number): number {
    return this.organizerEvents.filter((event) => event.organizerId === organizerId).length;
  }

  protected eventCountForCategory(categoryId: number): number {
    return this.eventRows().filter((event) => event.categoryId === categoryId).length;
  }

  protected selectedEvent(): EventRow | undefined {
    return this.eventRows().find((event) => event.backendId === this.routeEventId());
  }

  protected selectedEventRecord(): EventRecord | undefined {
    return this.visibleEventRecords.find((event) => event.id === this.routeEventId());
  }

  protected eventVenueLabel(event: EventRecord): string {
    if (event.venueMode === 'ExternalProperty') {
      return [event.externalVenueName, event.externalVenueAddress].filter(Boolean).join(' — ');
    }
    return this.loadedVenues.find((venue) => venue.id === event.venueId)?.name ?? 'Internal venue';
  }

  protected ticketName(ticketTypeId?: number | null): string {
    return this.eventTickets().find((ticket) => ticket.id === ticketTypeId)?.name ?? 'Base price';
  }

  protected approvalIssues(event: EventRow): string[] {
    const issues: string[] = [];
    if (!this.eventTickets().some((ticket) => ticket.isActive && ticket.quantity > 0)) {
      issues.push('Add at least one active ticket type with quantity.');
    }
    if (event.type === 'Seat Based' && !this.eventSeats().some((seat) => seat.isActive)) {
      issues.push('Add at least one active seat for this seat-based event.');
    }
    return issues;
  }

  protected canSubmitForApproval(event: EventRow): boolean {
    return event.status === 'Draft' && this.approvalIssues(event).length === 0;
  }

  private routeEventId(): number | null {
    const parts = this.router.url.split('?')[0].split('/').filter(Boolean);
    const eventIndex = parts.indexOf('events');
    const id = eventIndex >= 0 ? Number(parts[eventIndex + 1]) : NaN;
    return Number.isFinite(id) ? id : null;
  }

  protected selectedProperty(): Property | undefined {
    const parts = this.router.url.split('?')[0].split('/').filter(Boolean);
    const id = Number(parts.at(parts.at(-1) === 'edit' ? -2 : -1));
    return this.properties().find((property) => property.id === id);
  }

  protected createEvent(): void {
    if (this.actionLoading()) return;
    const isEditing = this.view() === 'event-edit';
    const editingId = this.routeEventId();
    if (
      (!isEditing && this.role() === 'admin' && this.eventForm.organizerId === 0) ||
      !this.eventForm.name ||
      (this.eventForm.venueMode === 'OurProperty' && !this.eventForm.venueId) ||
      (this.eventForm.venueMode === 'ExternalProperty' &&
        (!this.eventForm.externalVenueName.trim() || !this.eventForm.externalVenueAddress.trim())) ||
      !this.eventForm.eventCategoryId ||
      !this.eventForm.startDateTime ||
      !this.eventForm.endDateTime
    ) {
      this.flash('Complete all required event fields.');
      return;
    }
    const startsAt = new Date(this.eventForm.startDateTime);
    const endsAt = new Date(this.eventForm.endDateTime);
    if (
      !Number.isFinite(startsAt.getTime()) ||
      !Number.isFinite(endsAt.getTime()) ||
      endsAt <= startsAt
    ) {
      this.flash('The event end time must be after its start time.');
      return;
    }
    const payload = {
      name: this.eventForm.name.trim(),
      description: this.eventForm.description.trim(),
      eventType: this.eventForm.eventType,
      venueMode: this.eventForm.venueMode,
      venueId:
        this.eventForm.venueMode === 'OurProperty' ? Number(this.eventForm.venueId) : null,
      externalVenueName:
        this.eventForm.venueMode === 'ExternalProperty'
          ? this.eventForm.externalVenueName.trim()
          : null,
      externalVenueAddress:
        this.eventForm.venueMode === 'ExternalProperty'
          ? this.eventForm.externalVenueAddress.trim()
          : null,
      eventCategoryId: Number(this.eventForm.eventCategoryId),
      startDateTime: startsAt.toISOString(),
      endDateTime: endsAt.toISOString(),
      ticketPrice: Number(this.eventForm.ticketPrice),
      posterUrl: this.eventForm.posterUrl.trim() || null,
    };
    const request = isEditing && editingId
      ? this.api.updateEvent(editingId, payload)
      : this.role() === 'admin'
        ? this.eventForm.organizerId === -1
          ? this.api.createAdminOwnedEvent(payload)
          : this.api.createEventForOrganizer(Number(this.eventForm.organizerId), payload)
        : this.api.createEvent(payload);
    this.actionLoading.set(true);
    request.pipe(finalize(() => this.actionLoading.set(false))).subscribe({
      next: (saved) => {
        this.visibleEventRecords = isEditing
          ? this.visibleEventRecords.map((event) => (event.id === saved.id ? saved : event))
          : [saved, ...this.visibleEventRecords];
        this.refreshEventRows();
        this.flash(isEditing ? 'Event updated and returned to Draft.' : 'Event created as a draft.');
        this.go(
          isEditing
            ? `/${this.role()}/events/${saved.id}`
            : this.role() === 'admin'
              ? '/admin/events'
              : '/organizer/my-events',
        );
        this.loadData();
      },
      error: (error) => this.flash(apiErrorMessage(error)),
    });
  }

  protected createProperty(): void {
    if (this.actionLoading()) return;
    if (!this.propertyForm.name.trim() || !this.propertyForm.address.trim()) {
      this.flash('Property name and address are required.');
      return;
    }
    this.actionLoading.set(true);
    this.api
      .createProperty(this.propertyForm)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (property) => {
          this.properties.update((items) => [property, ...items]);
          this.propertyForm.name = '';
          this.propertyForm.address = '';
          this.propertyForm.city = '';
          this.propertyForm.description = '';
          this.venueForm.propertyId = property.id;
          this.flash('Property created. Add at least one venue.');
          this.go(`/admin/properties/${property.id}`);
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected createVenue(propertyId = Number(this.venueForm.propertyId)): void {
    if (this.actionLoading()) return;
    if (!propertyId || !this.venueForm.name.trim() || Number(this.venueForm.capacity) < 1) {
      this.flash('Property, venue name and a positive capacity are required.');
      return;
    }
    this.actionLoading.set(true);
    this.api
      .createVenue({
        propertyId,
        name: this.venueForm.name.trim(),
        location: this.venueForm.location.trim() || null,
        capacity: Number(this.venueForm.capacity),
      })
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (venue) => {
          this.venues.update((items) => [...items, venue]);
          this.venueForm.propertyId = propertyId;
          this.venueForm.name = '';
          this.venueForm.location = '';
          this.venueForm.capacity = 1;
          this.flash('Venue created. It is now available in the event form.');
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected createCategory(): void {
    if (this.actionLoading()) return;
    if (!this.categoryForm.name.trim()) {
      this.flash('Category name is required.');
      return;
    }
    this.actionLoading.set(true);
    this.api
      .createCategory(this.categoryForm)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (category) => {
          this.categories.update((items) => [category, ...items]);
          this.categoryForm.name = '';
          this.categoryForm.description = '';
          this.flash('Category created.');
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected toggleUser(user: User): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);
    this.api
      .setUserStatus(user.id, !user.isActive)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (updated) => {
          this.users.update((items) =>
            items.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.flash(`User ${updated.isActive ? 'activated' : 'deactivated'}.`);
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected publish(event: EventRow): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);
    this.api
      .publishEvent(event.backendId)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.flash('Event published.');
          this.loadData();
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected markAllNotificationsRead(): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);
    this.api
      .markAllNotificationsRead()
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.apiNotifications.update((items) => items.map((item) => ({ ...item, isRead: true })));
          this.flash('All notifications marked as read.');
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected addTicket(): void {
    if (this.actionLoading()) return;
    const event = this.selectedEvent();
    if (!event || !this.ticketForm.name.trim() || this.ticketForm.quantity < 1) {
      this.flash('Ticket name and a positive quantity are required.');
      return;
    }
    this.actionLoading.set(true);
    this.api
      .createTicket(event.backendId, {
        name: this.ticketForm.name.trim(),
        description: this.ticketForm.description.trim() || null,
        price: Number(this.ticketForm.price),
        quantity: Number(this.ticketForm.quantity),
      })
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (ticket) => {
          this.eventTickets.update((items) => [...items, ticket]);
          this.ticketForm.name = '';
          this.ticketForm.description = '';
          this.flash('Ticket type added.');
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected deleteTicketRecord(ticket: TicketType): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);
    this.api.deleteTicket(ticket.id).pipe(finalize(() => this.actionLoading.set(false))).subscribe({
      next: () => {
        this.eventTickets.update((items) => items.filter((item) => item.id !== ticket.id));
        this.flash('Unused ticket type deleted.');
      },
      error: (error) => this.flash(apiErrorMessage(error)),
    });
  }

  protected addSeat(): void {
    if (this.actionLoading()) return;
    const event = this.selectedEvent();
    if (!event || !this.seatForm.seatNumber.trim()) {
      this.flash('Seat number is required.');
      return;
    }
    this.actionLoading.set(true);
    this.api
      .createSeat(event.backendId, {
        ticketTypeId: this.seatForm.ticketTypeId || null,
        seatNumber: this.seatForm.seatNumber.trim(),
        rowLabel: this.seatForm.rowLabel.trim() || null,
        columnNumber: Number(this.seatForm.columnNumber),
        priceOverride: this.seatForm.priceOverride,
      })
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (seat) => {
          this.eventSeats.update((items) => [...items, seat]);
          this.seatForm.seatNumber = '';
          this.flash('Seat added.');
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected addBulkSeats(): void {
    if (this.actionLoading()) return;
    const event = this.selectedEvent();
    const rowCount = Number(this.bulkSeatForm.rowCount);
    const seatsPerRow = Number(this.bulkSeatForm.seatsPerRow);
    const startNumber = Number(this.bulkSeatForm.startNumber);
    const startRow = this.bulkSeatForm.startRow.trim().toUpperCase().charAt(0);
    const total = rowCount * seatsPerRow;

    if (!event || !startRow || rowCount < 1 || seatsPerRow < 1 || startNumber < 1 || total > 500) {
      this.flash('Enter a valid layout of up to 500 seats per bulk action.');
      return;
    }

    const firstRowCode = startRow.charCodeAt(0);
    const seats = Array.from({ length: rowCount }, (_, rowIndex) => {
      const rowLabel = String.fromCharCode(firstRowCode + rowIndex);
      return Array.from({ length: seatsPerRow }, (_, seatIndex) => ({
        ticketTypeId: this.bulkSeatForm.ticketTypeId || null,
        seatNumber: `${rowLabel}${startNumber + seatIndex}`,
        rowLabel,
        columnNumber: startNumber + seatIndex,
        priceOverride: this.bulkSeatForm.priceOverride,
      }));
    }).flat();

    this.actionLoading.set(true);
    this.api
      .createSeats(event.backendId, seats)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (created) => {
          this.eventSeats.update((items) => [...items, ...created]);
          this.flash(`${created.length} seats created and mapped successfully.`);
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected deleteSeatRecord(seat: Seat): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);
    this.api.deleteSeat(seat.id).pipe(finalize(() => this.actionLoading.set(false))).subscribe({
      next: () => {
        this.eventSeats.update((items) => items.filter((item) => item.id !== seat.id));
        this.flash('Unused seat deleted.');
      },
      error: (error) => this.flash(apiErrorMessage(error)),
    });
  }

  protected regenerateEventQr(): void {
    const eventId = this.routeEventId();
    if (!eventId || this.actionLoading()) return;
    this.actionLoading.set(true);
    this.api
      .regenerateEventQr(eventId)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (updated) => {
          this.replaceEvent(updated);
          this.flash('Event QR regenerated.');
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected copyEventQr(): void {
    const qr = this.selectedEventRecord()?.eventQrCode;
    if (!qr) return;
    void navigator.clipboard.writeText(qr).then(
      () => this.flash('Event QR token copied.'),
      () => this.flash('Copy failed. Select the token manually.'),
    );
  }

  protected cancelEvent(event: EventRow): void {
    this.openAction(event.title, 'cancel-event');
    this.selectedEventActionId.set(event.backendId);
  }

  protected reportTicketsSold(report: EventReport): number {
    return report.tickets.reduce((total, ticket) => total + ticket.soldQuantity, 0);
  }

  protected deleteEvent(event: EventRow): void {
    this.openAction(event.title, 'delete-event');
    this.selectedEventActionId.set(event.backendId);
  }

  protected addParkingAllocation(): void {
    if (this.actionLoading()) return;
    const event = this.selectedEvent();
    if (!event || !this.parkingForm.parkingAreaId || this.parkingForm.allocatedSlotCount < 1) {
      this.flash('Select a parking area and slot count.');
      return;
    }
    this.actionLoading.set(true);
    this.api
      .allocateParking(event.backendId, {
        parkingAreaId: Number(this.parkingForm.parkingAreaId),
        allocatedSlotCount: Number(this.parkingForm.allocatedSlotCount),
        parkingFee: Number(this.parkingForm.parkingFee),
      })
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.flash('Parking allocation added.');
          this.loadRouteEntity(this.router.url);
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected deleteParkingAllocation(allocationId: number): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);
    this.api.deleteParkingAllocation(allocationId)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.flash('Unused parking allocation removed.');
          this.loadRouteEntity(this.router.url);
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected toggleParkingArea(area: ParkingArea): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);
    this.api.updateParkingArea(area.id, { ...area, isActive: !area.isActive })
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (updated) => {
          this.parkingAreas.update((items) => items.map((item) => item.id === updated.id ? updated : item));
          this.flash(`Parking area ${updated.isActive ? 'activated' : 'deactivated'}.`);
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected createParkingArea(): void {
    if (this.actionLoading()) return;
    if (!this.parkingAreaForm.venueId || !this.parkingAreaForm.name.trim() || this.parkingAreaForm.capacity < 1) {
      this.flash('Venue, parking area name and positive capacity are required.');
      return;
    }
    this.actionLoading.set(true);
    this.api.createParkingArea({
      venueId: Number(this.parkingAreaForm.venueId),
      name: this.parkingAreaForm.name.trim(),
      description: this.parkingAreaForm.description.trim() || null,
      capacity: Number(this.parkingAreaForm.capacity),
    }).pipe(finalize(() => this.actionLoading.set(false))).subscribe({
      next: (area) => {
        this.parkingAreas.update((items) => [...items, area]);
        this.parkingAreaForm.name = '';
        this.parkingAreaForm.description = '';
        this.selectParkingArea(area.id);
        this.flash('Parking area created. Generate its zones and slots next.');
      },
      error: (error) => this.flash(apiErrorMessage(error)),
    });
  }

 protected selectParkingArea(areaId: number): void {
  const id = Number(areaId);

  if (!id) {
    return;
  }

  this.selectedParkingAreaId.set(id);
  this.parkingAreaSlots.set([]);
  this.actionLoading.set(true);

  this.api.parkingSlots(id)
    .pipe(
      finalize(() => this.actionLoading.set(false))
    )
    .subscribe({
      next: (slots) => {
        this.parkingAreaSlots.set(slots);

        setTimeout(() => {
          document
            .getElementById('parking-slot-manager')
            ?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
        }, 100);
      },

      error: (error) => {
        this.flash(apiErrorMessage(error));
      },
    });
}

  protected bulkCreateParkingSlots(): void {
    const areaId = this.selectedParkingAreaId();
    const total = Number(this.bulkParkingForm.zoneCount) * Number(this.bulkParkingForm.slotsPerZone);
    if (!areaId || total < 1 || total > 500) {
      this.flash('Select a parking area and generate between 1 and 500 slots.');
      return;
    }
    this.actionLoading.set(true);
    this.api.createParkingSlotsBulk(areaId, {
      startingZone: this.bulkParkingForm.startingZone.trim().toUpperCase(),
      zoneCount: Number(this.bulkParkingForm.zoneCount),
      slotsPerZone: Number(this.bulkParkingForm.slotsPerZone),
      startingNumber: Number(this.bulkParkingForm.startingNumber),
      slotType: this.bulkParkingForm.slotType,
    }).pipe(finalize(() => this.actionLoading.set(false))).subscribe({
      next: (created) => {
        this.parkingAreaSlots.update((items) => [...items, ...created]);
        this.flash(`${created.length} parking slots generated from live backend records.`);
      },
      error: (error) => this.flash(apiErrorMessage(error)),
    });
  }

  protected chooseAdminReportOrganizer(organizerId: number): void {
    this.adminReportOrganizerId.set(Number(organizerId));
    this.adminReportEventId.set(0);
    this.generatedAdminEventReport.set(null);
  }

  protected generateAdminEventReport(): void {
    const organizerId = this.adminReportOrganizerId();
    const eventId = this.adminReportEventId();
    if (!organizerId || !eventId) {
      this.flash('Select an organizer and one of their events.');
      return;
    }
    this.actionLoading.set(true);
    this.api.adminOrganizerEventReport(organizerId, eventId)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (report) => {
          this.generatedAdminEventReport.set(report);
          this.flash('Live event report generated.');
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected sendAdminEventReport(): void {
    const organizerId = this.adminReportOrganizerId();
    const eventId = this.adminReportEventId();
    if (!organizerId || !eventId || this.actionLoading()) return;
    this.actionLoading.set(true);
    this.api.sendAdminOrganizerEventReport(organizerId, eventId)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (report) => {
          this.generatedAdminEventReport.set(report);
          this.flash('Report emailed and in-app notification created.');
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
  }

  protected async downloadEventReport(report = this.generatedAdminEventReport() ?? this.eventReport()): Promise<void> {
    if (!report) {
      this.flash('Generate an event report first.');
      return;
    }
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFillColor(26, 92, 62);
    doc.rect(0, 0, 210, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('EVENTORA EVENT REPORT', 16, 22);
    doc.setTextColor(25, 35, 30);
    doc.setFontSize(16);
    doc.text(report.eventName, 16, 49);
    doc.setFontSize(10);
    const lines = [
      `Organizer: ${report.organizerName || 'Admin-owned'} (${report.organizerEmail || 'n/a'})`,
      `Status: ${report.eventStatus}`,
      `Schedule: ${new Date(report.startDateTime).toLocaleString()} - ${new Date(report.endDateTime).toLocaleString()}`,
      `Venue: ${report.venue}`,
      `Bookings: ${report.totalBookings} total, ${report.confirmedBookings} confirmed, ${report.cancelledBookings} cancelled`,
      `Customers: ${report.customerCount}`,
      `Seats: ${report.seatsBooked} booked / ${report.seatCapacity} capacity`,
      `Parking: ${report.parkingBooked} booked / ${report.parkingCapacity} capacity / ${report.parkingAvailable} available`,
      `Ticket revenue: LKR ${report.ticketRevenue.toLocaleString()}`,
      `Parking revenue: LKR ${report.parkingRevenue.toLocaleString()}`,
      `Total revenue: LKR ${report.totalRevenue.toLocaleString()}`,
      `Refunds: LKR ${report.refunds.toLocaleString()}`,
      '',
      'Ticket breakdown:',
      ...report.tickets.map((ticket) => `• ${ticket.ticketType}: ${ticket.soldQuantity}/${ticket.configuredQuantity} sold — LKR ${ticket.revenue.toLocaleString()}`),
      '',
      `Generated from live database data: ${new Date(report.generatedAtUtc).toLocaleString()}`,
    ];
    doc.text(lines, 16, 60, { maxWidth: 178, lineHeightFactor: 1.55 });
    doc.save(`event-report-${report.eventId}.pdf`);
    this.flash('Event report PDF downloaded.');
  }

  private loadData(): void {
    this.loading.set(true);
    forkJoin({
      events: this.api.events(),
      venues: this.api.venues(),
      categories: this.api.categories(this.role() === 'admin'),
    }).subscribe({
      next: ({ events, venues, categories }) => {
        this.venues.set(venues);
        this.categories.set(categories);
        const organizerId = this.auth.session()?.organizerId;
        const visibleEvents =
          this.role() === 'organizer'
            ? organizerId
              ? events.filter((event) => event.organizerId === organizerId)
              : []
            : events;
        this.visibleEventRecords = visibleEvents;
        this.loadedVenues = venues;
        this.refreshEventRows();
        if (this.role() === 'organizer') {
          const requests = visibleEvents.map((event) =>
            this.api.eventBookings(event.id).pipe(catchError(() => of([] as Booking[]))),
          );
          if (requests.length)
            forkJoin(requests).subscribe({
              next: (groups) => {
                this.bookings.set(groups.flat());
                this.refreshEventRows();
              },
              error: (error) => this.apiError.set(apiErrorMessage(error)),
            });
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.apiError.set(apiErrorMessage(error));
      },
    });

    if (this.role() === 'admin') {
      forkJoin({
        dashboard: this.api.adminDashboard(),
        properties: this.api.properties(),
        organizers: this.api.organizers(),
        approvals: this.api.pendingApprovals(),
        users: this.api.users(),
        parkingAreas: this.api.parkingAreas(),
        report: this.api.adminReport(),
        bookings: this.api.allBookings(),
        payments: this.api.allPayments(),
        notifications: this.api.notifications(),
      }).subscribe({
        next: (data) => {
          this.adminDashboard.set(data.dashboard);
          this.properties.set(data.properties);
          this.organizers.set(data.organizers);
          this.approvals.set(data.approvals);
          this.users.set(data.users);
          this.parkingAreas.set(data.parkingAreas);
          this.adminReport.set(data.report);
          this.bookings.set(data.bookings);
          this.payments.set(data.payments);
          this.apiNotifications.set(data.notifications);
          this.refreshEventRows();
        },
        error: (error) => this.apiError.set(apiErrorMessage(error)),
      });
    } else {
      forkJoin({
        dashboard: this.api.organizerDashboard(),
        sales: this.api.organizerTicketSales(),
        profile: this.api.organizerProfile(),
        notifications: this.api.notifications(),
        approvals: this.api.myApprovals(),
      }).subscribe({
        next: ({ dashboard, sales, profile, notifications, approvals }) => {
          this.organizerDashboard.set(dashboard);
          this.ticketSales.set(sales);
          this.organizerProfile.set(profile);
          this.apiNotifications.set(notifications);
          this.approvals.set(approvals);
          this.refreshEventRows();
        },
        error: (error) => this.apiError.set(apiErrorMessage(error)),
      });
    }
  }

  private loadRouteEntity(url: string): void {
    const clean = url.split('?')[0];
    const parts = clean.split('/').filter(Boolean);
    const eventIndex = parts.indexOf('events');
    const eventId = eventIndex >= 0 ? Number(parts[eventIndex + 1]) : NaN;
    if (!Number.isFinite(eventId)) return;
    this.api.event(eventId).pipe(
      switchMap((event) =>
        forkJoin({
          event: of(event),
          tickets: this.api.tickets(eventId),
          seats: this.api.seats(eventId),
          parking: this.api.eventParkingLayout(eventId),
          parkingAreas: event.venueId ? this.api.parkingAreas(event.venueId) : of([] as ParkingArea[]),
      report:
            this.role() === 'organizer'
              ? this.api.organizerEventReport(eventId).pipe(catchError(() => of(null)))
              : of(null),
        }),
      ),
    ).subscribe({
      next: ({ event, tickets, seats, parking, parkingAreas, report }) => {
        this.replaceEvent(event);
        this.eventTickets.set(tickets);
        this.eventSeats.set(seats);
        this.eventParking.set(parking);
        this.parkingAreas.set(parkingAreas);
        this.eventReport.set(report);
        if (this.view() === 'event-edit') this.populateEventForm(event);
      },
      error: (error) => this.apiError.set(apiErrorMessage(error)),
    });
  }

  private toEventRow(event: EventRecord, venues: Venue[], index: number): EventRow {
    const start = new Date(event.startDateTime);
    const sales = this.ticketSales()?.events.find((item) => item.eventId === event.id);
    const eventBookings = this.bookings().filter((booking) => booking.eventId === event.id);
    const bookingIds = new Set(eventBookings.map((booking) => booking.id));
    const eventRevenue = this.payments()
      .filter(
        (payment) =>
          bookingIds.has(payment.bookingId) &&
          ['completed', 'paid', 'succeeded', 'successful'].includes(payment.status.toLowerCase()),
      )
      .reduce((total, payment) => total + payment.amount, 0);
    const status: RowStatus =
      event.status === 'Published'
        ? 'Published'
        : event.status === 'Approved'
          ? 'Approved'
          : event.status === 'PendingApproval'
            ? 'Pending'
            : event.status === 'Rejected'
              ? 'Rejected'
              : event.status === 'Cancelled'
                ? 'Cancelled'
                : 'Draft';
    const images = [
      '/assets/concert-hero.webp',
      '/assets/event-grid.webp',
      '/assets/eventora-event-sprite.png',
    ];
    return {
      id: String(event.id),
      backendId: event.id,
      organizerId: event.organizerId ?? null,
      categoryId: event.eventCategoryId,
      title: event.name,
      venue:
        event.venueMode === 'ExternalProperty'
          ? event.externalVenueName || 'External venue'
          : venues.find((venue) => venue.id === event.venueId)?.name ?? `Venue #${event.venueId}`,
      date: start.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }),
      type: event.eventType === 'SeatBased' ? 'Seat Based' : 'Non-Seat Based',
      status,
      bookings: sales?.confirmedBookings ?? eventBookings.length,
      revenue: `LKR ${(sales?.ticketRevenue ?? eventRevenue).toLocaleString()}`,
      image: event.posterUrl || images[index % images.length],
    };
  }

  private refreshEventRows(): void {
    this.eventRows.set(
      this.visibleEventRecords.map((event, index) =>
        this.toEventRow(event, this.loadedVenues, index),
      ),
    );
  }

  private replaceEvent(updated: EventRecord): void {
    const exists = this.visibleEventRecords.some((event) => event.id === updated.id);
    this.visibleEventRecords = exists
      ? this.visibleEventRecords.map((event) => (event.id === updated.id ? updated : event))
      : [updated, ...this.visibleEventRecords];
    this.refreshEventRows();
  }

  private populateEventForm(event: EventRecord): void {
    this.eventForm.name = event.name;
    this.eventForm.description = event.description;
    this.eventForm.eventType = event.eventType;
    this.eventForm.venueMode =
      event.venueMode === 'ExternalProperty' ? 'ExternalProperty' : 'OurProperty';
    this.eventForm.venueId = event.venueId ?? 0;
    this.eventForm.externalVenueName = event.externalVenueName ?? '';
    this.eventForm.externalVenueAddress = event.externalVenueAddress ?? '';
    this.eventForm.eventCategoryId = event.eventCategoryId;
    this.eventForm.startDateTime = this.toLocalDateTime(event.startDateTime);
    this.eventForm.endDateTime = this.toLocalDateTime(event.endDateTime);
    this.eventForm.ticketPrice = event.ticketPrice;
    this.eventForm.posterUrl = event.posterUrl ?? '';
  }

  private toLocalDateTime(value: string): string {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }
}
