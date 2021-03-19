import { forkJoin, Subscription, of } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  CloudAppRestService, CloudAppEventsService, AlertService, PageInfo
} from '@exlibris/exl-cloudapp-angular-lib';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatRadioChange } from '@angular/material/radio';
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
    console.log("pageLoad");

    this.loading = true;
    this.troveData = null;
    this.enrichedEntities = null;

    let almaRequests = [];
    pageInfo.entities.forEach(e => almaRequests.push(this.restService.call<any>(e.link)));
    forkJoin(almaRequests)
      .subscribe(f => {
        this.enrichedEntities = f;
        console.log("enrichedEntities", this.enrichedEntities);

        let troveRequests = [];
        f.forEach(entity => {
          const identifier = this.extractIdentifier(entity)
          console.debug("identifier:", identifier);
          if (identifier !== null)
            troveRequests.push(this.troveService.searchTroveById(identifier));
          else 
            troveRequests.push(of(null));
        });

        forkJoin(troveRequests)
          .pipe(
            finalize(() => this.loading = false),
            tap(t => console.log(t))
          ).subscribe(t => {
            this.troveData = t.map(td => this.troveService.createDisplayPackage(td));
            console.log("trovedata:", this.troveData);
          });
      });
  }

  //TODO: get a better identifier extraction/cleanup.
  extractIdentifier(entity: any) {
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
