import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import {
  ApiEnvelope,
  AppRole,
  AuthSession,
  LoginPending,
  RegisterRequest,
} from './api.models';
import { API_ROOT } from './api.service';

const SESSION_KEY = 'eventora-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly state = signal<AuthSession | null>(this.readSession());
  readonly session = this.state.asReadonly();
  readonly role = computed(() => this.state()?.role ?? null);
  readonly isAuthenticated = computed(() => {
    const session = this.state();
    return !!session?.token && new Date(session.expiresAt).getTime() > Date.now();
  });

  constructor(private readonly http: HttpClient) {}

  login(identifier: string, password: string): Observable<LoginPending> {
    return this.http
      .post<ApiEnvelope<LoginPending>>(`${API_ROOT}/auth/login`, { identifier, password })
      .pipe(map((response) => response.data));
  }

  verifyOtp(challengeId: string, otp: string, remember: boolean): Observable<AuthSession> {
    return this.http
      .post<ApiEnvelope<AuthSession>>(`${API_ROOT}/auth/verify-otp`, { challengeId, otp })
      .pipe(
        map((response) => response.data),
        tap((session) => this.saveSession(session, remember)),
      );
  }

  resendOtp(challengeId: string): Observable<LoginPending> {
    return this.http
      .post<ApiEnvelope<LoginPending>>(`${API_ROOT}/auth/resend-otp`, { challengeId })
      .pipe(map((response) => response.data));
  }

  register(request: RegisterRequest): Observable<{ userId: number; role: AppRole }> {
    return this.http
      .post<ApiEnvelope<{ userId: number; role: AppRole }>>(`${API_ROOT}/auth/register`, request)
      .pipe(map((response) => response.data));
  }

  token(): string | null {
    return this.isAuthenticated() ? this.state()?.token ?? null : null;
  }

  signOut(): void {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('eventora-role');
    this.state.set(null);
  }

  landingRoute(role = this.role()): string {
    return role === 'Admin'
      ? '/admin/dashboard'
      : role === 'Organizer'
        ? '/organizer/dashboard'
        : '/customer/dashboard';
  }

  private saveSession(session: AuthSession, remember: boolean): void {
    const storage = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    other.removeItem(SESSION_KEY);
    storage.setItem(SESSION_KEY, JSON.stringify(session));
    sessionStorage.setItem('eventora-role', session.role.toLowerCase());
    this.state.set(session);
  }

  private readSession(): AuthSession | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as AuthSession;
      if (!session.token || new Date(session.expiresAt).getTime() <= Date.now()) return null;
      return session;
    } catch {
      return null;
    }
  }
}
