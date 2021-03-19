import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TroveService {

  baseUrl = 'https://api.trove.nla.gov.au/v2';
  apiKey = '';

  constructor(private http: HttpClient) { }

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
