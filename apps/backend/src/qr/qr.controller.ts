import { Controller, Get, Post, Delete, Body, Param, UseGuards, Query, Req, Res, HttpStatus } from "@nestjs/common";
import { QRService } from "./qr.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { Request, Response } from "express";

@ApiTags("qr")
@Controller("qr")
export class QRController {
  constructor(private readonly qrService: QRService) {}

  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER")
  @ApiOperation({ summary: "Get all QR codes of the restaurant" })
  async findAll(@CurrentUser() user: any) {
    const qrs = await this.qrService.findAll(user.restaurantId);
    return {
      success: true,
      message: "QR codes retrieved successfully",
      data: qrs,
    };
  }

  @Public()
  @Get("validate/:token")
  @ApiOperation({ summary: "Validate public table QR token scanned by customer" })
  async validate(@Param("token") token: string) {
    const data = await this.qrService.validate(token);
    return {
      success: true,
      message: "QR validation successful",
      data,
    };
  }

  @Public()
  @Get("image/:token")
  @ApiOperation({ summary: "Get QR Code image binary (PNG or SVG)" })
  async getQrImage(
    @Param("token") token: string,
    @Query("format") format: "png" | "svg" = "png",
    @Res() res: Response,
  ) {
    const image = await this.qrService.getQrImage(token, format);
    if (format === "svg") {
      res.setHeader("Content-Type", "image/svg+xml");
      return res.status(HttpStatus.OK).send(image);
    } else {
      res.setHeader("Content-Type", "image/png");
      return res.status(HttpStatus.OK).send(image);
    }
  }

  @Public()
  @Get("scan/:token")
  @ApiOperation({ summary: "QR scan landing page — redirects to frontend welcome landing page" })
  async scanPage(@Param("token") token: string, @Res() res: Response) {
    try {
      await this.qrService.validate(token);
      const frontendUrl = process.env.APP_URL || "http://localhost:3000";
      return res.redirect(`${frontendUrl}/qr/${token}`);
    } catch (e: any) {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR Code Invalid</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',sans-serif;background:#0a0a0a;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .c{text-align:center;max-width:360px;animation:up .6s ease-out}
    @keyframes up{from{opacity:0;transform:translateY(20px)}to{opacity:1}}
    .icon{font-size:64px;margin-bottom:20px}
    h1{font-size:22px;font-weight:700;margin-bottom:8px;color:#ef4444}
    p{font-size:15px;color:#737373;line-height:1.5}
  </style>
</head>
<body>
  <div class="c">
    <div class="icon">⚠️</div>
    <h1>QR Code Invalid</h1>
    <p>${e.message || "This QR code is no longer active or does not exist. Please ask your server for assistance."}</p>
  </div>
</body>
</html>`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(HttpStatus.OK).send(html);
    }
  }

  @Public()
  @Get("code/:token")
  @ApiOperation({ summary: "Display scannable QR code for mobile testing (network-accessible)" })
  async testQrDisplay(@Param("token") token: string, @Req() req: Request, @Res() res: Response) {
    let host = (req.headers as any).host || "localhost:5000";
    const envBackendUrl = process.env.BACKEND_URL;
    if (envBackendUrl && (host.includes("localhost") || host.includes("127.0.0.1"))) {
      host = envBackendUrl.replace("http://", "").replace("https://", "");
    }
    const result = await this.qrService.getTestQrBase64(token, host);
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scan QR — ${result.restaurantName} Table ${result.tableNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',sans-serif;background:#0a0a0a;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px}
    .wrap{text-align:center;max-width:480px;animation:up .6s ease-out}
    @keyframes up{from{opacity:0;transform:translateY(20px)}to{opacity:1}}
    .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);border-radius:100px;padding:8px 18px;font-size:13px;font-weight:600;color:#3b82f6;margin-bottom:24px}
    h1{font-size:24px;font-weight:800;margin-bottom:6px}
    .sub{font-size:15px;color:#737373;margin-bottom:32px}
    .qr-frame{background:#fff;border-radius:20px;padding:24px;display:inline-block;margin-bottom:24px;box-shadow:0 0 60px rgba(245,158,11,.12)}
    .qr-frame img{display:block;width:280px;height:280px}
    .info{font-size:18px;font-weight:700;color:#e5e5e5;margin-bottom:6px}
    .info span{color:#f59e0b}
    .hint{font-size:14px;color:#525252;margin-bottom:24px}
    .url-box{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px 16px;font-size:12px;color:#737373;word-break:break-all;font-family:'Courier New',monospace}
    .foot{margin-top:32px;font-size:12px;color:#404040}
    .foot span{color:#f59e0b;font-weight:600}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="badge">📱 Mobile Testing</div>
    <h1>Scan this QR Code</h1>
    <p class="sub">Point your phone camera at the QR code below</p>
    <div class="qr-frame">
      <img src="data:image/png;base64,${result.base64}" alt="QR Code" />
    </div>
    <p class="info"><span>${result.restaurantName}</span> — Table ${result.tableNumber}</p>
    <p class="hint">${result.branchName} · ${result.tableName}</p>
    <div class="url-box">${result.scanUrl}</div>
    <p class="foot">Powered by <span>Huespire</span></p>
  </div>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(HttpStatus.OK).send(html);
  }

  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(":tableId")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER")
  @ApiOperation({ summary: "Get QR code details by table id" })
  async findOneByTable(@CurrentUser() user: any, @Param("tableId") tableId: string) {
    const qr = await this.qrService.findOneByTable(user.restaurantId, tableId);
    return {
      success: true,
      message: "QR code details retrieved successfully",
      data: qr,
    };
  }

  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post("regenerate")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Regenerate QR code token for a table" })
  async regenerate(@CurrentUser() user: any, @Body("tableId") tableId: string) {
    const qr = await this.qrService.regenerate(user.restaurantId, tableId);
    return {
      success: true,
      message: "QR code regenerated successfully",
      data: qr,
    };
  }

  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(":id")
  @Roles("SUPER_ADMIN", "OWNER", "MANAGER")
  @ApiOperation({ summary: "Delete/Deactivate a QR code" })
  async remove(@CurrentUser() user: any, @Param("id") id: string) {
    const qr = await this.qrService.remove(user.restaurantId, id);
    return {
      success: true,
      message: "QR code deleted successfully",
      data: qr,
    };
  }
}
