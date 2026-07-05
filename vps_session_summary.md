# Exhaustive Technical Architecture & Session Summary Report

This document provides a deep-dive technical breakdown of the architectural designs, code modifications, bug resolutions, and system administration procedures implemented for the **Restaurant OS** multi-tenant SaaS platform.

---

## 🏗️ 1. Multi-Tenant Architectural Overview

The platform uses a **Single Database, Shared-Schema Multi-Tenant Architecture** with dynamic subdomain resolution.

### A. Subdomain & Tenant Resolution Pipeline
The backend uses a NestJS middleware (`TenantResolverMiddleware`) to identify and bind the tenant context dynamically for every request:
1. **Header Identification**: The middleware inspects headers in order of priority:
   - `X-Tenant-Domain` (custom header forwarded by the Axios client).
   - `X-Forwarded-Host` (forwarded by Nginx proxy).
   - `Origin` / `Referer` headers.
   - `Host` header.
2. **Subdomain Parsing**: Subdomains are parsed using base domains (e.g. `.huespire.digital`, `.localhost`).
3. **Database Binding**: The middleware performs a PostgreSQL query through Prisma to find the matching `Restaurant` profile based on:
   - `domain` (for custom domains like `myrestaurant.com`).
   - `subdomain` (for tenant subdomains like `elitehotel.huespire.digital`).
4. **Context Injection**: Once resolved, the `restaurantId` is injected directly into the Express `Request` object, making it accessible to downstream controllers and guards via the `@CurrentUser()` decorator.

```
[ Client Request ]
       │
       ▼
 [ Nginx Proxy ] ── (Injects X-Forwarded-Host & X-Forwarded-Proto)
       │
       ▼
[ NestJS Middleware ] ── (Parses hostname, queries Database, binds Restaurant Context)
       │
       ▼
 [ Roles / Auth Guard ] ── (Validates user roles & checks admin gateway restrictions)
```

---

## 🛠️ 2. Deep Technical Breakdown of Changes

### A. Administrative Panel Lockdown (Super Admin Routing)
To guarantee administrative security, Super Admin portals are isolated from tenant subdomains.
* **Backend API Level (`RolesGuard`)**:
  - Implemented an administrative origin check triggered if the logged-in user is a `SUPER_ADMIN`.
  - Resolves the originating host and matches it against an allowed list: `admin.huespire.digital`, `admin.testing.huespire.digital`, `admin.localhost`, `localhost`, `127.0.0.1`.
  - Throws a `403 ForbiddenException` (*"Platform administration is restricted..."*) if accessed via tenant subdomains.
* **Frontend UI Level (`AdminLayout`)**:
  - Added a client-side React hook checking `window.location.hostname` on mount.
  - If the client is visiting the administrative interface on a tenant subdomain, it blocks component mounting and renders a custom **Access Restricted** layout directing the operator to the official gateway.

### B. Cascade Delete Hierarchy on Restaurant Purging
Deleting a tenant (Restaurant) in a relational database requires resolving foreign key dependencies in a specific order to avoid SQL constraint violations. We implemented a transactional delete sequence in `admin.service.ts`:
1. **Pivot Tables & Order/Billing Dependencies**:
   - `OrderItemVariant` & `OrderItemAddon` (clears order customizations).
   - `OrderItem` & `Order` (clears active/past dining orders).
   - `Bill` & `Coupon` (clears billing transactions).
2. **Menu Customizations & Structure**:
   - `MenuItemAddon` & `CategoryAddon` (clears menu relational associations).
   - `Addon` & `Variant` (clears custom attributes).
   - `MenuItem` & `Category` (clears item catalogs).
   - `MenuImage` (clears image metadata).
3. **Customer, Logging & Operational Tables**:
   - `Customer` (clears customer loyalty records).
   - `TableSession` & `Table` (clears dining tables and sessions).
   - `Notification` & `EmailLog` (clears communication history).
   - `AuditLog` & `User` (clears staff accounts and logs).
