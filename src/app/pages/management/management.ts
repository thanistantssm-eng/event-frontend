import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, forkJoin } from 'rxjs';
import { ApiService, apiErrorMessage } from '../../core/api.service';
import {
  AdminDashboard,
  AdminReport,
  Approval,
  EventCategory,
  EventRecord,
  Organizer,
  OrganizerDashboard,
  OrganizerTicketSales,
  ParkingArea,
  Property,
  User,
  Venue,
} from '../../core/api.models';

type Role = 'organizer' | 'admin';
type RowStatus =
  'Approved' | 'Pending' | 'Draft' | 'Rejected' | 'Confirmed' | 'Paid' | 'Active' | 'Inactive';

type EventRow = {
  id: string;
  backendId: number;
  organizerId: number;
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
  imports: [CommonModule, FormsModule, RouterLink],
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
  protected readonly modalMode = signal<'approve' | 'reject' | 'delete'>('approve');
  protected readonly selectedName = signal('');
  protected readonly selectedSeatIndex = signal<number | null>(null);
  protected readonly selectedParkingIndex = signal<number | null>(null);
  protected readonly selectedWizardType = signal<'seat' | 'general'>('seat');
  protected readonly setupMode = signal<'seat' | 'general'>('seat');
  protected readonly notificationTab = signal('All');
  protected readonly settingsSection = signal('General');
  protected readonly loading = signal(false);
  protected readonly apiError = signal('');
  protected readonly properties = signal<Property[]>([]);
  protected readonly venues = signal<Venue[]>([]);
  protected readonly organizers = signal<Organizer[]>([]);
  protected readonly approvals = signal<Approval[]>([]);
  protected readonly categories = signal<EventCategory[]>([]);
  protected readonly users = signal<User[]>([]);
  protected readonly parkingAreas = signal<ParkingArea[]>([]);
  protected readonly adminDashboard = signal<AdminDashboard | null>(null);
  protected readonly organizerDashboard = signal<OrganizerDashboard | null>(null);
  protected readonly adminReport = signal<AdminReport | null>(null);
  protected readonly ticketSales = signal<OrganizerTicketSales | null>(null);
  protected readonly selectedApprovalId = signal<number | null>(null);
  protected readonly selectedCategoryId = signal<number | null>(null);

  private readonly eventRows = signal<EventRow[]>([]);
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

  protected readonly adminNav = [
    ['Dashboard', '/admin/dashboard', '⌂'],
    ['Properties', '/admin/properties', '▥'],
    ['Organizers', '/admin/organizers', '♙'],
    ['Events', '/admin/events', '▣'],
    ['Approvals', '/admin/approvals', '✓'],
    ['Bookings', '/admin/bookings', '◆'],
    ['Payments', '/admin/payments', '▤'],
    ['Parking', '/admin/parking', 'Ⓟ'],
    ['Reports', '/admin/reports', '▥'],
    ['Categories', '/admin/categories', '◈'],
    ['Notifications', '/admin/notifications', '♢'],
    ['Settings', '/admin/settings', '⚙'],
  ];
  protected readonly organizerNav = [
    ['Dashboard', '/organizer/dashboard', '⌂'],
    ['My Events', '/organizer/my-events', '▣'],
    ['Create Event', '/organizer/events/create/type', '＋'],
    ['Approvals', '/organizer/approvals', '✓'],
    ['Bookings', '/organizer/events/summer/bookings', '◆'],
    ['Reports', '/organizer/reports', '▥'],
    ['Notifications', '/organizer/notifications', '♢'],
    ['Profile', '/organizer/profile', '♙'],
    ['Settings', '/organizer/settings', '⚙'],
  ];

  constructor(
    protected readonly router: Router,
    private readonly api: ApiService,
  ) {
    this.sync(this.router.url);
    this.loadData();
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
      else if (clean === 'organizer/notifications') this.view.set('notifications');
      else if (clean === 'organizer/reports') this.view.set('reports');
      else if (clean === 'organizer/profile') this.view.set('profile');
      else if (clean === 'organizer/settings') this.view.set('settings');
      else if (parts[1] === 'events' && parts.length >= 3) this.view.set('event-detail');
      else this.view.set('dashboard');
    } else {
      if (clean === 'admin' || clean === 'admin/dashboard') this.view.set('dashboard');
      else if (clean === 'admin/properties') this.view.set('properties');
      else if (clean === 'admin/properties/create') this.view.set('property-form');
      else if (clean.endsWith('/edit') && clean.startsWith('admin/properties/'))
        this.view.set('property-form');
      else if (/^admin\/properties\/[^/]+$/.test(clean)) this.view.set('property-detail');
      else if (clean === 'admin/organizers') this.view.set('organizers');
      else if (/^admin\/organizers\/[^/]+$/.test(clean)) this.view.set('organizer-detail');
      else if (clean === 'admin/events') this.view.set('events');
      else if (clean === 'admin/events/create') this.view.set('admin-event-form');
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
  protected goToNotifications(): void {
    this.go(this.role() === 'admin' ? '/admin/notifications' : '/organizer/notifications');
  }
  protected goToAccount(): void {
    this.go(this.role() === 'admin' ? '/admin/settings' : '/organizer/profile');
  }
  protected flash(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => this.toast.set(''), 2200);
  }
  protected openAction(
    name: string,
    mode: 'approve' | 'reject' | 'delete',
    approvalId?: number,
  ): void {
    this.selectedName.set(name);
    this.modalMode.set(mode);
    this.selectedApprovalId.set(approvalId ?? null);
    this.showModal.set(true);
  }
  protected confirmAction(): void {
    const approvalId = this.selectedApprovalId();
    if (approvalId && this.modalMode() !== 'delete') {
      const request = this.modalMode() === 'approve'
        ? this.api.approve(approvalId)
        : this.api.reject(approvalId, 'Rejected by administrator');
      request.subscribe({
        next: (approval) => {
          this.approvals.update((items) =>
            items.map((item) => (item.id === approval.id ? approval : item)),
          );
          this.flash(`${this.selectedName()} ${approval.status.toLowerCase()} successfully`);
          this.showModal.set(false);
        },
        error: (error) => this.flash(apiErrorMessage(error)),
      });
      return;
    }
    const categoryId = this.selectedCategoryId();
    if (categoryId && this.modalMode() === 'delete') {
      this.api.deleteCategory(categoryId).subscribe({
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
    this.api.setOrganizerVerification(organizer.id, !organizer.isVerified).subscribe({
      next: (updated) => {
        this.organizers.update((items) =>
          items.map((item) => (item.id === updated.id ? updated : item)),
        );
        this.flash(updated.isVerified ? 'Organizer verified successfully' : 'Verification removed');
      },
      error: (error) => this.flash(apiErrorMessage(error)),
    });
  }

  protected submitEventForApproval(eventId: number): void {
    this.api.submitApproval(eventId).subscribe({
      next: (approval) => {
        this.approvals.update((items) => [approval, ...items]);
        this.flash('Event submitted for approval');
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

  private loadData(): void {
    this.loading.set(true);
    forkJoin({ events: this.api.events(), venues: this.api.venues() }).subscribe({
      next: ({ events, venues }) => {
        this.venues.set(venues);
        this.eventRows.set(events.map((event, index) => this.toEventRow(event, venues, index)));
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
        categories: this.api.categories(true),
        users: this.api.users(),
        parkingAreas: this.api.parkingAreas(),
        report: this.api.adminReport(),
      }).subscribe({
        next: (data) => {
          this.adminDashboard.set(data.dashboard);
          this.properties.set(data.properties);
          this.organizers.set(data.organizers);
          this.approvals.set(data.approvals);
          this.categories.set(data.categories);
          this.users.set(data.users);
          this.parkingAreas.set(data.parkingAreas);
          this.adminReport.set(data.report);
        },
        error: (error) => this.apiError.set(apiErrorMessage(error)),
      });
    } else {
      forkJoin({
        dashboard: this.api.organizerDashboard(),
        sales: this.api.organizerTicketSales(),
      }).subscribe({
        next: ({ dashboard, sales }) => {
          this.organizerDashboard.set(dashboard);
          this.ticketSales.set(sales);
        },
        error: (error) => this.apiError.set(apiErrorMessage(error)),
      });
    }
  }

  private loadRouteEntity(_url: string): void {
    // List data is shared between the role pages; detail endpoints are exposed by ApiService.
  }

  private toEventRow(event: EventRecord, venues: Venue[], index: number): EventRow {
    const start = new Date(event.startDateTime);
    const sales = this.ticketSales()?.events.find((item) => item.eventId === event.id);
    const status: RowStatus =
      event.status === 'Published' || event.status === 'Approved'
        ? 'Approved'
        : event.status === 'PendingApproval'
          ? 'Pending'
          : event.status === 'Rejected'
            ? 'Rejected'
            : 'Draft';
    const images = [
      '/assets/concert-hero.webp',
      '/assets/event-grid.webp',
      '/assets/eventora-event-sprite.png',
    ];
    return {
      id: String(event.id),
      backendId: event.id,
      organizerId: event.organizerId,
      categoryId: event.eventCategoryId,
      title: event.name,
      venue: venues.find((venue) => venue.id === event.venueId)?.name ?? `Venue #${event.venueId}`,
      date: start.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }),
      type: event.eventType === 'SeatBased' ? 'Seat Based' : 'Non-Seat Based',
      status,
      bookings: sales?.confirmedBookings ?? 0,
      revenue: `LKR ${(sales?.ticketRevenue ?? 0).toLocaleString()}`,
      image: event.posterUrl || images[index % images.length],
    };
  }
}
