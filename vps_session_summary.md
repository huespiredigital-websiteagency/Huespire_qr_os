# Session Summary & VPS Configuration Cheat Sheet

This file details all the optimizations, fixes, and changes applied to the **Restaurant OS** platform during this pairing session, along with a deployment command reference for your EC2 VPS.

---

## 🛠️ 1. Accomplished Updates & Bug Fixes

### A. Administrative Access Lockdown (Security)
* **Backend Guard (`RolesGuard`)**: Restricted all `SUPER_ADMIN` controller endpoints (`/admin/*`) from being called via tenant subdomains. The guard now blocks requests unless they originate from official administrative domains (e.g., `admin.huespire.digital`, `admin.testing.huespire.digital`, or `admin.localhost`).
* **Frontend Gatekeeper (`AdminLayout`)**: Integrated dynamic hostname checks. If a user tries to load `/admin/*` on a tenant subdomain (e.g. `savisagar.huespire.digital`), they are instantly shown a premium, branded **"Access Restricted"** screen redirecting them to the official admin gateway.

### B. Owner Login & Email Verification Bypass
* **Authentication Service (`auth.service.ts`)**: Commented out the strict rule requiring restaurant owners to verify their emails before accessing the control panel. This allows owners (like `naidu@gmail.com`) to sign in immediately after registration without configuring AWS SES first.

### C. QR Code Scanning & Double-Subdomain Fixes
* **Frontend QR Display (`qr/page.tsx`)**: Resolved a bug where the client was appending the subdomain to `window.location.host` (which already contains the subdomain in production), which produced doubled URLs like `elitehotel.elitehotel.huespire.digital`. It now dynamically strips the subdomain prefix if already present.
* **Backend Dynamic Resolver (`qr.service.ts`)**: Refactored the scanned URL generation logic to dynamically read the `APP_URL` environment variable. This ensures QR scans redirect to `https://[subdomain].huespire.digital` in production, `https://[subdomain].testing.huespire.digital` in staging, and `http://[subdomain].localhost:3000` in local development.

### D. Selective Bulk Menu Exporter
* **Backend Services (`menu-import.service.ts` & `menu-import.controller.ts`)**: Added support for a `type` query parameter on the export endpoint. 
* **Frontend UI (`import/page.tsx`)**: Replaced the "Export Current Menu" action button with a dropdown selector allowing owners to choose what to download:
  1. *Unified Excel (All sheets)*
  2. *Categories Only*
  3. *Menu Items Only*
  4. *Variants Only*
  5. *Add-ons Only*
  *These single-sheet exports match the bulk templates, allowing users to export menu structures from one account and upload them directly into another.*

### E. Cashier Billing Query Bug (Prisma 5 Fix)
* **Billing Service (`billing.service.ts`)**: Resolved a `400 Bad Request` / `500 Server Error` on the Cashier page. The code was querying `customerId: { not: null }`. Because the `Order` model schema defines `customerId` as a non-nullable field, Prisma 5 threw a validation error (`Argument 'not' must not be null`). Removed the redundant constraint.

---

## 📋 2. VPS Deployment & Configuration Cheat Sheet

Always execute these commands from your active project directory on the EC2 server: `/home/ubuntu/Huespire_qr_os`.

### A. Routine Code Pull & Build
To apply new updates pushed to GitHub:
```bash
cd /home/ubuntu/Huespire_qr_os
git pull origin main
npm run build
pm2 restart all
```

### B. Synchronizing Database Schema Changes
If the backend throws missing column errors (e.g. *primaryColor does not exist*):
```bash
cd /home/ubuntu/Huespire_qr_os/apps/backend
npx prisma db push
pm2 restart all
```

### C. Reloading Environment Configuration Changes
If you modify `/home/ubuntu/Huespire_qr_os/apps/backend/.env` (e.g. editing `APP_URL`), you must force PM2 to reload its environment variable cache:
```bash
pm2 restart all --update-env
```

### D. Manual User Email Verification (Direct Override)
To manually mark a user's email as verified in the database (bypassing the email confirmation check):
```bash
cd /home/ubuntu/Huespire_qr_os/apps/backend
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.updateMany({ where: { email: 'user@example.com' }, data: { emailVerified: true } }).then(console.log).finally(() => prisma.$disconnect());"
```

### E. Managing Dining Tables via Terminal
* **List all active tables**:
  ```bash
  cd /home/ubuntu/Huespire_qr_os/apps/backend
  node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.table.findMany({ include: { restaurant: true }, orderBy: [{ restaurantId: 'asc' }, { tableNumber: 'asc' }] }).then(ts => ts.forEach(t => console.log('Restaurant:', t.restaurant?.name, '| Table:', t.tableName, '| No:', t.tableNumber))).finally(() => prisma.$disconnect());"
  ```
* **Re-index table numbers sequentially (Fix duplicates)**:
  ```bash
  cd /home/ubuntu/Huespire_qr_os/apps/backend
  node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); async function main() { const tables = await prisma.table.findMany({ orderBy: [{ restaurantId: 'asc' }, { tableNumber: 'asc' }] }); const rIds = [...new Set(tables.map(t => t.restaurantId))]; for (const rId of rIds) { const rTables = tables.filter(t => t.restaurantId === rId); let idx = 1; for (const t of rTables) { await prisma.table.update({ where: { id: t.id }, data: { tableNumber: idx++ } }); } } console.log('Re-indexed successfully'); } main().finally(() => prisma.$disconnect());"
  ```
* **Completely empty all tables**:
  ```bash
  cd /home/ubuntu/Huespire_qr_os/apps/backend
  node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.table.deleteMany().then(console.log).finally(() => prisma.$disconnect());"
  ```
