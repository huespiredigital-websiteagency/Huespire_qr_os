import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";

import { NestExpressApplication } from "@nestjs/platform-express";
import * as path from "path";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT") || 5000;

  // Configure CORS
  app.enableCors({
    origin: "*", // Adjust in production to frontend url
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  // Serve static files
  const publicPath = __dirname.includes('dist')
    ? path.join(__dirname, '..', '..', 'public')
    : path.join(__dirname, '..', 'public');
  app.useStaticAssets(publicPath);

  // Global pipes & filters
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Configure Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Restaurant OS SaaS Platform API")
    .setDescription("The core multi-tenant API backend documentation for Restaurant OS.")
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      "access-token",
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);
  console.log(`Swagger documentation is available at: http://localhost:${port}/api/docs`);
}

bootstrap();
