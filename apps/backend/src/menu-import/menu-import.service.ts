import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as ExcelJS from "exceljs";
import { Readable } from "stream";
import { ImportMode } from "./dto/menu-import.dto";

export interface RowError {
  sheet: string;
  row: number;
  column: string;
  value: string;
  reason: string;
  suggestion?: string;
  status?: "Skipped" | "Failed";
}

@Injectable()
export class MenuImportService {
  private readonly logger = new Logger(MenuImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  private normalizeString(str: string): string {
    if (!str) return "";
    return String(str)
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .toLowerCase()
      .replace(/&/g, " and ")         // convert & to 'and'
      .replace(/[-_]/g, " ")          // convert - and _ to space
      .replace(/[^a-z0-9\s]/g, "")    // remove other special punctuation
      .replace(/\s+/g, " ")           // collapse multiple spaces
      .trim();
  }

  private cleanNumeric(val: any): number {
    if (val === null || val === undefined || val === "") return NaN;
    if (typeof val === "number") return val;
    const str = String(val).replace(/[^0-9.-]/g, "");
    if (str === "" || str === ".") return NaN;
    const num = parseFloat(str);
    return isNaN(num) ? NaN : num;
  }

  private cleanInt(val: any, defaultVal: number = 15): number {
    if (val === null || val === undefined || val === "") return defaultVal;
    if (typeof val === "number") return Math.round(val);
    const str = String(val).replace(/[^0-9]/g, "");
    if (str === "") return defaultVal;
    const num = parseInt(str, 10);
    return isNaN(num) ? defaultVal : num;
  }

  private getCellValue(cell: ExcelJS.Cell): string {
    if (!cell || cell.value === null || cell.value === undefined) return "";
    if (typeof cell.value === "object") {
      if ("result" in cell.value) {
        return String(cell.value.result ?? "");
      }
      if ("richText" in cell.value) {
        return (cell.value.richText as any[])?.map((t: any) => t.text).join("") ?? "";
      }
      if ("text" in cell.value) {
        return String((cell.value as any).text ?? "");
      }
    }
    return String(cell.value);
  }

  private getHeaderColMap(sheet: ExcelJS.Worksheet): Map<string, number> {
    const colMap = new Map<string, number>();
    const headerRow = sheet.getRow(1);
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const val = this.normalizeString(this.getCellValue(cell));
      if (val) colMap.set(val, colNumber);
    });
    return colMap;
  }

  private findColVal(row: ExcelJS.Row, colMap: Map<string, number>, possibleHeaders: string[], fallbackCol: number): string {
    for (const h of possibleHeaders) {
      const colNum = colMap.get(this.normalizeString(h));
      if (colNum) {
        return this.getCellValue(row.getCell(colNum)).trim();
      }
    }
    return this.getCellValue(row.getCell(fallbackCol)).trim();
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  private getFuzzySuggestion(target: string, candidatesMap: Map<string, string>): string {
    if (!target || candidatesMap.size === 0) return "";
    const normTarget = this.normalizeString(target);
    let bestMatch = "";
    let minDistance = Infinity;

    for (const [normCand, rawCand] of candidatesMap.entries()) {
      const dist = this.levenshteinDistance(normTarget, normCand);
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = rawCand;
      }
    }

    if (minDistance <= Math.max(3, Math.floor(normTarget.length / 2))) {
      return bestMatch;
    }
    return "";
  }

  private logLookupResult(sheet: string, row: number, column: string, originalValue: string, normVal: string, matchedVal: string | null, reason: string) {
    this.logger.warn(
      `[Import Lookup Log] Sheet: ${sheet} | Row: #${row} | Col: ${column} | Original Excel Value: "${originalValue}" -> Normalized Value: "${normVal}" -> Matched DB Value: ${matchedVal ? `"${matchedVal}"` : "None"} -> Reason: ${reason}`
    );
  }

  async generateTemplate(type: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Template");

    if (type === "categories") {
      sheet.columns = [
        { header: "Name", key: "name", width: 25 },
        { header: "Description", key: "description", width: 35 }
      ];
      sheet.addRow({ name: "Starters", description: "Appetizers and snacks" });
      sheet.addRow({ name: "Main Course", description: "Main dishes" });
      sheet.addRow({ name: "Beverages", description: "Drinks" });
      sheet.addRow({ name: "Desserts", description: "Sweet dishes" });
    } else if (type === "menu-items") {
      sheet.columns = [
        { header: "Category", key: "category", width: 25 },
        { header: "Name", key: "name", width: 25 },
        { header: "Description", key: "description", width: 35 },
        { header: "Price", key: "price", width: 12 },
        { header: "Preparation Time (mins)", key: "preparationTime", width: 22 }
      ];
      sheet.addRow({
        category: "Pizza",
        name: "Margherita Pizza",
        description: "Classic cheese pizza",
        price: 299,
        preparationTime: 15
      });
      sheet.addRow({
        category: "Pizza",
        name: "Veg Supreme",
        description: "Loaded vegetable pizza",
        price: 399,
        preparationTime: 20
      });
      sheet.addRow({
        category: "Biryani",
        name: "Chicken Biryani",
        description: "Hyderabadi style",
        price: 350,
        preparationTime: 25
      });
    } else if (type === "variants") {
      sheet.columns = [
        { header: "Menu Item", key: "menuItem", width: 25 },
        { header: "Variant Name", key: "variantName", width: 20 },
        { header: "Price", key: "price", width: 12 }
      ];
      sheet.addRow({ menuItem: "Margherita Pizza", variantName: "Small", price: 199 });
      sheet.addRow({ menuItem: "Margherita Pizza", variantName: "Medium", price: 299 });
      sheet.addRow({ menuItem: "Margherita Pizza", variantName: "Large", price: 399 });
      sheet.addRow({ menuItem: "Coke", variantName: "250 ml", price: 40 });
      sheet.addRow({ menuItem: "Coke", variantName: "500 ml", price: 70 });
    } else if (type === "addons") {
      sheet.columns = [
        { header: "Name", key: "name", width: 25 },
        { header: "Price", key: "price", width: 12 },
        { header: "Categories (optional)", key: "categories", width: 30 },
        { header: "Menu Items (optional)", key: "menuItems", width: 35 }
      ];
      sheet.addRow({ name: "Extra Cheese", price: 50, categories: "Pizza,Burger", menuItems: "" });
      sheet.addRow({ name: "Extra Sauce", price: 20, categories: "", menuItems: "Chicken Burger,Veg Burger" });
      sheet.addRow({ name: "Boiled Egg", price: 30, categories: "Biryani", menuItems: "" });
      sheet.addRow({ name: "Raita", price: 25, categories: "Biryani", menuItems: "" });
    } else {
      throw new BadRequestException("Invalid template type");
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async parseFile(
    fileBuffer: Buffer,
    isCsv: boolean,
    type: string
  ): Promise<Record<string, any[]>> {
    const workbook = new ExcelJS.Workbook();
    if (isCsv) {
      const stream = Readable.from(fileBuffer);
      await workbook.csv.read(stream);
    } else {
      await workbook.xlsx.load(fileBuffer as any);
    }

    const result: Record<string, any[]> = {
      categories: [],
      menuItems: [],
      variants: [],
      addons: []
    };

    if (type === "unified" && !isCsv) {
      const catSheet = workbook.getWorksheet("Categories");
      const itemSheet = workbook.getWorksheet("Menu Items");
      const varSheet = workbook.getWorksheet("Variants");
      const addonSheet = workbook.getWorksheet("Add-ons");

      if (catSheet) result.categories = this.parseCategoriesSheet(catSheet);
      if (itemSheet) result.menuItems = this.parseMenuItemsSheet(itemSheet);
      if (varSheet) result.variants = this.parseVariantsSheet(varSheet);
      if (addonSheet) result.addons = this.parseAddonsSheet(addonSheet);
    } else {
      const sheet = workbook.getWorksheet(1);
      if (!sheet) {
        throw new BadRequestException("The uploaded file does not contain any worksheets.");
      }

      if (type === "categories") {
        result.categories = this.parseCategoriesSheet(sheet);
      } else if (type === "menu-items") {
        result.menuItems = this.parseMenuItemsSheet(sheet);
      } else if (type === "variants") {
        result.variants = this.parseVariantsSheet(sheet);
      } else if (type === "addons") {
        result.addons = this.parseAddonsSheet(sheet);
      } else {
        throw new BadRequestException("Invalid import type configuration.");
      }
    }

    return result;
  }

  private parseCategoriesSheet(sheet: ExcelJS.Worksheet): any[] {
    const data: any[] = [];
    const colMap = this.getHeaderColMap(sheet);

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const name = this.findColVal(row, colMap, ["name", "category name", "category"], 1);
      if (!name) return;

      data.push({
        rowIndex: rowNumber,
        name,
        description: this.findColVal(row, colMap, ["description", "desc"], 2) || null
      });
    });
    return data;
  }

  private parseMenuItemsSheet(sheet: ExcelJS.Worksheet): any[] {
    const data: any[] = [];
    const colMap = this.getHeaderColMap(sheet);

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const categoryName = this.findColVal(row, colMap, ["category", "category name", "cat"], 1);
      const name = this.findColVal(row, colMap, ["name", "menu item", "item name", "item"], 2);
      if (!name && !categoryName) return;

      const rawPrice = this.findColVal(row, colMap, ["price", "cost", "rate", "amount"], 4);
      const rawPrepTime = this.findColVal(row, colMap, ["preparation time (mins)", "preparation time", "prep time", "time"], 5);

      data.push({
        rowIndex: rowNumber,
        categoryName,
        name,
        description: this.findColVal(row, colMap, ["description", "desc"], 3) || null,
        price: this.cleanNumeric(rawPrice),
        preparationTime: this.cleanInt(rawPrepTime, 15)
      });
    });
    return data;
  }

  private parseVariantsSheet(sheet: ExcelJS.Worksheet): any[] {
    const data: any[] = [];
    const colMap = this.getHeaderColMap(sheet);

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const menuItemName = this.findColVal(row, colMap, ["menu item", "item name", "menuitem"], 1);
      const name = this.findColVal(row, colMap, ["variant name", "variant", "name", "size"], 2);
      if (!name && !menuItemName) return;

      const rawPrice = this.findColVal(row, colMap, ["price", "cost", "rate", "amount"], 3);

      data.push({
        rowIndex: rowNumber,
        menuItemName,
        name,
        price: this.cleanNumeric(rawPrice)
      });
    });
    return data;
  }

  private parseAddonsSheet(sheet: ExcelJS.Worksheet): any[] {
    const data: any[] = [];
    const colMap = this.getHeaderColMap(sheet);

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const name = this.findColVal(row, colMap, ["name", "addon name", "add-on name", "addon"], 1);
      if (!name) return;

      const rawPrice = this.findColVal(row, colMap, ["price", "cost", "rate", "amount"], 2);
      const categoriesStr = this.findColVal(row, colMap, ["categories (optional)", "categories", "category"], 3);
      const menuItemsStr = this.findColVal(row, colMap, ["menu items (optional)", "menu items", "menu item", "items"], 4);

      data.push({
        rowIndex: rowNumber,
        name,
        price: this.cleanNumeric(rawPrice),
        categoriesStr,
        menuItemsStr
      });
    });
    return data;
  }

  async validate(
    restaurantId: string,
    parsedData: Record<string, any[]>
  ): Promise<{ errors: RowError[]; preview: Record<string, any> }> {
    const errors: RowError[] = [];
    const preview = {
      categories: { create: 0, update: 0 },
      menuItems: { create: 0, update: 0 },
      variants: { create: 0, update: 0 },
      addons: { create: 0, update: 0 }
    };

    const [dbCategories, dbMenuItems, dbAddons] = await Promise.all([
      this.prisma.category.findMany({ where: { restaurantId, deletedAt: null } }),
      this.prisma.menuItem.findMany({ where: { restaurantId, deletedAt: null } }),
      this.prisma.addon.findMany({ where: { restaurantId } })
    ]);

    const catMap = new Map<string, string>();
    dbCategories.forEach(c => catMap.set(this.normalizeString(c.name), c.name));

    const itemMap = new Map<string, string>();
    dbMenuItems.forEach(i => itemMap.set(this.normalizeString(i.name), i.name));

    const addonMap = new Map<string, string>();
    dbAddons.forEach(a => addonMap.set(this.normalizeString(a.name), a.name));

    parsedData.categories.forEach(c => {
      if (c.name) catMap.set(this.normalizeString(c.name), c.name);
    });
    parsedData.menuItems.forEach(i => {
      if (i.name) itemMap.set(this.normalizeString(i.name), i.name);
    });

    // 1. Validate Categories
    const categorySheetUnique = new Set<string>();
    for (const cat of parsedData.categories) {
      const normName = this.normalizeString(cat.name);
      if (!cat.name) {
        const err: RowError = {
          sheet: "Categories",
          row: cat.rowIndex,
          column: "Name",
          value: "",
          reason: "Category Name is required.",
          status: "Failed"
        };
        errors.push(err);
        this.logLookupResult("Categories", cat.rowIndex, "Name", "", normName, null, err.reason);
      } else if (categorySheetUnique.has(normName)) {
        const err: RowError = {
          sheet: "Categories",
          row: cat.rowIndex,
          column: "Name",
          value: cat.name,
          reason: `Duplicate category name '${cat.name}' in file.`,
          status: "Failed"
        };
        errors.push(err);
        this.logLookupResult("Categories", cat.rowIndex, "Name", cat.name, normName, null, err.reason);
      }
      if (normName) categorySheetUnique.add(normName);

      const isExisting = dbCategories.some(c => this.normalizeString(c.name) === normName);
      if (isExisting) {
        preview.categories.update++;
      } else {
        preview.categories.create++;
      }
    }

    // 2. Validate Menu Items
    const itemSheetUnique = new Set<string>();
    for (const item of parsedData.menuItems) {
      const normCat = this.normalizeString(item.categoryName);
      const normName = this.normalizeString(item.name);
      const itemKey = `${normCat}_${normName}`;

      if (!item.categoryName) {
        const err: RowError = {
          sheet: "Menu Items",
          row: item.rowIndex,
          column: "Category",
          value: "",
          reason: "Category is required.",
          status: "Failed"
        };
        errors.push(err);
        this.logLookupResult("Menu Items", item.rowIndex, "Category", "", normCat, null, err.reason);
      } else if (!catMap.has(normCat)) {
        const suggestion = this.getFuzzySuggestion(item.categoryName, catMap);
        const matchedVal = catMap.get(normCat) || null;
        const err: RowError = {
          sheet: "Menu Items",
          row: item.rowIndex,
          column: "Category",
          value: item.categoryName,
          reason: "Category could not be matched",
          suggestion: suggestion ? `Verify category exists or check normalization. Did you mean: ${suggestion}?` : "Verify category exists in spreadsheet or database",
          status: "Failed"
        };
        errors.push(err);
        this.logLookupResult("Menu Items", item.rowIndex, "Category", item.categoryName, normCat, matchedVal, err.reason);
      }

      if (!item.name) {
        const err: RowError = {
          sheet: "Menu Items",
          row: item.rowIndex,
          column: "Name",
          value: "",
          reason: "Name is required.",
          status: "Failed"
        };
        errors.push(err);
        this.logLookupResult("Menu Items", item.rowIndex, "Name", "", normName, null, err.reason);
      } else if (itemSheetUnique.has(itemKey)) {
        const err: RowError = {
          sheet: "Menu Items",
          row: item.rowIndex,
          column: "Name",
          value: item.name,
          reason: `Duplicate item name '${item.name}' under category '${item.categoryName}' in file.`,
          status: "Failed"
        };
        errors.push(err);
        this.logLookupResult("Menu Items", item.rowIndex, "Name", item.name, normName, null, err.reason);
      }
      if (normName) itemSheetUnique.add(itemKey);

      if (isNaN(item.price) || item.price < 0) {
        const err: RowError = {
          sheet: "Menu Items",
          row: item.rowIndex,
          column: "Price",
          value: String(item.price ?? ""),
          reason: "Price must be a valid, non-negative number.",
          status: "Failed"
        };
        errors.push(err);
      }

      if (isNaN(item.preparationTime) || item.preparationTime < 0) {
        const err: RowError = {
          sheet: "Menu Items",
          row: item.rowIndex,
          column: "Preparation Time",
          value: String(item.preparationTime ?? ""),
          reason: "Preparation Time must be a valid, non-negative number.",
          status: "Failed"
        };
        errors.push(err);
      }

      const isExisting = dbMenuItems.some(i => this.normalizeString(i.name) === normName);
      if (isExisting) {
        preview.menuItems.update++;
      } else {
        preview.menuItems.create++;
      }
    }

    // 3. Validate Variants
    const variantSheetUnique = new Set<string>();
    for (const v of parsedData.variants) {
      const normItem = this.normalizeString(v.menuItemName);
      const normName = this.normalizeString(v.name);
      const variantKey = `${normItem}_${normName}`;

      if (!v.menuItemName) {
        const err: RowError = {
          sheet: "Variants",
          row: v.rowIndex,
          column: "Menu Item",
          value: "",
          reason: "Menu Item is required.",
          status: "Failed"
        };
        errors.push(err);
        this.logLookupResult("Variants", v.rowIndex, "Menu Item", "", normItem, null, err.reason);
      } else if (!itemMap.has(normItem)) {
        const suggestion = this.getFuzzySuggestion(v.menuItemName, itemMap);
        const matchedVal = itemMap.get(normItem) || null;
        const err: RowError = {
          sheet: "Variants",
          row: v.rowIndex,
          column: "Menu Item",
          value: v.menuItemName,
          reason: "Menu Item could not be matched",
          suggestion: suggestion ? `Verify menu item exists. Did you mean: ${suggestion}?` : "Verify menu item exists in spreadsheet or database",
          status: "Failed"
        };
        errors.push(err);
        this.logLookupResult("Variants", v.rowIndex, "Menu Item", v.menuItemName, normItem, matchedVal, err.reason);
      }

      if (!v.name) {
        const err: RowError = {
          sheet: "Variants",
          row: v.rowIndex,
          column: "Variant Name",
          value: "",
          reason: "Variant Name is required.",
          status: "Failed"
        };
        errors.push(err);
      }

      if (isNaN(v.price) || v.price < 0) {
        const err: RowError = {
          sheet: "Variants",
          row: v.rowIndex,
          column: "Price",
          value: String(v.price ?? ""),
          reason: "Price must be a valid, non-negative number.",
          status: "Failed"
        };
        errors.push(err);
      }

      if (variantSheetUnique.has(variantKey)) {
        const err: RowError = {
          sheet: "Variants",
          row: v.rowIndex,
          column: "Variant Name",
          value: v.name,
          reason: `Duplicate variant name '${v.name}' for item '${v.menuItemName}' in file.`,
          status: "Failed"
        };
        errors.push(err);
      }
      if (normName) variantSheetUnique.add(variantKey);

      const dbItem = dbMenuItems.find(i => this.normalizeString(i.name) === normItem);
      let isExistingVariant = false;
      if (dbItem) {
        const dbVariants = await this.prisma.variant.findMany({ where: { menuItemId: dbItem.id } });
        isExistingVariant = dbVariants.some(dbV => this.normalizeString(dbV.name) === normName);
      }

      if (isExistingVariant) {
        preview.variants.update++;
      } else {
        preview.variants.create++;
      }
    }

    // 4. Validate Add-ons
    const addonSheetUnique = new Set<string>();
    for (const addon of parsedData.addons) {
      const normName = this.normalizeString(addon.name);
      if (!addon.name) {
        const err: RowError = {
          sheet: "Add-ons",
          row: addon.rowIndex,
          column: "Name",
          value: "",
          reason: "Name is required.",
          status: "Failed"
        };
        errors.push(err);
      } else if (addonSheetUnique.has(normName)) {
        const err: RowError = {
          sheet: "Add-ons",
          row: addon.rowIndex,
          column: "Name",
          value: addon.name,
          reason: `Duplicate add-on name '${addon.name}' in file.`,
          status: "Failed"
        };
        errors.push(err);
      }
      if (normName) addonSheetUnique.add(normName);

      if (isNaN(addon.price) || addon.price < 0) {
        const err: RowError = {
          sheet: "Add-ons",
          row: addon.rowIndex,
          column: "Price",
          value: String(addon.price ?? ""),
          reason: "Price must be a valid, non-negative number.",
          status: "Failed"
        };
        errors.push(err);
      }

      const cats = addon.categoriesStr ? addon.categoriesStr.split(",").map((c: string) => c.trim()).filter(Boolean) : [];
      const items = addon.menuItemsStr ? addon.menuItemsStr.split(",").map((i: string) => i.trim()).filter(Boolean) : [];

      if (cats.length === 0 && items.length === 0) {
        const err: RowError = {
          sheet: "Add-ons",
          row: addon.rowIndex,
          column: "Categories / Menu Items",
          value: "",
          reason: "At least one of 'Categories' or 'Menu Items' must be provided.",
          status: "Failed"
        };
        errors.push(err);
      }

      for (const catName of cats) {
        const normC = this.normalizeString(catName);
        if (!catMap.has(normC)) {
          const suggestion = this.getFuzzySuggestion(catName, catMap);
          const matchedVal = catMap.get(normC) || null;
          const err: RowError = {
            sheet: "Add-ons",
            row: addon.rowIndex,
            column: "Categories",
            value: catName,
            reason: "Category not found",
            suggestion: suggestion ? `Verify category exists. Did you mean: ${suggestion}?` : "Verify category exists in spreadsheet or database",
            status: "Failed"
          };
          errors.push(err);
          this.logLookupResult("Add-ons", addon.rowIndex, "Categories", catName, normC, matchedVal, err.reason);
        }
      }

      for (const itemName of items) {
        const normI = this.normalizeString(itemName);
        if (!itemMap.has(normI)) {
          const suggestion = this.getFuzzySuggestion(itemName, itemMap);
          const matchedVal = itemMap.get(normI) || null;
          const err: RowError = {
            sheet: "Add-ons",
            row: addon.rowIndex,
            column: "Menu Items",
            value: itemName,
            reason: "Menu Item not found",
            suggestion: suggestion ? `Verify menu item exists. Did you mean: ${suggestion}?` : "Verify menu item exists in spreadsheet or database",
            status: "Failed"
          };
          errors.push(err);
          this.logLookupResult("Add-ons", addon.rowIndex, "Menu Items", itemName, normI, matchedVal, err.reason);
        }
      }

      const isExisting = dbAddons.some(a => this.normalizeString(a.name) === normName);
      if (isExisting) {
        preview.addons.update++;
      } else {
        preview.addons.create++;
      }
    }

    return { errors, preview };
  }

  async executeImport(
    restaurantId: string,
    parsedData: Record<string, any[]>,
    mode: ImportMode = ImportMode.STRICT
  ): Promise<{
    success: boolean;
    mode: ImportMode;
    processingTimeMs: number;
    summary: Record<string, { create: number; update: number; skipped: number; failed: number }>;
    errors: RowError[];
  }> {
    const startTime = Date.now();

    const validation = await this.validate(restaurantId, parsedData);
    const structuredErrors: RowError[] = [...validation.errors];

    if (mode === ImportMode.STRICT && structuredErrors.length > 0) {
      throw new BadRequestException({
        message: "Import failed due to validation errors in Strict Mode.",
        errors: structuredErrors
      });
    }

    const failedRowsBySheet = new Map<string, Set<number>>();
    structuredErrors.forEach(err => {
      err.status = err.status || (mode === ImportMode.PARTIAL ? "Skipped" : "Failed");
      if (!failedRowsBySheet.has(err.sheet)) {
        failedRowsBySheet.set(err.sheet, new Set());
      }
      failedRowsBySheet.get(err.sheet)!.add(err.row);
    });

    const summary = {
      categories: { create: 0, update: 0, skipped: 0, failed: 0 },
      menuItems: { create: 0, update: 0, skipped: 0, failed: 0 },
      variants: { create: 0, update: 0, skipped: 0, failed: 0 },
      addons: { create: 0, update: 0, skipped: 0, failed: 0 }
    };

    await this.prisma.$transaction(async (tx) => {
      const categoryMap = new Map<string, string>();
      const itemMap = new Map<string, string>();

      const existingCats = await tx.category.findMany({ where: { restaurantId, deletedAt: null } });
      existingCats.forEach(c => categoryMap.set(this.normalizeString(c.name), c.id));

      const existingItems = await tx.menuItem.findMany({ where: { restaurantId, deletedAt: null } });
      existingItems.forEach(i => itemMap.set(this.normalizeString(i.name), i.id));

      // 1. Process Categories
      const catFailedSet = failedRowsBySheet.get("Categories") || new Set();
      for (const cat of parsedData.categories) {
        if (catFailedSet.has(cat.rowIndex)) {
          summary.categories.failed++;
          summary.categories.skipped++;
          continue;
        }

        const normName = this.normalizeString(cat.name);
        const existingId = categoryMap.get(normName);
        const slug = this.generateSlug(cat.name);

        let savedCat;
        if (existingId) {
          savedCat = await tx.category.update({
            where: { id: existingId },
            data: { description: cat.description, deletedAt: null }
          });
          summary.categories.update++;
        } else {
          savedCat = await tx.category.create({
            data: { restaurantId, name: cat.name, slug, description: cat.description }
          });
          summary.categories.create++;
        }
        categoryMap.set(normName, savedCat.id);
      }

      // 2. Process Menu Items
      const itemFailedSet = failedRowsBySheet.get("Menu Items") || new Set();
      for (const item of parsedData.menuItems) {
        if (itemFailedSet.has(item.rowIndex)) {
          summary.menuItems.failed++;
          summary.menuItems.skipped++;
          continue;
        }

        const normCat = this.normalizeString(item.categoryName);
        const categoryId = categoryMap.get(normCat);
        if (!categoryId) {
          summary.menuItems.failed++;
          summary.menuItems.skipped++;
          const err: RowError = {
            sheet: "Menu Items",
            row: item.rowIndex,
            column: "Category",
            value: item.categoryName,
            reason: `Category '${item.categoryName}' could not be resolved during execution`,
            suggestion: "Ensure Category exists in database or categories sheet",
            status: "Skipped"
          };
          structuredErrors.push(err);
          this.logLookupResult("Menu Items", item.rowIndex, "Category", item.categoryName, normCat, null, err.reason);
          continue;
        }

        const normName = this.normalizeString(item.name);
        const existingId = itemMap.get(normName);
        const slug = this.generateSlug(item.name);

        let savedItem;
        if (existingId) {
          savedItem = await tx.menuItem.update({
            where: { id: existingId },
            data: {
              categoryId,
              description: item.description,
              price: item.price,
              preparationTime: item.preparationTime
            }
          });
          summary.menuItems.update++;
        } else {
          savedItem = await tx.menuItem.create({
            data: {
              restaurantId,
              categoryId,
              name: item.name,
              slug,
              description: item.description,
              price: item.price,
              preparationTime: item.preparationTime
            }
          });
          summary.menuItems.create++;
        }
        itemMap.set(normName, savedItem.id);
      }

      // 3. Process Variants
      const varFailedSet = failedRowsBySheet.get("Variants") || new Set();
      for (const v of parsedData.variants) {
        if (varFailedSet.has(v.rowIndex)) {
          summary.variants.failed++;
          summary.variants.skipped++;
          continue;
        }

        const normItem = this.normalizeString(v.menuItemName);
        const menuItemId = itemMap.get(normItem);
        if (!menuItemId) {
          summary.variants.failed++;
          summary.variants.skipped++;
          const err: RowError = {
            sheet: "Variants",
            row: v.rowIndex,
            column: "Menu Item",
            value: v.menuItemName,
            reason: `Menu Item '${v.menuItemName}' could not be resolved during execution`,
            suggestion: "Ensure Menu Item exists in database or menu items sheet",
            status: "Skipped"
          };
          structuredErrors.push(err);
          this.logLookupResult("Variants", v.rowIndex, "Menu Item", v.menuItemName, normItem, null, err.reason);
          continue;
        }

        const normName = this.normalizeString(v.name);
        const existingVariant = await tx.variant.findFirst({
          where: { menuItemId, name: { equals: v.name, mode: "insensitive" } }
        });

        if (existingVariant) {
          await tx.variant.update({
            where: { id: existingVariant.id },
            data: { price: v.price }
          });
          summary.variants.update++;
        } else {
          await tx.variant.create({
            data: { restaurantId, menuItemId, name: v.name, price: v.price }
          });
          summary.variants.create++;
        }
      }

      // 4. Process Add-ons
      const addonFailedSet = failedRowsBySheet.get("Add-ons") || new Set();
      for (const addon of parsedData.addons) {
        if (addonFailedSet.has(addon.rowIndex)) {
          summary.addons.failed++;
          summary.addons.skipped++;
          continue;
        }

        const normName = this.normalizeString(addon.name);
        const existingAddon = await tx.addon.findFirst({
          where: { restaurantId, name: { equals: addon.name, mode: "insensitive" } }
        });

        let savedAddon;
        if (existingAddon) {
          savedAddon = await tx.addon.update({
            where: { id: existingAddon.id },
            data: { additionalPrice: addon.price }
          });
          summary.addons.update++;
        } else {
          savedAddon = await tx.addon.create({
            data: { restaurantId, name: addon.name, additionalPrice: addon.price }
          });
          summary.addons.create++;
        }

        const catNames = addon.categoriesStr ? addon.categoriesStr.split(",").map((c: string) => c.trim()).filter(Boolean) : [];
        const itemNames = addon.menuItemsStr ? addon.menuItemsStr.split(",").map((i: string) => i.trim()).filter(Boolean) : [];

        const assignedCatIds = catNames.map((cn: string) => categoryMap.get(this.normalizeString(cn))).filter((id): id is string => !!id);
        const assignedItemIds = itemNames.map((iname: string) => itemMap.get(this.normalizeString(iname))).filter((id): id is string => !!id);

        await tx.categoryAddon.deleteMany({ where: { addonId: savedAddon.id } });
        await tx.menuItemAddon.deleteMany({ where: { addonId: savedAddon.id } });

        if (assignedCatIds.length > 0) {
          await tx.categoryAddon.createMany({
            data: assignedCatIds.map(categoryId => ({ categoryId, addonId: savedAddon.id }))
          });
        }

        if (assignedItemIds.length > 0) {
          await tx.menuItemAddon.createMany({
            data: assignedItemIds.map(menuItemId => ({ menuItemId, addonId: savedAddon.id }))
          });
        }
      }
    });

    const processingTimeMs = Date.now() - startTime;
    return {
      success: true,
      mode,
      processingTimeMs,
      summary,
      errors: structuredErrors
    };
  }

  async generateErrorReport(errors: RowError[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Import Errors");

    sheet.columns = [
      { header: "Sheet", key: "sheet", width: 15 },
      { header: "Row", key: "row", width: 10 },
      { header: "Column", key: "column", width: 18 },
      { header: "Value", key: "value", width: 22 },
      { header: "Reason", key: "reason", width: 35 },
      { header: "Suggestion", key: "suggestion", width: 30 },
      { header: "Status", key: "status", width: 15 }
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDC2626" }
    };

    errors.forEach(err => {
      sheet.addRow({
        sheet: err.sheet,
        row: err.row,
        column: err.column,
        value: err.value,
        reason: err.reason,
        suggestion: err.suggestion || "-",
        status: err.status || "Failed"
      });
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async exportMenu(restaurantId: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    const [categories, menuItems, addons] = await Promise.all([
      this.prisma.category.findMany({
        where: { restaurantId, deletedAt: null },
        orderBy: { displayOrder: "asc" }
      }),
      this.prisma.menuItem.findMany({
        where: { restaurantId, deletedAt: null },
        orderBy: { displayOrder: "asc" },
        include: { category: true, variants: true }
      }),
      this.prisma.addon.findMany({
        where: { restaurantId },
        orderBy: { displayOrder: "asc" },
        include: {
          categoryAddons: { include: { category: true } },
          menuItemAddons: { include: { menuItem: true } }
        }
      })
    ]);

    const catSheet = workbook.addWorksheet("Categories");
    catSheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Description", key: "description", width: 35 }
    ];
    categories.forEach(cat => {
      catSheet.addRow({
        name: cat.name,
        description: cat.description ?? ""
      });
    });

    const itemSheet = workbook.addWorksheet("Menu Items");
    itemSheet.columns = [
      { header: "Category", key: "category", width: 25 },
      { header: "Name", key: "name", width: 25 },
      { header: "Description", key: "description", width: 35 },
      { header: "Price", key: "price", width: 12 },
      { header: "Preparation Time (mins)", key: "preparationTime", width: 22 }
    ];
    menuItems.forEach(item => {
      itemSheet.addRow({
        category: item.category.name,
        name: item.name,
        description: item.description ?? "",
        price: Number(item.price),
        preparationTime: item.preparationTime
      });
    });

    const varSheet = workbook.addWorksheet("Variants");
    varSheet.columns = [
      { header: "Menu Item", key: "menuItem", width: 25 },
      { header: "Variant Name", key: "variantName", width: 20 },
      { header: "Price", key: "price", width: 12 }
    ];
    menuItems.forEach(item => {
      item.variants.forEach(v => {
        varSheet.addRow({
          menuItem: item.name,
          variantName: v.name,
          price: Number(v.price)
        });
      });
    });

    const addonSheet = workbook.addWorksheet("Add-ons");
    addonSheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Price", key: "price", width: 12 },
      { header: "Categories (optional)", key: "categories", width: 30 },
      { header: "Menu Items (optional)", key: "menuItems", width: 35 }
    ];
    addons.forEach(addon => {
      const catNames = addon.categoryAddons.map(ca => ca.category.name).join(",");
      const itemNames = addon.menuItemAddons.map(ma => ma.menuItem.name).join(",");
      addonSheet.addRow({
        name: addon.name,
        price: Number(addon.additionalPrice),
        categories: catNames,
        menuItems: itemNames
      });
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
