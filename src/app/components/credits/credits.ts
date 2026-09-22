import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-credits',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './credits.html',
  styleUrl: './credits.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Credits {
  readonly prototypeUrl = 'https://lauiss.itch.io/chad-aura-farmer';
}
