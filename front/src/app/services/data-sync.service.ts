import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DataSyncService {
  /** Incremented after every CRUD operation on incomes/expenses */
  private _version = signal<number>(0);
  
  /** Observable version counter - dashboard watches this */
  readonly version = this._version.asReadonly();

  /** Call after any successful create/update/delete */
  notifyChange(): void {
    this._version.update(v => v + 1);
  }
}
