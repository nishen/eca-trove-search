import { Injectable, Component, OnInit, OnDestroy } from '@angular/core';
import { CloudAppSettingsService } from '@exlibris/exl-cloudapp-angular-lib';
import { TroveService } from '../trove.service';

@Injectable({
  providedIn: 'root'
})
@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {

  settings: any = {};
  saving = false;

  constructor(private settingsService: CloudAppSettingsService, private troveService: TroveService) { }

  ngOnInit(): void {
    this.settingsService.get().subscribe(s => {
      this.settings = s;
      this.troveService.updateSettings(s);
    });
  }

  ngOnDestroy(): void { }

  restore(): void {
    this.settingsService.get().subscribe(s => this.settings = s);
  }

  save() {
    this.saving = true;
    this.settingsService.set(this.settings).subscribe({
      next: _ => {
        console.debug("saving settings");
        this.troveService.updateSettings(this.settings);
      },
      complete: () => this.saving = false
    });
  }
}
