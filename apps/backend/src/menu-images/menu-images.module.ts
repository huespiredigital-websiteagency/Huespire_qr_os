import { Module } from "@nestjs/common";
import { MenuImagesController } from "./menu-images.controller";
import { MenuImagesService } from "./menu-images.service";
import { PrismaModule } from "../prisma/prisma.module";
import { MulterModule } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import * as fs from "fs";

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = "./public/uploads";
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new Error("Only image files (jpg, jpeg, png, webp) are allowed"), false);
        }
        cb(null, true);
      },
    }),
  ],
  controllers: [MenuImagesController],
  providers: [MenuImagesService],
  exports: [MenuImagesService],
})
export class MenuImagesModule {}
