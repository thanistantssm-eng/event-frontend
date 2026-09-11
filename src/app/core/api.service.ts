import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  AdminDashboard,
  AdminReport,
  ApiEnvelope,
  Approval,
  Booking,
  CustomerDashboard,
  CustomerProfile,
  CustomerReport,
  EventAvailability,
  EventCategory,
  EventQuery,
  EventRecord,
  EventWrite,
  Organizer,
  OrganizerDashboard,
  OrganizerEventRevenue,
  OrganizerTicketSales,
  ParkingAllocation,
  ParkingArea,
  ParkingLayout,
  ParkingSlot,
  Payment,
  PaymentReceipt,
  Property,
  QrCode,
  Seat,
  TicketType,
  User,
  UserNotification,
  Venue,
} from './api.models';

declare global {
  interface Window {
    __EVENTORA_API_URL__?: string;
  }
}

export const API_ROOT =
  (typeof window !== 'undefined' && window.__EVENTORA_API_URL__?.replace(/\/$/, '')) ||
  'https://eventparkingapi.runasp.net/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  health() {
    return this.http.get<{ status: string; message?: string; service?: string }>(`${API_ROOT}/health`);
  }

  me() { return this.envelope<User>('users/me'); }
  users() { return this.envelope<User[]>('users'); }
  user(id: number) { return this.envelope<User>(`users/${id}`); }
  setUserStatus(id: number, isActive: boolean) {
    return this.envelopePatch<User>(`users/${id}/status`, { isActive });
  }

  customerProfile() { return this.envelope<CustomerProfile>('customers/me'); }
  updateCustomerProfile(name: string, phone?: string) {
    return this.envelopePut<CustomerProfile>('customers/me', { name, phone });
  }
  customers(search = '', isActive?: boolean) {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (isActive !== undefined) params = params.set('isActive', isActive);
    return this.http
      .get<ApiEnvelope<CustomerProfile[]>>(`${API_ROOT}/customers`, { params })
      .pipe(map((response) => response.data));
  }
  customer(id: number) { return this.envelope<CustomerProfile>(`customers/${id}`); }
  setCustomerStatus(id: number, isActive: boolean) {
    return this.envelopePatch<CustomerProfile>(`customers/${id}/status`, { isActive });
  }
  deactivateCustomer(id: number) { return this.http.delete<void>(`${API_ROOT}/customers/${id}`); }

  organizers() { return this.envelope<Organizer[]>('organizers'); }
  organizer(id: number) { return this.envelope<Organizer>(`organizers/${id}`); }
  organizerProfile() { return this.envelope<Organizer>('organizers/me'); }
  organizerTicketSales() { return this.envelope<OrganizerTicketSales>('organizers/me/ticket-sales'); }
  organizerEventRevenue(eventId: number) {
    return this.envelope<OrganizerEventRevenue>(`organizers/me/events/${eventId}/revenue`);
  }
  setOrganizerVerification(id: number, isVerified: boolean) {
    return this.envelopePatch<Organizer>(`organizers/${id}/verification`, { isVerified });
  }

  properties() { return this.http.get<Property[]>(`${API_ROOT}/properties`); }
  property(id: number) { return this.http.get<Property>(`${API_ROOT}/properties/${id}`); }
  createProperty(payload: Pick<Property, 'name' | 'address'> & Partial<Property>) {
    return this.http.post<Property>(`${API_ROOT}/properties`, payload);
  }
  updateProperty(id: number, payload: Pick<Property, 'name' | 'address' | 'isActive'> & Partial<Property>) {
    return this.http.put<Property>(`${API_ROOT}/properties/${id}`, payload);
  }
  deleteProperty(id: number) { return this.http.delete<void>(`${API_ROOT}/properties/${id}`); }

  venues(propertyId?: number) {
    const params = propertyId ? new HttpParams().set('propertyId', propertyId) : undefined;
    return this.http.get<Venue[]>(`${API_ROOT}/venues`, { params });
  }
  venue(id: number) { return this.http.get<Venue>(`${API_ROOT}/venues/${id}`); }
  createVenue(payload: Pick<Venue, 'propertyId' | 'name' | 'capacity'> & Partial<Venue>) {
    return this.http.post<Venue>(`${API_ROOT}/venues`, payload);
  }
  updateVenue(id: number, payload: Pick<Venue, 'propertyId' | 'name' | 'capacity' | 'isActive'> & Partial<Venue>) {
    return this.http.put<Venue>(`${API_ROOT}/venues/${id}`, payload);
  }
  deleteVenue(id: number) { return this.http.delete<void>(`${API_ROOT}/venues/${id}`); }

  notifications() { return this.http.get<UserNotification[]>(`${API_ROOT}/user-notifications`); }
  unreadNotificationCount() {
    return this.http.get<{ unreadCount: number }>(`${API_ROOT}/user-notifications/unread-count`);
  }
  markNotificationRead(id: number) {
    return this.http.put<UserNotification>(`${API_ROOT}/user-notifications/${id}/read`, {});
  }
  markAllNotificationsRead() {
    return this.http.put<{ message: string }>(`${API_ROOT}/user-notifications/read-all`, {});
  }
  sendNotification(payload: { userId: number; title: string; message: string; type?: string }) {
    return this.http.post<UserNotification>(`${API_ROOT}/user-notifications`, payload);
  }

  adminDashboard() { return this.envelope<AdminDashboard>('dashboard/admin'); }
  organizerDashboard() { return this.envelope<OrganizerDashboard>('dashboard/organizer'); }
  customerDashboard() { return this.envelope<CustomerDashboard>('dashboard/customer'); }

  events(query: EventQuery = {}) {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, value);
    });
    return this.http.get<EventRecord[]>(`${API_ROOT}/events`, { params });
  }
  event(id: number) { return this.http.get<EventRecord>(`${API_ROOT}/events/${id}`); }
  eventByQr(qrCode: string) {
    return this.http.get<EventRecord>(`${API_ROOT}/events/qr/${encodeURIComponent(qrCode)}`);
  }
  createEvent(payload: EventWrite) { return this.http.post<EventRecord>(`${API_ROOT}/events`, payload); }
  createEventForOrganizer(organizerId: number, payload: EventWrite) {
    return this.http.post<EventRecord>(`${API_ROOT}/events/admin/for-organizer/${organizerId}`, payload);
  }
  updateEvent(id: number, payload: EventWrite) {
    return this.http.put<EventRecord>(`${API_ROOT}/events/${id}`, payload);
  }
  deleteEvent(id: number) { return this.http.delete<void>(`${API_ROOT}/events/${id}`); }
  publishEvent(id: number) { return this.http.post<EventRecord>(`${API_ROOT}/events/${id}/publish`, {}); }
  regenerateEventQr(id: number) {
    return this.http.post<EventRecord>(`${API_ROOT}/events/${id}/qr/regenerate`, {});
  }

  categories(includeInactive = false) {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<EventCategory[]>(`${API_ROOT}/categories`, { params });
  }
  category(id: number) { return this.http.get<EventCategory>(`${API_ROOT}/categories/${id}`); }
  createCategory(payload: { name: string; description?: string }) {
    return this.http.post<EventCategory>(`${API_ROOT}/categories`, payload);
  }
  updateCategory(id: number, payload: { name: string; description?: string; isActive: boolean }) {
    return this.http.put<EventCategory>(`${API_ROOT}/categories/${id}`, payload);
  }
  deleteCategory(id: number) { return this.http.delete<void>(`${API_ROOT}/categories/${id}`); }

  submitApproval(eventId: number, organizerNotes?: string) {
    return this.http.post<Approval>(`${API_ROOT}/approvals/events/${eventId}/submit`, { organizerNotes });
  }
  pendingApprovals() { return this.http.get<Approval[]>(`${API_ROOT}/approvals/pending`); }
  myApprovals() { return this.http.get<Approval[]>(`${API_ROOT}/approvals/me`); }
  approve(approvalId: number, reason?: string) {
    return this.http.put<Approval>(`${API_ROOT}/approvals/${approvalId}/approve`, { reason });
  }
  reject(approvalId: number, reason: string) {
    return this.http.put<Approval>(`${API_ROOT}/approvals/${approvalId}/reject`, { reason });
  }

  tickets(eventId: number) { return this.http.get<TicketType[]>(`${API_ROOT}/events/${eventId}/tickets`); }
  ticket(id: number) { return this.http.get<TicketType>(`${API_ROOT}/tickets/${id}`); }
  createTicket(eventId: number, payload: Omit<TicketType, 'id' | 'eventId' | 'isActive'>) {
    return this.http.post<TicketType>(`${API_ROOT}/events/${eventId}/tickets`, payload);
  }
  updateTicket(id: number, payload: Omit<TicketType, 'id' | 'eventId'>) {
    return this.http.put<TicketType>(`${API_ROOT}/tickets/${id}`, payload);
  }
  deleteTicket(id: number) { return this.http.delete<void>(`${API_ROOT}/tickets/${id}`); }

  seats(eventId: number) { return this.http.get<Seat[]>(`${API_ROOT}/events/${eventId}/seats`); }
  seat(id: number) { return this.http.get<Seat>(`${API_ROOT}/seats/${id}`); }
  createSeat(eventId: number, payload: Partial<Seat> & Pick<Seat, 'seatNumber'>) {
    return this.http.post<Seat>(`${API_ROOT}/events/${eventId}/seats`, payload);
  }
  createSeats(eventId: number, payload: Array<Partial<Seat> & Pick<Seat, 'seatNumber'>>) {
    return this.http.post<Seat[]>(`${API_ROOT}/events/${eventId}/seats/bulk`, payload);
  }
  updateSeat(id: number, payload: Partial<Seat> & Pick<Seat, 'seatNumber'>) {
    return this.http.put<Seat>(`${API_ROOT}/seats/${id}`, payload);
  }
  deleteSeat(id: number) { return this.http.delete<void>(`${API_ROOT}/seats/${id}`); }

  parkingAreas(venueId?: number) {
    const params = venueId ? new HttpParams().set('venueId', venueId) : undefined;
    return this.http.get<ParkingArea[]>(`${API_ROOT}/parking/areas`, { params });
  }
  parkingArea(id: number) { return this.http.get<ParkingArea>(`${API_ROOT}/parking/areas/${id}`); }
  createParkingArea(payload: Omit<ParkingArea, 'id' | 'isActive'>) {
    return this.http.post<ParkingArea>(`${API_ROOT}/parking/areas`, payload);
  }
  updateParkingArea(id: number, payload: Omit<ParkingArea, 'id'>) {
    return this.http.put<ParkingArea>(`${API_ROOT}/parking/areas/${id}`, payload);
  }
  parkingSlots(areaId: number) {
    return this.http.get<ParkingSlot[]>(`${API_ROOT}/parking/areas/${areaId}/slots`);
  }
  parkingSlot(id: number) { return this.http.get<ParkingSlot>(`${API_ROOT}/parking/slots/${id}`); }
  createParkingSlot(areaId: number, payload: Pick<ParkingSlot, 'slotNumber'> & Partial<ParkingSlot>) {
    return this.http.post<ParkingSlot>(`${API_ROOT}/parking/areas/${areaId}/slots`, payload);
  }
  updateParkingSlot(id: number, payload: Pick<ParkingSlot, 'slotNumber' | 'isActive'> & Partial<ParkingSlot>) {
    return this.http.put<ParkingSlot>(`${API_ROOT}/parking/slots/${id}`, payload);
  }
  deleteParkingSlot(id: number) { return this.http.delete<void>(`${API_ROOT}/parking/slots/${id}`); }
  eventParkingLayout(eventId: number) {
    return this.http.get<ParkingLayout>(`${API_ROOT}/parking/events/${eventId}/layout`);
  }
  eventParkingSlots(eventId: number) {
    return this.http.get<ParkingSlot[]>(`${API_ROOT}/events/${eventId}/parking-slots`);
  }
  allocateParking(eventId: number, payload: { parkingAreaId: number; allocatedSlotCount: number; parkingFee: number }) {
    return this.http.post<ParkingAllocation>(`${API_ROOT}/parking/events/${eventId}/allocations`, payload);
  }
  deleteParkingAllocation(id: number) {
    return this.http.delete<void>(`${API_ROOT}/parking/allocations/${id}`);
  }

  createBooking(payload: {
    eventId: number;
    seatIds: number[];
    parkingSlotId?: number | null;
    ticketType: string;
    quantity: number;
  }) { return this.http.post<Booking>(`${API_ROOT}/bookings`, payload); }
  booking(id: number) { return this.http.get<Booking>(`${API_ROOT}/bookings/${id}`); }
  myBookings() { return this.http.get<Booking[]>(`${API_ROOT}/bookings/me`); }
  customerBookings(customerId: number) {
    return this.http.get<Booking[]>(`${API_ROOT}/bookings/customer/${customerId}`);
  }
  allBookings() { return this.http.get<Booking[]>(`${API_ROOT}/bookings`); }
  eventBookings(eventId: number) {
    const params = new HttpParams().set('eventId', eventId);
    return this.http.get<Booking[]>(`${API_ROOT}/bookings`, { params });
  }
  availability(eventId: number) {
    return this.http.get<EventAvailability>(`${API_ROOT}/events/${eventId}/availability`);
  }
  attachParking(bookingId: number, parkingSlotId: number) {
    return this.http.post<Booking>(`${API_ROOT}/bookings/${bookingId}/parking`, { parkingSlotId });
  }
  removeParking(bookingId: number) {
    return this.http.delete<void>(`${API_ROOT}/bookings/${bookingId}/parking`);
  }
  cancelBooking(bookingId: number) {
    return this.http.delete<void>(`${API_ROOT}/bookings/${bookingId}`);
  }

  bookingPayment(bookingId: number) {
    return this.http.get<Payment>(`${API_ROOT}/bookings/${bookingId}/payment`);
  }
  startPayment(bookingId: number, method: string) {
    return this.http.post<Payment>(`${API_ROOT}/bookings/${bookingId}/payment`, { method });
  }
  myPayments() { return this.http.get<Payment[]>(`${API_ROOT}/payments/me`); }
  allPayments() { return this.http.get<Payment[]>(`${API_ROOT}/payments`); }
  customerPayments(customerId: number) {
    return this.http.get<Payment[]>(`${API_ROOT}/payments/customer/${customerId}`);
  }
  paymentReceipt(paymentId: number) {
    return this.http.get<PaymentReceipt>(`${API_ROOT}/payments/${paymentId}/receipt`);
  }
  refundPayment(paymentId: number) {
    return this.http.post<Payment>(`${API_ROOT}/payments/${paymentId}/refund`, {});
  }
  requestPaymentOtp(paymentId: number) {
    return this.http.post<{ paymentId: number; expiresAtUtc: string; developmentCode?: string | null }>(
      `${API_ROOT}/otp/request`, { paymentId });
  }
  verifyPaymentOtp(paymentId: number, code: string) {
    return this.http.post<Payment>(`${API_ROOT}/otp/verify`, { paymentId, code });
  }

  bookingQr(bookingId: number) {
    return this.http.get<QrCode>(`${API_ROOT}/qr-codes/booking/${bookingId}`);
  }
  validateQr(token: string) {
    return this.http.get<QrCode>(`${API_ROOT}/qr-codes/validate/${encodeURIComponent(token)}`);
  }
  myTransactionNotifications() {
    return this.http.get<UserNotification[]>(`${API_ROOT}/notifications/me`);
  }
  customerTransactionNotifications(customerId: number) {
    return this.http.get<UserNotification[]>(`${API_ROOT}/notifications/customer/${customerId}`);
  }
  markTransactionNotificationRead(id: number) {
    return this.http.put<UserNotification>(`${API_ROOT}/notifications/${id}/read`, {});
  }
  adminReport() { return this.http.get<AdminReport>(`${API_ROOT}/reports/admin-summary`); }
  myCustomerReport() {
    return this.http.get<CustomerReport>(`${API_ROOT}/reports/customer/me`);
  }
  customerReport(customerId: number) {
    return this.http.get<CustomerReport>(`${API_ROOT}/reports/customer/${customerId}`);
  }

  private envelope<T>(path: string): Observable<T> {
    return this.http.get<ApiEnvelope<T>>(`${API_ROOT}/${path}`).pipe(map((response) => response.data));
  }
  private envelopePut<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiEnvelope<T>>(`${API_ROOT}/${path}`, body).pipe(map((response) => response.data));
  }
  private envelopePatch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<ApiEnvelope<T>>(`${API_ROOT}/${path}`, body).pipe(map((response) => response.data));
  }
}

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Something went wrong. Please try again.';
  if (error.status === 0) return 'Cannot reach the API. Please check your internet connection or backend service.';
  const body = error.error as { message?: string; title?: string; errors?: Record<string, string[]> } | string;
  if (typeof body === 'string') return body || `Request failed (${error.status}).`;
  if (body?.message) return body.message;
  if (body?.errors) return Object.values(body.errors).flat()[0] ?? 'Please check the entered details.';
  return body?.title ?? `Request failed (${error.status}).`;
}
