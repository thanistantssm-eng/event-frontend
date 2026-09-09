import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EventRecord, ParkingSlot, TicketType, Venue } from '../../core/api.models';
import { ApiService, apiErrorMessage } from '../../core/api.service';
import { UiState } from '../../shared/ui-state/ui-state';

type PublicEvent = {
  id: number;
  name: string;
  category: string;
  date: string;
  dateTime: string;
  venue: string;
  venueLocation: string;
  price: number;
  image: string;
  type: string;
  description: string;
};

@Component({
  selector: 'app-public-pages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, UiState],
  templateUrl: './public-pages.html',
  styleUrl: './public-pages.css',
})
export class PublicPages {
  protected readonly view: string;
  protected readonly query = signal('');
  protected readonly category = signal('All Categories');
  protected readonly venueFilter = signal('All Locations');
  protected readonly sortAscending = signal(false);
  protected readonly loading = signal(true);
  protected readonly detailLoading = signal(false);
  protected readonly loadError = signal('');
  protected readonly publicEvents = signal<PublicEvent[]>([]);
  protected readonly venues = signal<string[]>([]);
  protected readonly ticketTypes = signal<TicketType[]>([]);
  protected readonly parkingSlots = signal<ParkingSlot[]>([]);
  protected readonly currentEvent = signal<PublicEvent | null>(null);
  protected readonly categories = computed(() => [
    'All Categories',
    ...new Set(this.publicEvents().map((event) => event.category)),
  ]);
  protected readonly filteredEvents = computed(() => {
    const q = this.query().trim().toLowerCase();
    const category = this.category();
    const venue = this.venueFilter();
    const rows = this.publicEvents().filter(
      (event) =>
        (!q || `${event.name} ${event.venue} ${event.category}`.toLowerCase().includes(q)) &&
        (category === 'All Categories' || event.category === category) &&
        (venue === 'All Locations' || event.venue === venue),
    );
    return this.sortAscending() ? [...rows].sort((a, b) => a.name.localeCompare(b.name)) : rows;
  });
  protected readonly faqs = [
    ['How do I book an event?', 'Sign in as a customer, choose a published event and follow the ticket, seat, optional parking and payment steps.'],
    ['Is parking mandatory?', 'No. Parking is optional and appears only when the organizer has allocated active slots for the event.'],
    ['Can I cancel a booking?', 'Yes. Open My Bookings and cancel an eligible booking. Its reserved seat and parking slot are released.'],
    ['Where can I find my QR ticket?', 'The booking QR is available after payment has been completed successfully.'],
  ];
  protected readonly openFaq = signal(0);

  constructor(protected readonly router: Router, private readonly api: ApiService) {
    const clean = router.url.split('?')[0];
    if (clean === '/events') this.view = 'events';
    else if (clean.startsWith('/events/')) this.view = 'event-detail';
    else if (clean === '/how-it-works') this.view = 'how';
    else if (clean === '/parking') this.view = 'parking';
    else if (clean === '/contact') this.view = 'contact';
    else if (clean === '/faq') this.view = 'faq';
    else this.view = 'about';
    this.loadEvents(clean);
  }

  protected go(path: string): void { void this.router.navigateByUrl(path); }
  protected searchEvents(): void { document.querySelector('.public-events')?.scrollIntoView({ behavior: 'smooth' }); }
  protected toggleSort(): void { this.sortAscending.update((value) => !value); }
  protected retry(): void { this.loadEvents(this.router.url.split('?')[0]); }

  private loadEvents(path: string): void {
    this.loading.set(true);
    this.loadError.set('');
    forkJoin({ events: this.api.events({ status: 'Published' }), venues: this.api.venues() }).subscribe({
      next: ({ events, venues }) => {
        const mapped = events.map((event) => this.toPublicEvent(event, venues));
        this.publicEvents.set(mapped);
        this.venues.set([...new Set(mapped.map((event) => event.venue))]);
        const requestedId = Number(path.split('/').at(-1));
        const selected = Number.isFinite(requestedId) ? mapped.find((event) => event.id === requestedId) ?? null : null;
        this.currentEvent.set(selected);
        this.loading.set(false);
        if (this.view === 'event-detail' && selected) this.loadDetail(selected.id);
      },
      error: (error) => {
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  private loadDetail(eventId: number): void {
    this.detailLoading.set(true);
    forkJoin({ tickets: this.api.tickets(eventId), parking: this.api.eventParkingSlots(eventId) }).subscribe({
      next: ({ tickets, parking }) => {
        this.ticketTypes.set(tickets.filter((item) => item.isActive));
        this.parkingSlots.set(parking.filter((item) => item.isActive && item.status === 'Available'));
        this.detailLoading.set(false);
      },
      error: (error) => {
        this.loadError.set(apiErrorMessage(error));
        this.detailLoading.set(false);
      },
    });
  }

  private toPublicEvent(event: EventRecord, venues: Venue[]): PublicEvent {
    const start = new Date(event.startDateTime);
    const venue = venues.find((item) => item.id === event.venueId);
    return {
      id: event.id,
      name: event.name,
      category: event.eventCategoryName || 'Uncategorised',
      date: start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase(),
      dateTime: start.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }),
      venue: venue?.name ?? `Venue #${event.venueId}`,
      venueLocation: venue?.location || venue?.propertyName || '',
      price: event.ticketPrice,
      image: event.posterUrl || '/assets/concert-hero.webp',
      type: event.eventType === 'SeatBased' ? 'Seat Based' : 'General Entry',
      description: event.description,
    };
  }
}
