import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, HttpStatus, HttpCode } from "@nestjs/common";
import { PlansService } from "./plans.service";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import { Public } from "../common/decorators/public.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { PaginationDto } from "../common/dto/pagination.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("plans")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("plans")
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Roles("SUPER_ADMIN")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new subscription plan (Super Admin only)" })
  @ApiResponse({ status: 201, description: "Plan created successfully" })
  create(@Body() createPlanDto: CreatePlanDto) {
    return this.plansService.create(createPlanDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: "Get all active subscription plans" })
  @ApiResponse({ status: 200, description: "Returns list of active plans" })
  async findAll(@Query() paginationDto: PaginationDto) {
    const paginated = await this.plansService.findAll(paginationDto);
    return paginated.data;
  }

  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Get plan details by id" })
  @ApiResponse({ status: 200, description: "Returns plan details" })
  findOne(@Param("id") id: string) {
    return this.plansService.findOne(id);
  }

  @Roles("SUPER_ADMIN")
  @Patch(":id")
  @ApiOperation({ summary: "Update plan details (Super Admin only)" })
  @ApiResponse({ status: 200, description: "Plan updated successfully" })
  update(@Param("id") id: string, @Body() updatePlanDto: UpdatePlanDto) {
    return this.plansService.update(id, updatePlanDto);
  }

  @Roles("SUPER_ADMIN")
  @Delete(":id")
  @ApiOperation({ summary: "Soft delete/disable plan (Super Admin only)" })
  @ApiResponse({ status: 200, description: "Plan deleted/disabled successfully" })
  remove(@Param("id") id: string) {
    return this.plansService.remove(id);
  }
}