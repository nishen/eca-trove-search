import { Subscription, of } from "rxjs";
import { catchError, finalize, map, mergeMap, tap, toArray } from "rxjs/operators";
import { Component, OnInit, OnDestroy } from "@angular/core";
import {
    CloudAppRestService,
    CloudAppEventsService,
    PageInfo,
    EntityType,
    Entity
} from "@exlibris/exl-cloudapp-angular-lib";
import { TroveService } from "../trove.service";
import { connectableObservableDescriptor } from "rxjs/internal/observable/ConnectableObservable";

@Component({
    selector: "app-main",
    templateUrl: "./main.component.html",
    styleUrls: ["./main.component.scss"]
})
export class MainComponent implements OnInit, OnDestroy {
    private pageLoad$: Subscription;

    loading = false;

    enrichedEntities: any = null;

    troveAvailable: boolean = null;

    constructor(
        private restService: CloudAppRestService,
        private eventsService: CloudAppEventsService,
        private troveService: TroveService
    ) {}

    ngOnInit() {
        this.pageLoad$ = this.eventsService.onPageLoad(this.onPageLoad);
    }

    ngOnDestroy(): void {
        this.pageLoad$.unsubscribe();
    }

    onPageLoad = async (pageInfo: PageInfo) => {
        console.log("pageLoad", pageInfo);

        this.enrichedEntities = null;

        if (pageInfo.entities.length == 0) return;

        this.troveAvailable = await this.troveService.isAvailable();
        if (this.troveAvailable) this.enrichEntities(pageInfo.entities);
    };

    enrichEntities = (entities: Entity[]) => {
        if (entities.length == 0 || !this.troveAvailable || !this.validEntities(entities)) return;

        this.loading = true;
        of(entities)
            .pipe(
                map(this.enrichBase),
                map(this.enrichWithBibs),
                mergeMap((e) => e),
                map(this.enrichWithTroveData),
                mergeMap((e) => e),
                tap((e) => console.debug("entities+alma+trove:", e)),
                finalize(() => (this.loading = false))
            )
            .subscribe((e) => (this.enrichedEntities = e));
    };

    enrichBase = (entities: Entity[]) => {
        return entities.map((e) => {
            let result: any = Object.assign({}, e);
            result.source = e;
            if (e.type == EntityType.REQUEST) {
                result.requestId = e.id;
                result.id = e.link.replace(/\/bibs\//, "").replace(/\/requests.+/, "");
            }
            return result;
        });
    };

    enrichWithBibs = (entities: any[]) => {
        return this.restService.call(`/bibs?mms_id=${entities.map((e) => e.id).join(",")}&view=brief`).pipe(
            catchError(async (err) => {
                console.error("error with mmsids:", err);
                return await of(entities)
                    .pipe(
                        mergeMap((e) => e),
                        map((e) => e["id"]),
                        map(async (eid) => {
                            try {
                                const result = await this.restService
                                    .call(`/bibs?mms_id=${eid}&view=brief`)
                                    .toPromise();
                                return result;
                            } catch (err) {
                                return { bib: [] };
                            }
                        }),
                        mergeMap((e) => e),
                        toArray(),
                        map((ae) => {
                            let result = { bib: [] };
                            ae.filter((i) => i.bib.length > 0).forEach((i) => result.bib.push(i.bib[0]));
                            return result;
                        })
                    )
                    .toPromise();
            }),
            map((result) => {
                let items = {};
                result.bib.forEach((x) => Object.assign(items, { [x["mms_id"]]: x }));
                return items;
            }),
            map((result) => {
                entities.forEach((x) => Object.assign(x, result[x.id]));
                return entities;
            })
        );
    };

    enrichWithTroveData = async (entities: any[]) => {
        let requests = entities.map((e) => {
            const identifiers = this.extractIdentifier(e);
            return identifiers?.length > 0 ? this.troveService.searchTroveById(identifiers).toPromise() : null;
        });

        const responses = await Promise.all(requests);
        for (let x = 0; x < entities.length; x++) {
            entities[x].troveData = await this.troveService.createDisplayPackage(responses[x]);
        }

        return entities;
    };

    validEntities = (entities: Entity[]) => {
        return entities.every((e) => [EntityType.BIB_MMS, EntityType.REQUEST].includes(e.type));
    };

    extractIdentifier = (entity: any) => {
        if (entity == null) return [];
        const identifier: string = entity.issn ?? entity.isbn;
        if (identifier == null || identifier.trim() == "") return [];
        return identifier.replace(/[^0-9 X]/g, "").match(/([X\d]{13}|[X|\d]{10}|[X|\d]{8})/g);
    };
}
