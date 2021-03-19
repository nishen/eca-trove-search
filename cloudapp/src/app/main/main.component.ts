import { forkJoin, Subscription, of } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  CloudAppRestService, CloudAppEventsService, AlertService, PageInfo, EntityType
} from '@exlibris/exl-cloudapp-angular-lib';
import { TroveService } from '../trove.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  private pageLoad$: Subscription;

  loading = false;

  enrichedEntities: any = null;

  troveData: any = null;

  constructor(
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    private alert: AlertService,
    private troveService: TroveService
  ) { }

  ngOnInit() {
    this.pageLoad$ = this.eventsService.onPageLoad(this.onPageLoad);
  }

  ngOnDestroy(): void {
    this.pageLoad$.unsubscribe();
  }

  onPageLoad = (pageInfo: PageInfo) => {
    console.log("pageLoad", pageInfo);

    this.troveData = null;
    this.enrichedEntities = null;

    if (pageInfo.entities.length == 0) return;

    let valid = true;
    pageInfo.entities.forEach(e => {
      if (e.type !== EntityType.BIB_MMS) valid = false;
    });

    if (!valid) return;

    this.loading = true;

    this.restService.call<any>(`/bibs?mms_id=${pageInfo.entities.map(e => e.id).join(',')}&view=brief`)
      .pipe(
        map(result => {
          let items = {};
          result.bib.forEach(x => Object.assign(items, { [x["mms_id"]]: x }))
          return items;
        })
      ).subscribe(r => {
        this.enrichedEntities = pageInfo.entities.map(e => r[e.id]);
        console.log("enrichedEntities:", this.enrichedEntities);
        let troveRequests = [];
        this.enrichedEntities.forEach(entity => {
          const identifier = this.extractIdentifier(entity)
          console.debug("identifier:", identifier);
          if (identifier !== null)
            troveRequests.push(this.troveService.searchTroveById(identifier));
          else
            troveRequests.push(of(null));
        });

        forkJoin(troveRequests)
          .pipe(
            finalize(() => this.loading = false)
          ).subscribe(t => {
            this.troveData = t.map(td => this.troveService.createDisplayPackage(td));
            console.debug("trovedata:", this.troveData);
          });
      });
  }

  //TODO: get a better identifier extraction/cleanup.
  extractIdentifier(entity: any) {
    if (entity == null) return null;

    const issn = entity.issn;
    const isbn = entity.isbn;

    let identifier: string = null;

    if (issn !== null) {
      identifier = issn;
      console.debug("issn", identifier);
    } else if (isbn != null) {
      identifier = isbn;
      console.debug("isbn", identifier);
    }

    if (identifier === null)
      return null;
    return identifier.replace(/-/g, '').replace(/[^0-9].+/, '');
  }
}
