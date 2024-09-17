import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { CloudAppSettingsService } from "@exlibris/exl-cloudapp-angular-lib";
import { of } from "rxjs";
import { filter, map, tap, mergeMap, catchError, toArray } from "rxjs/operators";
import jp from "jsonpath";

@Injectable({
    providedIn: "root"
})
export class TroveService {
    baseUrl = "https://api.trove.nla.gov.au/v3";
    baseUrlLibAU = "https://librariesaustralia.nla.gov.au/search/full";
    baseUrlOCLC = "https://www.worldcat.org/oclc";
    apiKey = null;

    constructor(private settingsService: CloudAppSettingsService, private http: HttpClient) {
        // get initial value. changes come through the settings subscription.
        this.settingsService.get().subscribe((settings) => {
            console.debug("initialised settings...");
            this.apiKey = settings.troveAPIKey == null || settings.troveAPIKey == "" ? null : settings.apiKey;
        });
    }

    updateSettings(settings: any) {
        console.debug("updated settings...");
        this.apiKey = settings.troveAPIKey;
    }

    async isAvailable() {
        if (this.apiKey == null) {
            const settings = await this.settingsService.get().toPromise();
            this.apiKey = settings.troveAPIKey;
        }

        let result = await this.http
            .get(`${this.baseUrl}/work/6255341?reclevel=brief&key=${this.apiKey}`)
            .pipe(
                catchError((err) => {
                    console.error("trove availability check error:", err);
                    return of(false);
                }),
                map((res) => (res == false ? false : true))
            )
            .toPromise();

        return result;
    }

    searchTroveById(id: string[]) {
        return this.http.get(
            `${this.baseUrl}/result?key=${this.apiKey}&category=all&include=workversions&q=identifier:(${id.join(
                " OR "
            )})`
        );
    }

    getWorkItem(id: string) {
        return this.http.get(`${this.baseUrl}/work/${id}?key=${this.apiKey}&reclevel=brief`);
    }

    createDisplayPackage = (troveResult: any) => {
        if (troveResult == null) return [];

        let foundIds = [];
        return of(jp.query(troveResult, "$.category[?(@.code != 'people')]..work"))
            .pipe(
                tap((i) => console.log("##:", i)),
                // unpack 2 layers
                mergeMap((i: any[]) => i),
                mergeMap((i: any[]) => i),
                // filter duplicate records
                filter((i) => !foundIds.includes(i["id"])),
                // track duplicate records
                tap((i) => console.log("#0:", i)),
                map((i) => {
                    foundIds.push(i["id"]);
                    return i;
                }),
                tap((i) => console.log("#1:", foundIds)),
                // make record structure consistent - sometimes object, sometimes array, so enforce array
                map((i) => {
                    jp.apply(i, "$.version[*]", (e) => {
                        e["record"] = Array.isArray(e.record) ? e["record"] : [e.record];
                        return e;
                    });
                    return i;
                }),
                tap((i) => console.log("#2:", i)),
                // add urls and identifiers to package
                map((i) => {
                    i["externalIds"] = jp.query(
                        i,
                        "$.version[*].record[*].metadata.dc.identifier[?(@.type == 'control number' && @.source)]"
                    );

                    const idsOclc = jp.query(
                        i,
                        "$.version[*].record[*].metadata.dc.identifier[?(@.type == 'control number' && @.source == 'OCoLC')]"
                    );
                    if (idsOclc.length > 0) i["oclcUrl"] = `${this.baseUrlOCLC}/${idsOclc[0].value}`;

                    const idsLibAU = jp.query(
                        i,
                        "$.version[*].record[*].metadata.dc.identifier[?(@.type == 'control number' && @.source == 'AuCNLKIN')]"
                    );
                    if (idsLibAU.length > 0) {
                        i[
                            "libAuHoldings"
                        ] = `${this.baseUrlLibAU}?dbid=nbd&resultsPage=results&sdbid=nbd&view=label&cq=AN:${idsLibAU[0].value}`;
                        i[
                            "libAuMARC"
                        ] = `${this.baseUrlLibAU}?dbid=nbd&resultsPage=results&sdbid=nbd&view=marc&cq=AN:${idsLibAU[0].value}`;
                    }

                    return i;
                }),
                tap((i) => console.log("#3:", i)),
                // collect records into an array
                toArray()
            )
            .toPromise();
    };
}
