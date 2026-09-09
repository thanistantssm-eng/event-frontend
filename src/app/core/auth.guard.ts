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
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: router.url } });
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
