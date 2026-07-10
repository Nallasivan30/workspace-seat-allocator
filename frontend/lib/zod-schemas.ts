import { z } from "zod";

// Helper regex for codes: alphanumeric and dashes only
const CODE_REGEX = /^[A-Z0-9-]+$/;
const codeValidation = z
  .string()
  .min(2, "Code must be at least 2 characters")
  .max(30, "Code must be at most 30 characters")
  .regex(
    CODE_REGEX,
    "Must contain only uppercase letters, numbers, and dashes (-)"
  );

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const employeeSchema = z.object({
  employee_code: codeValidation,
  first_name: z.string().min(1, "First name is required").max(80),
  last_name: z.string().min(1, "Last name is required").max(80),
  email: z.string().email("Invalid email address").max(150),
  department: z.string().min(1, "Department is required").max(80),
  designation: z.string().min(1, "Designation is required").max(80),
  status: z.enum(["active", "on_leave", "exited"]),
  joining_date: z.string().min(1, "Joining date is required"),
  exit_date: z.string().nullable().optional(),
  reporting_manager_id: z.number().nullable().optional(),
});

export const projectSchema = z
  .object({
    project_code: codeValidation,
    name: z.string().min(1, "Project name is required").max(150),
    client_name: z.string().max(150).nullable().optional(),
    status: z.enum(["active", "on_hold", "closed"]),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.end_date) >= new Date(data.start_date);
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["end_date"],
    }
  );

export const employeeProjectSchema = z
  .object({
    employee_id: z.number(),
    role_on_project: z.string().min(1, "Role is required").max(80),
    allocation_percent: z
      .number()
      .min(1, "Allocation must be at least 1%")
      .max(100, "Allocation cannot exceed 100%"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.end_date) >= new Date(data.start_date);
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["end_date"],
    }
  );

export const seatAllocationSchema = z.object({
  employee_id: z.number(),
  seat_id: z.number(),
  notes: z.string().max(500).optional(),
});

export const seatReleaseSchema = z.object({
  reason: z.enum(["resigned", "relocated", "project_change", "other"]),
  notes: z.string().max(500).optional(),
});

export const autoAllocateSchema = z.object({
  employee_id: z.number(),
  building_id: z.number().optional(),
  floor_id: z.number().optional(),
  seat_type: z.enum(["standard", "workstation", "cabin", "hotdesk"]).optional(),
});

export const buildingSchema = z.object({
  name: z.string().min(1, "Building name is required").max(100),
  code: codeValidation,
  address: z.string().max(500).optional(),
});

export const floorSchema = z.object({
  building_id: z.number(),
  floor_number: z.number().int("Floor number must be an integer"),
  name: z.string().max(100).optional(),
});

export const seatSchema = z.object({
  floor_id: z.number(),
  seat_code: codeValidation,
  seat_type: z.enum(["standard", "workstation", "cabin", "hotdesk"]),
});
