import { Injectable, Component, OnInit, OnDestroy } from '@angular/core';
import { CloudAppSettingsService } from '@exlibris/exl-cloudapp-angular-lib';
import { TranslateService } from '@ngx-translate/core';
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

  settings: any = {
    "lang": "en"
  };
  saving = false;

  constructor(private translate: TranslateService, private settingsService: CloudAppSettingsService, private troveService: TroveService) { }

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
        this.translate.use(this.settings.lang);
      },
      complete: () => this.saving = false
    });
  }
}
