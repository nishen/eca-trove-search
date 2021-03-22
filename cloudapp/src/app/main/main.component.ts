import { forkJoin, Subscription, of } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  CloudAppRestService, CloudAppEventsService, AlertService, PageInfo, EntityType, Entity
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

  troveAvailable = false;

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

    this.enrichedEntities = null;

    this.troveService.isAvailable().subscribe(
      _ => {
        this.troveAvailable = true;
        this.enrichEntities(pageInfo.entities);
      },
      err => {
        this.troveAvailable = false;
        console.log("we're down: ", err)
      });
  }

  enrichEntities(entities: Entity[]) {
    if (entities.length == 0) return;

    this.enrichedEntities = entities;

    let valid = true;
    entities.forEach(e => {
      if (e.type !== EntityType.BIB_MMS) valid = false;
    });

    if (!valid) return;

    this.loading = true;

    this.restService.call<any>(`/bibs?mms_id=${entities.map(e => e.id).join(',')}&view=brief`)
      .pipe(
        map(result => {
          let items = {};
          result.bib.forEach(x => Object.assign(items, { [x["mms_id"]]: x }))
          return items;
        })
      ).subscribe(r => {
        this.enrichedEntities = entities.map(e => Object.assign(e, r[e.id]));
        console.log("enrichedEntities:", this.enrichedEntities);
        let troveRequests = [];
        this.enrichedEntities.forEach(entity => {
          const identifier = this.extractIdentifier(entity)
          if (identifier !== null)
            troveRequests.push(this.troveService.searchTroveById(identifier));
          else
            troveRequests.push(of(null));
        });

        forkJoin(troveRequests)
          .pipe(
            finalize(() => this.loading = false)
          ).subscribe(t => {
            const troveData = t.map(td => this.troveService.createDisplayPackage(td));
            for (let x = 0; x < this.enrichedEntities.length; x++) {
              this.enrichedEntities[x].troveData = troveData[x];
              this.enrichedEntities[x].source = entities[x];
            }
            console.debug("enrichedEntities:", this.enrichedEntities);
          });
      });
  }

  extractIdentifier(entity: any) {
    if (entity == null) return null;

    let identifier: string = null;

    if (entity.issn != null) identifier = entity.issn;
    else if (entity.isbn != null) identifier = entity.isbn;

    return (identifier == null) ? identifier : identifier.replace(/-/g, '').replace(/[^0-9].+/, '');
  }
}
