import * as z from "zod";



export const CreateVenueSchema = z.object({
  name: z
    .string()
    .min(1, "Venue name is required.")
    .min(3, "Venue name must be at least 3 characters.")
    .max(100, "Venue name must be at most 100 characters."),
  description: z
    .string()
    .min(1, "Description is required.")
    .min(10, "Description must be at least 10 characters.")
    .max(500, "Description must be at most 500 characters."),
  price: z
    .number()
    .min(1, "Price must be at least 1")
    .max(10000, "Price must be at most 10000"),
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  maxGuests: z
    .number()
    .min(1, "Max guests must be at least 1")
    .max(100, "Max guests must be at most 100"),
  mediaUrls: z
    .array(
      z.object({
        url: z.string().url("Please enter a valid image URL."),
      })
    )
    .optional()
    .default([]),
  wifi: z.boolean().default(false),
  parking: z.boolean().default(false),
  breakfast: z.boolean().default(false),
  pets: z.boolean().default(false),
  address: z.string().min(1, "Address is required."),
  city: z.string().min(1, "City is required."),
  zip: z.string().min(1, "ZIP code is required."),
  country: z.string().min(1, "Country is required."),

});

export type CreateVenueFormData = z.infer<typeof CreateVenueSchema>;