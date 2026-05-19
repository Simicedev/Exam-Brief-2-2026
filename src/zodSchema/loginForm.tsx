
import * as z from "zod";

export const LoginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address.")
    .refine((val) => val.endsWith("@stud.noroff.no"), {
      message: "Email must be a Noroff student email (@stud.noroff.no).",
    }),
  password: z
    .string()
    .min(1, "Password is required.")
    .min(8, "Password must be at least 8 characters."),
});

export type LoginFormData = z.infer<typeof LoginSchema>;

