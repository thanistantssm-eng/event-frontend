import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

type AppRole = 'Customer' | 'Organizer' | 'Admin';

function roleGuard(required?: AppRole): CanActivateFn {
  return () => {
    const router = inject(Router);
    const auth = inject(AuthService);
    const role = auth.role();
    if (!auth.isAuthenticated() || !role) {
      const loginPath = required === 'Admin' ? '/admin/login' : '/login';
      const queryParams: Record<string, string> = { returnUrl: router.url };
      if (required === 'Organizer') queryParams['role'] = 'organizer';
      return router.createUrlTree([loginPath], { queryParams });
    }
    if (required && role !== required) {
      return router.createUrlTree([auth.landingRoute(role)]);
    }
    return true;
  };
}

export const authGuard = roleGuard();
export const customerGuard = roleGuard('Customer');
export const organizerGuard = roleGuard('Organizer');
export const adminGuard = roleGuard('Admin');

export const publicEntryGuard: CanActivateFn = () => {
  if (typeof window === 'undefined' || window.location.port !== '4300') return true;
  const router = inject(Router);
  const auth = inject(AuthService);
  return router.createUrlTree([
    auth.isAuthenticated() && auth.role() === 'Admin' ? '/admin/dashboard' : '/admin/login',
  ]);
};
