import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { PlansModule } from "./plans/plans.module";
import { SubscriptionModule } from "./subscriptions/subscriptions.module";
import { RestaurantsModule } from "./restaurants/restaurants.module";
import { BranchesModule } from "./branches/branches.module";
import { RolesModule } from "./roles/roles.module";
import { StaffModule } from "./staff/staff.module";
import { UsersModule } from "./users/users.module";
import { TenantResolverMiddleware } from "./common/middleware/tenant-resolver.middleware";
import { TablesModule } from "./tables/tables.module";
import { QRModule } from "./qr/qr.module";
import { CategoriesModule } from "./categories/categories.module";
import { MenuItemsModule } from './menu-items/menu-items.module';
import { VariantsModule } from './variants/variants.module';
import { AddonsModule } from './addons/addons.module';
import { MenuImagesModule } from './menu-images/menu-images.module';
import { CustomerModule } from "./customer/customer.module";
import { MenuImportModule } from "./menu-import/menu-import.module";
import { BillingModule } from "./billing/billing.module";
import { KitchenModule } from "./kitchen/kitchen.module";
import { WaiterModule } from "./waiter/waiter.module";
import { EventsModule } from "./events/events.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    PlansModule,
    SubscriptionModule,
    RestaurantsModule,
    BranchesModule,
    RolesModule,
    StaffModule,
    UsersModule,
    TablesModule,
    QRModule,
    CategoriesModule,
    MenuItemsModule,
    VariantsModule,
    AddonsModule,
    MenuImagesModule,
    CustomerModule,
    MenuImportModule,
    BillingModule,
    KitchenModule,
    WaiterModule,
    EventsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply TenantResolverMiddleware to all controllers except global platform operations
    consumer
      .apply(TenantResolverMiddleware)
      .exclude(
        "auth/register", 
        "auth/login", 
        "plans", 
        "plans/(.*)", 
        "roles",
        "qr/validate/(.*)",
        "qr/image/(.*)",
        "qr/scan/(.*)",
        "qr/code/(.*)",
        "customer",
        "customer/(.*)"
      ) // Global bypasses
      .forRoutes("*");
  }
}

