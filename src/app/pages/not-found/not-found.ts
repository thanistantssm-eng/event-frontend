import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogo } from '../../shared/brand-logo/brand-logo';
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, BrandLogo],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFound {}
