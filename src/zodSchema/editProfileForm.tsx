import * as z from "zod";

const dataImageUrlRegex = /^data:image\/[\w.+-]+;base64,[A-Za-z0-9+/=]+$/;

const optionalImageSource = z
  .string()
  .trim()
  .refine((value) => {
    if (value === "") {
      return true;
    }

    if (dataImageUrlRegex.test(value)) {
      return true;
    }

    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be a valid image URL (https://...) or an uploaded image.")
  .or(z.literal(""))
  .optional();

export const EditProfileSchema = z.object({
  bio: z
    .string()
    .max(160, "Bio must be at most 160 characters.")
    .or(z.literal(""))
    .optional(),
  avatarUrl: optionalImageSource,
  avatarAlt: z
    .string()
    .max(120, "Alt text must be at most 120 characters.")
    .or(z.literal(""))
    .optional(),
  bannerUrl: optionalImageSource,
  bannerAlt: z
    .string()
    .max(120, "Alt text must be at most 120 characters.")
    .or(z.literal(""))
    .optional(),
});

export type EditProfileFormData = z.infer<typeof EditProfileSchema>;
