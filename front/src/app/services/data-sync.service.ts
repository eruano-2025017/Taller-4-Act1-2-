import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DataSyncService {
  /** Incremented after every CRUD operation on incomes/expenses */
  private _version = signal<number>(0);
  private _syncSubject = new Subject<void>();
  
  /** Observable version counter - dashboard watches this */
  readonly version = this._version.asReadonly();
  readonly sync$ = this._syncSubject.asObservable();

  /** Call after any successful create/update/delete */
  notifyChange(): void {
    this._version.update(v => v + 1);
    this._syncSubject.next();
  }
}
