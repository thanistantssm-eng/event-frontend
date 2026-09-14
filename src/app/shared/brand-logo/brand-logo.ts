import { Component } from '@angular/core';

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  template: '<img src="/assets/eventpark-logo-256.png" alt="" aria-hidden="true" width="256" height="256" />',
  styles: `
    :host {
      width: var(--brand-logo-size, 42px);
      height: var(--brand-logo-size, 42px);
      flex: 0 0 auto;
      display: grid;
      place-items: center;
      overflow: hidden;
      border-radius: 13px;
      background: linear-gradient(145deg, #028991, #02597b 58%, #0d2d53);
      box-shadow: 0 9px 22px rgba(13, 45, 83, 0.22);
    }

    img {
      width: 114%;
      height: 114%;
      object-fit: contain;
    }
  `,
})
export class BrandLogo {}
