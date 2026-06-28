import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  rememberMe: z.boolean().optional().default(false)
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const CreateRestaurantSchema = z.object({
  name: z.string().min(2, "Restaurant name must be at least 2 characters long"),
  email: z.string().email("Invalid contact email"),
  phone: z.string().min(10, "Invalid phone number format"),
  subdomain: z.string().min(2, "Subdomain must be at least 2 characters long").regex(/^[a-z0-9-]+$/, "Subdomain can only contain lowercase letters, numbers, and hyphens"),
  planCode: z.enum(["STARTER", "GROWTH", "ENTERPRISE"]),
  ownerEmail: z.string().email("Invalid owner email"),
  ownerFirstName: z.string().min(1, "Owner first name is required"),
  ownerLastName: z.string().optional()
});

export type CreateRestaurantInput = z.infer<typeof CreateRestaurantSchema>;

export const CreateOrderSchema = z.object({
  tableId: z.string().uuid("Invalid table identifier"),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(10, "Customer phone number is required"),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      menuItemId: z.string().uuid("Invalid menu item identifier"),
      quantity: z.number().int().positive("Quantity must be greater than zero"),
      notes: z.string().optional()
    })
  ).min(1, "Order must contain at least one item")
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export const CreatePlanSchema = z.object({
  name: z.string().min(2, "Plan name must be at least 2 characters long"),
  code: z.string().min(2, "Plan code is required").toUpperCase(),
  description: z.string().optional(),
  setupFee: z.number().nonnegative("Setup fee cannot be negative"),
  monthlyPrice: z.number().nonnegative("Monthly price cannot be negative"),
  maxTables: z.number().int().positive("Maximum tables must be greater than zero"),
  maxBranches: z.number().int().positive("Maximum branches must be greater than zero"),
  maxStaff: z.number().int().positive("Maximum staff must be greater than zero"),
  monthlyEmailLimit: z.number().int().nonnegative("Email limit cannot be negative"),
  customDomain: z.boolean().default(false),
  analyticsEnabled: z.boolean().default(true),
  prioritySupport: z.boolean().default(false)
});

export type CreatePlanInput = z.infer<typeof CreatePlanSchema>;

export const CreateBranchSchema = z.object({
  name: z.string().min(2, "Branch name must be at least 2 characters long"),
  code: z.string().min(2, "Branch code is required").regex(/^[A-Z0-9_-]+$/, "Branch code must contain uppercase letters, numbers, hyphens, or underscores"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  address: z.string().min(5, "Address must be at least 5 characters long"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  openingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Opening time must be in HH:MM format"),
  closingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Closing time must be in HH:MM format")
});

export type CreateBranchInput = z.infer<typeof CreateBranchSchema>;

export const InviteStaffSchema = z.object({
  email: z.string().email("Invalid staff email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  roleCode: z.enum(["MANAGER", "WAITER", "KITCHEN", "CASHIER"], {
    errorMap: () => ({ message: "Role must be one of: MANAGER, WAITER, KITCHEN, CASHIER" })
  })
});

export type InviteStaffInput = z.infer<typeof InviteStaffSchema>;

