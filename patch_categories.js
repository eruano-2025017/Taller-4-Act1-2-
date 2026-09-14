const fs = require("fs");
const p = "front/src/app/categories/categories.component.ts";
let c = fs.readFileSync(p, "utf8");
const impFrom = 'import { FormLivePreviewComponent } from "../shared/components/form-live-preview/form-live-preview.component";';
const impTo = impFrom +
  '\nimport { AppSidebarComponent } from "../shared/components/app-sidebar/app-sidebar.component";' +
  '\nimport { AppHeaderComponent } from "../shared/components/app-header/app-header.component";';
c = c.replace(impFrom, impTo);
c = c.replace(
  "imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, FormLivePreviewComponent],",
  "imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, FormLivePreviewComponent, AppSidebarComponent, AppHeaderComponent],"
);
fs.writeFileSync(p, c, "utf8");
console.log("patched", c.includes("AppSidebarComponent"), c.includes("AppHeaderComponent"));