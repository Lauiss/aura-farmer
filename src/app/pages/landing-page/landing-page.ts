import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActionBtn } from "../../components/action-btn/action-btn";

@Component({
  standalone: true,
  selector: 'app-landing-page',
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.scss'],
  imports: [RouterLink, ActionBtn]
})
export class LandingPage {}
