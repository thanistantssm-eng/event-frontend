export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
};

export type AppRole = 'Customer' | 'Organizer' | 'Admin';

export interface LoginPending {
  requiresOtp: boolean;
  challengeId: string;
  maskedEmail: string;
  expiresAt: string;
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  userId: number;
  username: string;
  email: string;
  role: AppRole;
  organizerId?: number | null;
  customerId?: number | null;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role: AppRole;
  organizationName?: string;
  phoneNumber?: string;
  address?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: AppRole;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CustomerProfile {
  id: number;
  userId: number;
  username: string;
  name: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface Organizer {
  id: number;
  userId: number;
  username: string;
  email: string;
  organizationName: string;
  phoneNumber?: string | null;
  address?: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Property {
  id: number;
  name: string;
  address: string;
  city?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface Venue {
  id: number;
  propertyId: number;
  propertyName: string;
  name: string;
  location?: string | null;
  capacity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface EventCategory {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface EventRecord {
  id: number;
  name: string;
  description: string;
  eventType: 'SeatBased' | 'NonSeatBased' | string;
  organizerId: number;
  venueId: number;
  eventCategoryId: number;
  eventCategoryName?: string | null;
  startDateTime: string;
  endDateTime: string;
  ticketPrice: number;
  status: string;
  posterUrl?: string | null;
  eventQrCode?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  publishedAt?: string | null;
}

export interface EventQuery {
  search?: string;
  date?: string;
  venue?: number;
  category?: number;
  eventType?: string;
  status?: string;
}

export type EventWrite = Pick<
  EventRecord,
  | 'name'
  | 'description'
  | 'eventType'
  | 'venueId'
  | 'eventCategoryId'
  | 'startDateTime'
  | 'endDateTime'
  | 'ticketPrice'
> & { organizerId?: number; posterUrl?: string | null };

export interface TicketType {
  id: number;
  eventId: number;
  name: string;
  description?: string | null;
  price: number;
  quantity: number;
  isActive: boolean;
}

export interface Seat {
  id: number;
  eventId: number;
  ticketTypeId?: number | null;
  seatNumber: string;
  rowLabel?: string | null;
  columnNumber?: number | null;
  priceOverride?: number | null;
  price: number;
  setupStatus: string;
  status: string;
  isActive: boolean;
}

export interface ParkingArea {
  id: number;
  venueId: number;
  name: string;
  description?: string | null;
  capacity: number;
  isActive: boolean;
}

export interface ParkingSlot {
  id: number;
  parkingAreaId: number;
  slotNumber: string;
  slotType?: string | null;
  isActive: boolean;
  status: string;
  parkingFee: number;
}

export interface ParkingAllocation {
  id: number;
  eventId: number;
  parkingAreaId: number;
  parkingAreaName?: string | null;
  allocatedSlotCount: number;
  parkingFee: number;
  isActive: boolean;
}

export interface ParkingLayout {
  eventId: number;
  allocations: ParkingAllocation[];
  slots: ParkingSlot[];
}

export interface Approval {
  id: number;
  eventId: number;
  eventName?: string | null;
  requestedByUserId: number;
  requestedAt: string;
  status: string;
  organizerNotes?: string | null;
  reviewedByUserId?: number | null;
  reviewedAt?: string | null;
  reviewReason?: string | null;
}

export interface Booking {
  id: number;
  bookingNumber: string;
  customerId: number;
  eventId: number;
  eventName: string;
  status: string;
  totalAmount: number;
  seats: string[];
  parkingSlot?: string | null;
  paymentStatus: string;
  createdAtUtc: string;
}

export interface SelectionItem {
  id: number;
  label: string;
  isReserved: boolean;
}

export interface EventAvailability {
  eventId: number;
  eventName: string;
  ticketPrice: number;
  parkingFee: number;
  seats: SelectionItem[];
  parkingSlots: SelectionItem[];
}

export interface Payment {
  id: number;
  bookingId: number;
  amount: number;
  method: string;
  status: string;
  transactionReference: string;
  createdAtUtc: string;
  completedAtUtc?: string | null;
}

export interface PaymentReceipt {
  receiptNumber: string;
  bookingNumber: string;
  amount: number;
  method: string;
  transactionReference: string;
  paidAtUtc: string;
}

export interface QrCode {
  bookingId: number;
  token: string;
  payload: string;
  createdAtUtc: string;
}

export interface UserNotification {
  id: number;
  userId?: number;
  customerId?: number;
  bookingId?: number | null;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  createdAt?: string;
  createdAtUtc?: string;
  readAt?: string | null;
}

export interface AdminDashboard {
  totalUsers: number;
  activeUsers: number;
  totalCustomers: number;
  totalOrganizers: number;
  pendingOrganizerVerifications: number;
  totalProperties: number;
  totalVenues: number;
  totalEvents: number;
  publishedEvents: number;
  pendingApprovalEvents: number;
  totalBookings: number;
  confirmedBookings: number;
  completedPayments: number;
  totalRevenue: number;
  reservedSeats: number;
  reservedParkingSlots: number;
}

export interface OrganizerDashboard {
  organizerId: number;
  organizationName: string;
  isVerified: boolean;
  totalEvents: number;
  draftEvents: number;
  pendingApprovalEvents: number;
  publishedEvents: number;
  upcomingEvents: number;
  totalBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
}

export interface CustomerDashboard {
  customerId: number;
  name: string;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  upcomingBookings: number;
  totalSpent: number;
}

export interface AdminReport {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  seatsReserved: number;
  parkingSlotsReserved: number;
  totalRevenue: number;
}

export interface CustomerReport {
  customerId: number;
  totalBookings: number;
  upcomingBookings: number;
  totalPaid: number;
  unreadNotifications: number;
}

export interface OrganizerTicketSales {
  organizerId: number;
  totalTicketsSold: number;
  totalTicketRevenue: number;
  events: Array<{
    eventId: number;
    eventName: string;
    confirmedBookings: number;
    ticketsSold: number;
    ticketRevenue: number;
    ticketTypes: Array<{ ticketType: string; ticketsSold: number; revenue: number }>;
  }>;
}

export interface OrganizerEventRevenue {
  eventId: number;
  eventName: string;
  confirmedBookings: number;
  ticketsSold: number;
  parkingReservations: number;
  ticketRevenue: number;
  parkingRevenue: number;
  totalRevenue: number;
}
