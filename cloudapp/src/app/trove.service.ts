import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CloudAppSettingsService } from '@exlibris/exl-cloudapp-angular-lib';
import { Subscription, Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TroveService {

  baseUrl = 'https://api.trove.nla.gov.au/v2';
  apiKey = null;

  public settingsSub: Subscription;

  constructor(private settingsService: CloudAppSettingsService, private http: HttpClient) {
    // get initial value. changes come through the settings subscription.
    this.settingsService.get().subscribe(settings => {
      this.apiKey = settings.troveAPIKey;
    });
  }

  updateSettings(settings: any) {
    console.log("updated settings:", settings);
    this.apiKey = settings.troveAPIKey;
  }

  isAvailable(): Observable<boolean> {
    if (this.apiKey == null || this.apiKey == "")
      return of(false);

    return this.http.get(`${this.baseUrl}/work/6255341?reclevel=brief&key=${this.apiKey}`)
      .pipe(
        catchError(err => {
          return throwError("unable to extract data from Trove: " + err.message);
        }),
        map(_ => true));
  }

  searchTroveById(id: string) {
    return this.http.get(`${this.baseUrl}/result?key=${this.apiKey}&zone=all&q=identifier:${id}`);
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
        z.records.work.forEach(w => {
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
