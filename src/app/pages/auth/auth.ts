import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { apiErrorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AppRole } from '../../core/api.models';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class Auth {
  protected readonly mode: 'login' | 'register' | 'reset';
  protected readonly loginTarget: string;
  protected readonly passwordVisible = signal(false);
  protected readonly remember = signal(true);
  protected readonly message = signal('');
  protected readonly resetStage = signal<'request' | 'change'>('request');
  protected readonly loginStage = signal<'password' | 'otp'>('password');
  protected readonly loading = signal(false);
  protected readonly maskedEmail = signal('');
  protected readonly roleLabel: 'Customer' | 'Organizer' | 'Administrator';
  protected readonly isAdminEntry: boolean;
  private readonly returnUrl: string | null;
  private challengeId = '';
  protected name = '';
  protected email = '';
  protected phone = '';
  protected password = '';
  protected confirm = '';
  protected code = '';
  constructor(
    private readonly router: Router,
    private readonly auth: AuthService,
  ) {
    const requestedReturnUrl = this.router.parseUrl(router.url).queryParams['returnUrl'];
    this.returnUrl = typeof requestedReturnUrl === 'string' ? requestedReturnUrl : null;
    this.mode = router.url.includes('register')
      ? 'register'
      : router.url.includes('reset') || router.url.includes('forgot-password')
        ? 'reset'
        : 'login';
    this.loginTarget = router.url.startsWith('/admin/login') || router.url.includes('role=admin')
      ? '/admin/dashboard'
      : router.url.includes('role=organizer')
        ? '/organizer/dashboard'
        : '/customer/dashboard';
    this.isAdminEntry = this.loginTarget.startsWith('/admin');
    this.roleLabel = this.loginTarget.startsWith('/admin')
      ? 'Administrator'
      : this.loginTarget.startsWith('/organizer')
        ? 'Organizer'
        : 'Customer';
  }
  protected chooseLanguage(): void {
    this.message.set('English is selected. Tamil and Sinhala translations are coming soon.');
  }
  protected submit(): void {
    if (this.mode === 'login') {
      if (this.loginStage() === 'otp') {
        this.verifyLoginOtp();
        return;
      }
      if (!this.email.trim() || !this.password) {
        this.message.set('Enter your email and password.');
        return;
      }
      this.loading.set(true);
      this.message.set('Checking your account…');
      this.auth
        .login(this.email.trim(), this.password)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (pending) => {
            this.challengeId = pending.challengeId;
            this.maskedEmail.set(pending.maskedEmail);
            this.code = '';
            this.loginStage.set('otp');
            this.message.set(`Enter the 6-digit code sent to ${pending.maskedEmail}.`);
          },
          error: (error) => this.message.set(apiErrorMessage(error)),
        });
    } else if (this.mode === 'register') {
      if (
        !this.name ||
        !this.email ||
        !this.phone ||
        !this.password ||
        this.password !== this.confirm
      ) {
        this.message.set('Complete all fields and ensure passwords match.');
        return;
      }
      const role: AppRole = this.loginTarget.startsWith('/organizer') ? 'Organizer' : 'Customer';
      this.loading.set(true);
      this.message.set('Creating your account…');
      this.auth
        .register({
          username: this.name.trim(),
          email: this.email.trim(),
          phoneNumber: this.phone.trim() || undefined,
          password: this.password,
          role,
          organizationName: role === 'Organizer' ? this.name.trim() : undefined,
        })
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: () => {
            this.message.set('Account created. Sign in to verify your email with OTP.');
            setTimeout(() => void this.router.navigateByUrl(`/login?role=${role.toLowerCase()}`), 900);
          },
          error: (error) => this.message.set(apiErrorMessage(error)),
        });
    } else {
      this.message.set('Password reset is not exposed by the current backend API. Contact an administrator.');
    }
  }

  protected resendLoginOtp(): void {
    if (!this.challengeId || this.loading()) return;
    this.loading.set(true);
    this.auth
      .resendOtp(this.challengeId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (pending) => {
          this.challengeId = pending.challengeId;
          this.maskedEmail.set(pending.maskedEmail);
          this.message.set(`A new code was sent to ${pending.maskedEmail}.`);
        },
        error: (error) => this.message.set(apiErrorMessage(error)),
      });
  }

  protected restartLogin(): void {
    this.loginStage.set('password');
    this.code = '';
    this.challengeId = '';
    this.message.set('');
  }

  private verifyLoginOtp(): void {
    if (!/^\d{6}$/.test(this.code)) {
      this.message.set('Enter the 6-digit OTP from your email.');
      return;
    }
    this.loading.set(true);
    this.message.set('Verifying code…');
    this.auth
      .verifyOtp(this.challengeId, this.code, this.remember())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (session) => {
          this.message.set('Login successful. Redirecting…');
          const rolePrefix = session.role === 'Admin' ? '/admin/' : session.role === 'Organizer' ? '/organizer/' : '/customer/';
          const destination = this.returnUrl?.startsWith(rolePrefix)
            ? this.returnUrl
            : this.auth.landingRoute(session.role);
          void this.router.navigateByUrl(destination);
        },
        error: (error) => this.message.set(apiErrorMessage(error)),
      });
  }
}
