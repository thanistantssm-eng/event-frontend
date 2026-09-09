import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EventRecord, Venue } from '../../core/api.models';
import { ApiService, apiErrorMessage } from '../../core/api.service';

type PublicEvent = {
  id: string;
  n: string;
  cat: string;
  date: string;
  fullDate: string;
  v: string;
  p: string;
  img: string;
  type: string;
  description?: string;
};

const fallbackEvent: PublicEvent = {
  id: '0',
  n: 'Events are loading',
  cat: 'Event',
  date: 'SOON',
  fullDate: 'Date to be announced',
  v: 'Venue to be announced',
  p: '—',
  img: '/assets/concert-hero.webp',
  type: 'General Entry',
};

@Component({
  selector: 'app-public-pages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './public-pages.html',
  styleUrl: './public-pages.css',
})
export class PublicPages {
  protected readonly view: string;
  protected readonly query = signal('');
  protected readonly category = signal('All Categories');
  protected readonly sortAscending = signal(false);
  protected readonly favoriteIds = signal(new Set<string>());
  protected readonly selectedParking = signal('B27');
  protected readonly contactMessage = signal('');
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly publicEvents = signal<PublicEvent[]>([]);
  protected currentEvent: PublicEvent = fallbackEvent;
  protected readonly filteredEvents = computed(() => {
    const q = this.query().trim().toLowerCase();
    const category = this.category();
    const rows = this.publicEvents().filter(
      (event) =>
        (!q || `${event.n} ${event.v} ${event.cat}`.toLowerCase().includes(q)) &&
        (category === 'All Categories' || event.cat === category),
    );
    return this.sortAscending() ? [...rows].sort((a, b) => a.n.localeCompare(b.n)) : rows;
  });
  protected readonly faqs = [
    [
      'How do I book an event?',
      'Choose an event, select tickets and seats when applicable, optionally add parking, then complete payment.',
    ],
    [
      'Is parking mandatory?',
      'No. Event parking is optional and you can complete your ticket booking without a parking slot.',
    ],
    [
      'Can I cancel a booking?',
      'Yes. Open My Bookings, choose the booking and use Cancel Booking. Seats and parking are released after cancellation.',
    ],
    [
      'Where can I find my QR ticket?',
      'Your QR is available on the booking confirmation and ticket detail screens after payment is completed.',
    ],
  ];
  protected readonly openFaq = signal(0);

  constructor(
    protected readonly router: Router,
    private readonly api: ApiService,
  ) {
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

  protected go(path: string): void {
    void this.router.navigateByUrl(path);
  }
  protected toggleFavorite(id: string): void {
    const next = new Set(this.favoriteIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.favoriteIds.set(next);
  }
  protected searchEvents(): void {
    document.querySelector('.public-events')?.scrollIntoView({ behavior: 'smooth' });
  }
  protected toggleSort(): void {
    this.sortAscending.update((value) => !value);
  }
  protected chooseParking(slot: string): void {
    this.selectedParking.set(slot);
  }
  protected sendMessage(): void {
    this.contactMessage.set('Thanks — your message has been sent. We’ll reply shortly.');
  }

  private loadEvents(path: string): void {
    forkJoin({ events: this.api.events({ status: 'Published' }), venues: this.api.venues() }).subscribe({
      next: ({ events, venues }) => {
        const mapped = events.map((event, index) => this.toPublicEvent(event, venues, index));
        this.publicEvents.set(mapped);
        const id = path.split('/').at(-1);
        this.currentEvent = mapped.find((event) => event.id === id) ?? mapped[0] ?? fallbackEvent;
        this.loading.set(false);
      },
      error: (error) => {
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  private toPublicEvent(event: EventRecord, venues: Venue[], index: number): PublicEvent {
    const start = new Date(event.startDateTime);
    const venue = venues.find((item) => item.id === event.venueId);
    const images = [
      '/assets/concert-hero.webp',
      '/assets/event-grid.webp',
      '/assets/eventora-event-sprite.png',
    ];
    return {
      id: String(event.id),
      n: event.name,
      cat: event.eventCategoryName || 'Event',
      date: start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase(),
      fullDate: start.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      v: venue?.name ?? `Venue #${event.venueId}`,
      p: `LKR ${event.ticketPrice.toLocaleString()}`,
      img: event.posterUrl || images[index % images.length],
      type: event.eventType === 'SeatBased' ? 'Seat Based' : 'General Entry',
      description: event.description,
    };
  }
}
