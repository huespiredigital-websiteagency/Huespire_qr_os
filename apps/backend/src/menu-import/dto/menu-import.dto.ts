import { IsEnum, IsOptional } from "class-validator";

export enum ImportType {
  CATEGORIES = "categories",
  MENU_ITEMS = "menu-items",
  VARIANTS = "variants",
  ADDONS = "addons",
  UNIFIED = "unified"
}

export enum ImportMode {
  STRICT = "strict",
  PARTIAL = "partial"
}

export class ValidateImportQueryDto {
  @IsEnum(ImportType)
  type: ImportType;

  @IsEnum(ImportMode)
  @IsOptional()
  mode?: ImportMode;
}

export class ExecuteImportQueryDto {
  @IsEnum(ImportType)
  type: ImportType;

  @IsEnum(ImportMode)
  @IsOptional()
  mode?: ImportMode;
}
