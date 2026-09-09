import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EventRecord, Venue } from '../../core/api.models';
import { ApiService, apiErrorMessage } from '../../core/api.service';
import { UiState } from '../../shared/ui-state/ui-state';

type LandingEvent = {
  id: number;
  day: string;
  month: string;
  category: string;
  title: string;
  venue: string;
  dateTime: string;
  price: string;
  ticketType: string;
  posterUrl: string;
};

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, UiState],
  styleUrl: './landing.css',
  templateUrl: './landing.html',
})
export class Landing {
  protected readonly menuOpen = signal(false);
  protected readonly query = signal('');
  protected readonly selectedCategory = signal('All Categories');
  protected readonly selectedVenue = signal('All Locations');
  protected readonly searchMessage = signal('');
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly events = signal<LandingEvent[]>([]);
  protected readonly venues = signal<string[]>([]);
  protected readonly categories = computed(() => [
    ...new Set(['All Categories', ...this.events().map((event) => event.category)]),
  ]);
  protected readonly heroEvent = computed(() => this.events()[0] ?? null);

  protected readonly filteredEvents = computed(() => {
    const query = this.query().trim().toLowerCase();
    const category = this.selectedCategory();
    const venue = this.selectedVenue();
    return this.events().filter((event) => {
      const matchesQuery =
        !query || `${event.title} ${event.venue} ${event.category}`.toLowerCase().includes(query);
      const matchesCategory = category === 'All Categories' || event.category === category;
      const matchesVenue = venue === 'All Locations' || event.venue === venue;
      return matchesQuery && matchesCategory && matchesVenue;
    });
  });

  constructor(private readonly api: ApiService) {
    this.loadEvents();
  }

  protected updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.searchMessage.set('');
  }

  protected updateCategory(event: Event): void {
    this.selectedCategory.set((event.target as HTMLSelectElement).value);
    this.searchMessage.set('');
  }

  protected updateVenue(event: Event): void {
    this.selectedVenue.set((event.target as HTMLSelectElement).value);
    this.searchMessage.set('');
  }

  protected findEvents(): void {
    const count = this.filteredEvents().length;
    this.searchMessage.set(
      count ? `${count} matching event${count === 1 ? '' : 's'} found.` : 'No matching events found.',
    );
    document.querySelector('#events')?.scrollIntoView({ behavior: 'smooth' });
  }

  protected focusSearch(): void {
    (document.querySelector('.search-field input') as HTMLInputElement | null)?.focus();
    document.querySelector('.search-wrap')?.scrollIntoView({ behavior: 'smooth' });
  }

  protected chooseCategory(category: string): void {
    this.selectedCategory.set(category);
    this.findEvents();
  }


  protected loadEvents(): void {
    this.loading.set(true);
    this.loadError.set('');
    forkJoin({
      events: this.api.events({ status: 'Published' }),
      venues: this.api.venues(),
    }).subscribe({
      next: ({ events, venues }) => {
        this.events.set(events.map((event) => this.mapEvent(event, venues)));
        this.venues.set([
          ...new Set(venues.filter((venue) => venue.isActive).map((venue) => venue.name)),
        ]);
        this.loading.set(false);
      },
      error: (error) => {
        this.loadError.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  private mapEvent(event: EventRecord, venues: Venue[]): LandingEvent {
    const start = new Date(event.startDateTime);
    const venue = venues.find((item) => item.id === event.venueId);
    return {
      id: event.id,
      day: start.toLocaleDateString('en-GB', { day: '2-digit' }),
      month: start.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
      category: event.eventCategoryName || 'Event',
      title: event.name,
      venue: venue?.name ?? 'Venue unavailable',
      dateTime: start.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }),
      price: `LKR ${event.ticketPrice.toLocaleString()}`,
      ticketType: event.eventType === 'SeatBased' ? 'Seat Based' : 'General Entry',
      posterUrl: event.posterUrl || '/assets/event-grid.webp',
    };
  }
}
