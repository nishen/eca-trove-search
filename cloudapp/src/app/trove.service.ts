import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CloudAppSettingsService } from '@exlibris/exl-cloudapp-angular-lib';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TroveService {

  baseUrl = 'https://api.trove.nla.gov.au/v2';
  apiKey = null;

  constructor(private settingsService: CloudAppSettingsService, private http: HttpClient) {
    // get initial value. changes come through the settings subscription.
    this.settingsService.get().subscribe(settings => {
      console.log("initialised settings:", settings);
      this.apiKey = settings.troveAPIKey == null || settings.troveAPIKey == "" ? null : settings.apiKey;
      console.log("apikey:", this.apiKey);
    });
  }

  updateSettings(settings: any) {
    console.log("updated settings:", settings);
    this.apiKey = settings.troveAPIKey;
  }

  async isAvailable() {
    if (this.apiKey == null) {
      const settings = await this.settingsService.get().toPromise();
      this.apiKey = settings.troveAPIKey;
    }

    let result = await this.http.get(`${this.baseUrl}/work/6255341?reclevel=brief&key=${this.apiKey}`)
      .pipe(
        catchError(err => {
          console.error("trove availability check error:", err);
          return of(false);
        }),
        map(res => res == false ? false : true)).toPromise();

    return result;
  }

  searchTroveById(id: string[]) {
    return this.http.get(`${this.baseUrl}/result?key=${this.apiKey}&zone=all&q=identifier:(${id.join(" OR ")})`);
  }

  getWorkItem(id: string) {
    return this.http.get(`${this.baseUrl}/work/${id}?key=${this.apiKey}&reclevel=brief`);
  }

  createDisplayPackage(troveResult: any) {
    if (troveResult === null)
      return [];

    let result = [];

    let foundIds = [];
    troveResult.response.zone.forEach(z => {
      if (z.records.total > 0) {
        z.records.work?.forEach(w => {
          if (!foundIds.includes(w.id)) {
            result.push(w);
            foundIds.push(w.id);
          }
        });
      }
    });

    return result;
  }
}
