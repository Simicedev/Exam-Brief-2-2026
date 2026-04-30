
import * as z from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, "Username must be at least 2 characters.")
    .max(32, "Username must be at most 32 characters.")
    .regex(/^[A-Za-z0-9_]+$/, "Username can only contain letters, numbers, and underscores."),
  email: z
    .string()
    .email("Please enter a valid email address.")
    .refine((val) => val.endsWith("@stud.noroff.no"), {
      message: "Email must be a Noroff student email (@stud.noroff.no).",
    }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
  avatarFile: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, "Avatar must be 5MB or smaller.")
    .refine((file) => ALLOWED_IMAGE_TYPES.includes(file.type), "Avatar must be a valid image format (JPEG, PNG, WebP, GIF).")
    .optional()
    .nullable(),
  bannerFile: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, "Banner must be 5MB or smaller.")
    .refine((file) => ALLOWED_IMAGE_TYPES.includes(file.type), "Banner must be a valid image format (JPEG, PNG, WebP, GIF).")
    .optional()
    .nullable(),
  accountType: z.enum(["traveller", "manager"]).refine(
    (val) => val !== undefined,
    { message: "Please select an account type." }
  ),
  termsAccepted: z
    .boolean()
    .refine((val) => val === true, {
      message: "You must agree to the terms and conditions.",
    }),
});

export type RegisterFormData = z.infer<typeof RegisterSchema>;

