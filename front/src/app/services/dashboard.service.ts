import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { DashboardData, YearChartResponse } from "../shared/models/dashboard.model";

@Injectable({ providedIn: "root" })
export class DashboardService {
  constructor(private http: HttpClient) {}

  getDashboardData(year?: number): Observable<DashboardData> {
    let params = new HttpParams();
    if (year && !isNaN(year)) {
      params = params.set("year", year.toString());
    }
    return this.http.get<DashboardData>(`${environment.apiUrl}/dashboard`, { params });
  }

  getYearChart(year: number): Observable<YearChartResponse> {
    return this.http.get<YearChartResponse>(`${environment.apiUrl}/dashboard/chart`, {
      params: { year: year.toString() }
    });
  }
}

