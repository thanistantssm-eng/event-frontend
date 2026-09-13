import { Component, effect, input, signal } from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-qr-visual',
  standalone: true,
  template: `
    @if (dataUrl()) {
      <img [src]="dataUrl()" [alt]="label()" />
    } @else {
      <span>Generating secure QR…</span>
    }
  `,
  styles: `
    :host{width:232px;min-height:232px;padding:6px;display:grid;place-items:center;border:1px solid #e4e7ec;border-radius:18px;background:#fff;box-shadow:0 14px 34px rgba(16,24,40,.1)}
    img{width:220px;height:220px;display:block;border-radius:12px;image-rendering:pixelated}
    span{color:#667085;font-size:12px}
  `,
})
export class QrVisual {
  readonly value = input.required<string>();
  readonly label = input('Scannable QR code');
  protected readonly dataUrl = signal('');

  constructor() {
    effect(() => {
      const value = this.value();
      if (!value) {
        this.dataUrl.set('');
        return;
      }
      void QRCode.toDataURL(value, {
        width: 440,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#101828', light: '#ffffff' },
      }).then((url) => this.dataUrl.set(url));
    });
  }
}
