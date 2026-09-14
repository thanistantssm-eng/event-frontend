import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Approval, EventRecord } from '../../core/api.models';
import { Management } from './management';

describe('Admin event approval and publication', () => {
  it('moves an approved event to the publish screen and publishes it', () => {
    let event: EventRecord = {
      id: 42,
      name: 'Organizer Event',
      description: 'Approval flow test',
      eventType: 'NonSeatBased',
      organizerId: 3,
      venueId: null,
      venueMode: 'ExternalProperty',
      externalVenueName: 'Test Hall',
      externalVenueAddress: 'Test Road',
      eventCategoryId: 7,
      eventCategoryName: 'Concert',
      startDateTime: '2099-06-01T18:00:00.000Z',
      endDateTime: '2099-06-01T21:00:00.000Z',
      ticketPrice: 2500,
      status: 'PendingApproval',
      createdAt: '2099-01-01T00:00:00.000Z',
      updatedAt: '2099-01-01T00:00:00.000Z',
    };
    const approval: Approval = {
      id: 9,
      eventId: event.id,
      eventName: event.name,
      requestedByUserId: 8,
      requestedAt: '2099-01-01T00:00:00.000Z',
      status: 'Pending',
    };
    const router = {
      url: '/admin/approvals',
      events: of(),
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };
    const api = {
      events: () => of([event]),
      venues: () => of([]),
      categories: () => of([]),
      adminDashboard: () => of(null),
      properties: () => of([]),
      organizers: () => of([]),
      pendingApprovals: () => of([approval]),
      users: () => of([]),
      parkingAreas: () => of([]),
      adminReport: () => of(null),
      allBookings: () => of([]),
      allPayments: () => of([]),
      notifications: () => of([]),
      approve: vi.fn(() => {
        event = { ...event, status: 'Approved' };
        return of({ ...approval, status: 'Approved' });
      }),
      reject: vi.fn(),
      publishEvent: vi.fn(() => {
        event = { ...event, status: 'Published' };
        return of(event);
      }),
    };

    TestBed.configureTestingModule({
      imports: [Management],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: {}, url: of([]) } },
        { provide: ApiService, useValue: api },
        {
          provide: AuthService,
          useValue: { session: signal({ userId: 1, role: 'Admin', organizerId: null }) },
        },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });

    const component = TestBed.createComponent(Management).componentInstance as unknown as {
      openAction(name: string, mode: 'approve', approvalId: number): void;
      confirmAction(): void;
      publish(row: unknown): void;
      organizerEvents: Array<{ backendId: number; status: string }>;
    };

    component.openAction(event.name, 'approve', approval.id);
    component.confirmAction();

    expect(api.approve).toHaveBeenCalledWith(approval.id);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/events/42');
    expect(component.organizerEvents[0].status).toBe('Approved');

    component.publish(component.organizerEvents[0]);

    expect(api.publishEvent).toHaveBeenCalledWith(event.id);
    expect(component.organizerEvents[0].status).toBe('Published');
  });
});