4. **Parent Record Purge**:
   - `Restaurant` (finally deletes the tenant).

*All operations are wrapped in a Prisma `$transaction` so that if any delete fails, the entire database rollbacks to keep data integral.*

### C. QR Code URL Generator & Scanned Redirects
* **Redirection Engine (`qr.service.ts`)**: 
  - Refactored `getRedirectionUrl` to fetch the base domain dynamically using the `APP_URL` environment configuration rather than hardcoding `.huespire.digital`.
  - Strips protocols and ports (`http://`, `https://`) to generate URLs like `https://[subdomain].[baseHost]:[port]/menu/[token]`. This dynamically supports staging (`testing.huespire.digital`) and production (`huespire.digital`).
* **Frontend Rendering (`qr/page.tsx`)**:
  - Corrected URL construction on the client-side QR list to prevent prefix doubling. If `window.location.host` already contains the subdomain prefix, it is stripped before rendering the scan link.

### D. Selective Bulk Menu Exporter
* **Controller Query Support (`menu-import.controller.ts`)**:
  - Modified `@Get("export")` to read a query parameter `?type=`.
* **Service Export Builders (`menu-import.service.ts`)**:
  - Implemented ExcelJS template worksheets. If `type` is specified (e.g. `categories`, `menu_items`, `variants`, `addons`), the Excel builder writes a single-sheet Excel template instead of the full 4-sheet unified book.
  - This allows developers and owners to export specific tables from one tenant and import them directly into another tenant workspace.

### E. Nullable Constraint Query Fix
* **Billing Service (`billing.service.ts`)**:
  - Replaced the query constraint `{ customerId: { not: null } }` on `prisma.order.findFirst`.
  - Because `customerId` is declared as a non-nullable `String` inside `schema.prisma`, Prisma 5 engine strictly prohibits checking `not: null` on fields that are physically incapable of being null, throwing a startup runtime exception. Removing this redundant constraint resolved the billing collection crashes.

---

## 🌐 3. Nginx Reverse Proxy Routing Reference

Below is the Nginx configuration template used to bind both frontend (port `3000`) and backend (port `5000`) applications:

```nginx
# 1. Frontend Proxy (Supports Wildcard Subdomains)
server {
    listen 80;
    server_name huespire.digital *.huespire.digital testing.huespire.digital *.testing.huespire.digital;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 2. Backend API & WebSockets Proxy
server {
    listen 80;
    server_name api.huespire.digital api-testing.huespire.digital;

    # Serve static uploads directly
    location /uploads/ {
        alias /home/ubuntu/Huespire_qr_os/apps/backend/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Handle Socket.io WebSockets
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## ⚡ 4. Essential VPS Commands Reference Cheat Sheet

Always navigate to `/home/ubuntu/Huespire_qr_os` before executing these commands.

### A. Deploy Updates & Rebuild
```bash
git pull origin main
npm run build
pm2 restart all
```

### B. Update Database Schema (Apply Migrations)
```bash
cd /home/ubuntu/Huespire_qr_os/apps/backend
npx prisma db push
pm2 restart all
```

### C. Reload Environment Variables in PM2
```bash
pm2 restart all --update-env
```

### D. Generate Certbot SSL for Tenant Subdomains
```bash
sudo certbot --nginx -d elitehotel.huespire.digital -d savisagar.huespire.digital
```

### E. Deduplicate/Re-Index Table Numbers per Restaurant
```bash
cd /home/ubuntu/Huespire_qr_os/apps/backend
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); async function main() { const tables = await prisma.table.findMany({ orderBy: [{ restaurantId: 'asc' }, { tableNumber: 'asc' }] }); const rIds = [...new Set(tables.map(t => t.restaurantId))]; for (const rId of rIds) { const rTables = tables.filter(t => t.restaurantId === rId); let idx = 1; for (const t of rTables) { await prisma.table.update({ where: { id: t.id }, data: { tableNumber: idx++ } }); } } console.log('Re-indexed successfully'); } main().finally(() => prisma.$disconnect());"
```
