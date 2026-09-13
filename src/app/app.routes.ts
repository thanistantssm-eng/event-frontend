import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';
import { Auth } from './pages/auth/auth';
import { NotFound } from './pages/not-found/not-found';
import { PublicPages } from './pages/public-pages/public-pages';
import { adminGuard, customerGuard, organizerGuard, publicEntryGuard } from './core/auth.guard';

const loadPortal = () => import('./pages/portal/portal').then((module) => module.Portal);
const loadManagement = () => import('./pages/management/management').then((module) => module.Management);

const organizerPaths = [
  'organizer',
  'organizer/dashboard',
  'organizer/my-events',
  'organizer/events/create',
  'organizer/events/create/type',
  'organizer/events/create/details',
  'organizer/events/create/seats-or-capacity',
  'organizer/events/create/ticket-pricing',
  'organizer/events/create/parking',
  'organizer/events/create/poster-qr',
  'organizer/events/create/review',
  'organizer/events/create/submit',
  'organizer/events/:id',
  'organizer/events/:id/edit',
  'organizer/events/:id/seats',
  'organizer/events/:id/ticket-pricing',
  'organizer/events/:id/parking-setup',
  'organizer/events/:id/bookings',
  'organizer/events/:id/reports',
  'organizer/events/:id/poster-qr',
  'organizer/bookings',
  'organizer/approvals',
  'organizer/notifications',
  'organizer/reports',
  'organizer/profile',
  'organizer/settings',
];

const adminPaths = [
  'admin',
  'admin/dashboard',
  'admin/properties',
  'admin/properties/create',
  'admin/properties/:id',
  'admin/properties/:id/edit',
  'admin/venues',
  'admin/organizers',
  'admin/organizers/:id',
  'admin/users',
  'admin/events',
  'admin/events/create',
  'admin/events/:id/layout',
  'admin/events/:id/seats',
  'admin/events/:id/ticket-pricing',
  'admin/events/:id',
  'admin/approvals',
  'admin/approvals/:id',
  'admin/bookings',
  'admin/bookings/:id',
  'admin/payments',
  'admin/payments/:id',
  'admin/parking',
  'admin/reports',
  'admin/categories',
  'admin/notifications',
  'admin/settings',
];

export const routes: Routes = [
  { path: '', component: Landing, canActivate: [publicEntryGuard], title: 'Eventora | Events • Tickets • Parking' },
  { path: 'login', component: Auth, canActivate: [publicEntryGuard], title: 'Login | Event Parking Reservation System' },
  { path: 'admin/login', component: Auth, title: 'Admin Login | Event Parking Reservation System' },
  { path: 'admin/setup', component: Auth, title: 'Admin Setup | Event Parking Reservation System' },
  { path: 'admin/reset-password', component: Auth, title: 'Admin Password Reset | Event Parking' },
  { path: 'register', component: Auth, canActivate: [publicEntryGuard], title: 'Create Account | Event Parking' },
  { path: 'forgot-password', component: Auth, canActivate: [publicEntryGuard], title: 'Forgot Password | Event Parking' },
  { path: 'reset-password', component: Auth, canActivate: [publicEntryGuard], title: 'Reset Password | Event Parking' },
  { path: 'events', component: PublicPages, canActivate: [publicEntryGuard], title: 'Discover Events | Event Parking' },
  { path: 'events/:id', component: PublicPages, canActivate: [publicEntryGuard], title: 'Event Details | Event Parking' },
  { path: 'about', component: PublicPages, canActivate: [publicEntryGuard], title: 'About | Event Parking' },
  { path: 'contact', component: PublicPages, canActivate: [publicEntryGuard], title: 'Contact | Event Parking' },
  { path: 'how-it-works', component: PublicPages, canActivate: [publicEntryGuard], title: 'How It Works | Event Parking' },
  { path: 'parking', component: PublicPages, canActivate: [publicEntryGuard], title: 'Parking | Event Parking' },
  { path: 'faq', component: PublicPages, canActivate: [publicEntryGuard], title: 'FAQ | Event Parking' },

  // Existing customer flow kept intact.
  {
    path: 'app/dashboard',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Dashboard | Event Parking',
  },
  {
    path: 'app/events',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Discover Events | Event Parking',
  },
  {
    path: 'app/checkout',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Checkout | Event Parking',
  },
  {
    path: 'app/payment',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Payment | Event Parking',
  },
  {
    path: 'app/confirmed',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Booking Confirmed | Event Parking',
  },
  {
    path: 'app/bookings',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'My Bookings | Event Parking',
  },
  {
    path: 'app/parking',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'My Parking | Event Parking',
  },
  {
    path: 'app/payments',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Payment History | Event Parking',
  },
  {
    path: 'app/payments/receipt',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Payment Receipt | Event Parking',
  },
  {
    path: 'app/notifications',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Notifications | Event Parking',
  },

  // Role-based customer aliases matching the project route specification.
  {
    path: 'customer/dashboard',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Customer Dashboard | Event Parking',
  },
  {
    path: 'customer/events',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Discover Events | Event Parking',
  },
  {
    path: 'customer/events/:id',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Event Details | Event Parking',
  },
  {
    path: 'customer/bookings',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'My Bookings | Event Parking',
  },
  {
    path: 'customer/tickets',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Tickets & QR | Event Parking',
  },
  {
    path: 'customer/bookings/:id',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Booking Details | Event Parking',
  },
  {
    path: 'customer/parking',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'My Parking | Event Parking',
  },
  {
    path: 'customer/payments',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Payments | Event Parking',
  },
  {
    path: 'customer/payment-history',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Payment History | Event Parking',
  },
  {
    path: 'customer/payments/receipt',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Payment Receipt | Event Parking',
  },
  {
    path: 'customer/notifications',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Notifications | Event Parking',
  },
  {
    path: 'customer/profile',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Profile | Event Parking',
  },
  {
    path: 'customer/settings',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Settings | Event Parking',
  },
  {
    path: 'customer/support',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Support | Event Parking',
  },
  {
    path: 'customer/favorites',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Favorites | Event Parking',
  },
  {
    path: 'customer/booking/tickets/:eventId',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Select Tickets | Event Parking',
  },
  {
    path: 'customer/booking/seats/:eventId',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Select Seats | Event Parking',
  },
  {
    path: 'customer/booking/parking/:eventId',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Select Parking | Event Parking',
  },
  {
    path: 'customer/booking/summary/:eventId',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Booking Summary | Event Parking',
  },
  {
    path: 'customer/booking/payment/:eventId',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Payment | Event Parking',
  },
  {
    path: 'customer/booking/success/:bookingId',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Booking Confirmed | Event Parking',
  },
  {
    path: 'customer/booking/ticket/:bookingId',
    loadComponent: loadPortal,
    canActivate: [customerGuard],
    title: 'Ticket & QR | Event Parking',
  },

  // Role-based management areas.
  ...organizerPaths.map((path) => ({
    path,
    loadComponent: loadManagement,
    canActivate: [organizerGuard],
    title: 'Organizer | Event Parking',
  })),
  ...adminPaths.map((path) => ({
    path,
    loadComponent: loadManagement,
    canActivate: [adminGuard],
    title: 'Admin | Event Parking',
  })),

  { path: '**', component: NotFound, title: 'Page Not Found | Event Parking' },
];
