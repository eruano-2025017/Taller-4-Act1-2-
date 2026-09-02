import { Component, OnInit, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { SessionWarningModalComponent } from "./shared/components/session-warning-modal/session-warning-modal.component";
import { IdleSessionService } from "./services/idle-session.service";
import { AuthService } from "./services/auth.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, SessionWarningModalComponent],
  template: `
    <router-outlet></router-outlet>
    <app-session-warning-modal></app-session-warning-modal>
  `,
})
export class AppComponent implements OnInit {
  private idleSession = inject(IdleSessionService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    if (this.authService.estaAutenticado()) {
      this.idleSession.iniciarMonitoreo();
    }
  }
}

