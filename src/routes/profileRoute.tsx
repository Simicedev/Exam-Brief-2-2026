/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { CalendarDays, Eye, LoaderCircle, MapPin, Plus, Star, Trash2, Users, X } from "lucide-react";
import { ApiError, apiClient } from "../api/apiClient";
import type { Booking, Venue, VenueManagerProfile } from "../api/interfaceHolidazeApi";
import { addAuthChangedListener, getStoredSession } from "../lib/auth";
import { cn } from "../lib/utils";
import { EditProfileSchema } from "../zodSchema/editProfileForm";
import type { EditProfileFormData } from "../zodSchema/editProfileForm";
import { CreateVenueSchema } from "../zodSchema/createForm";
import type { CreateVenueFormData } from "../zodSchema/createForm";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "../components/ui/card";

type ProfileQueryResult = {
  profile: VenueManagerProfile;
  venues: Venue[];
  bookings: Booking[];
};

const PROFILE_PAGE_SIZE = 4;

export const Route = createFileRoute("/profileRoute")({
  component: ProfileRoutePage,
});

function ProfileRoutePage() {
  const queryClient = useQueryClient();
  const [session, setSession] = React.useState(() => getStoredSession());
  const [previewVenueId, setPreviewVenueId] = React.useState<string | null>(null);
  const [editingVenueId, setEditingVenueId] = React.useState<string | null>(null);
  const [bookingsPage, setBookingsPage] = React.useState(1);
  const [venuesPage, setVenuesPage] = React.useState(1);

  React.useEffect(() => {
    const syncSession = () => {
      setSession(getStoredSession());
    };

    syncSession();
    const removeAuthListener = addAuthChangedListener(syncSession);
    window.addEventListener("storage", syncSession);
    window.addEventListener("focus", syncSession);

    return () => {
      removeAuthListener();
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("focus", syncSession);
    };
  }, []);

  const profileQuery = useQuery({
    queryKey: ["profile", session?.name],
    enabled: Boolean(session?.name && session?.accessToken),
    queryFn: async (): Promise<ProfileQueryResult> => {
      const response = await apiClient.profiles.get(
        session!.name,
        { _venues: true, _bookings: true },
        session!.accessToken,
      );

      return {
        profile: response.data,
        venues: response.data.venues ?? [],
        bookings: response.data.bookings ?? [],
      };
    },
    staleTime: 45_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) {
        return false;
      }

      return failureCount < 2;
    },
  });

  const [editOpen, setEditOpen] = React.useState(false);

  const editProfileMutation = useMutation({
    mutationFn: async (data: EditProfileFormData) => {
      if (!session?.accessToken) {
        throw new Error("You must be logged in to edit your profile.");
      }

      await apiClient.profiles.update(session.name, session.accessToken, {
        bio: data.bio || undefined,
        avatar:
          data.avatarUrl
            ? { url: data.avatarUrl, alt: data.avatarAlt || "" }
            : undefined,
        banner:
          data.bannerUrl
            ? { url: data.bannerUrl, alt: data.bannerAlt || "" }
            : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Profile updated.");
      setEditOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["profile", session?.name] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to update profile.";
      toast.error(message);
    },
  });

  const deleteVenueMutation = useMutation({
    mutationFn: async (venueId: string) => {
      if (!session?.accessToken) {
        throw new Error("You must be logged in to delete a venue.");
      }

      await apiClient.venues.remove(venueId, session.accessToken);
    },
    onSuccess: () => {
      toast.success("Venue deleted.");
      void queryClient.invalidateQueries({ queryKey: ["profile", session?.name] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to delete venue.";
      toast.error(message);
    },
  });

  const updateVenueMutation = useMutation({
    mutationFn: async (data: CreateVenueFormData & { venueId: string }) => {
      if (!session?.accessToken) {
        throw new Error("You must be logged in to update a venue.");
      }

      const { venueId, ...venueData } = data;
      await apiClient.venues.update(venueId, session.accessToken, {
        name: venueData.name,
        description: venueData.description,
        price: venueData.price,
        rating: venueData.rating,
        maxGuests: venueData.maxGuests,
        media: venueData.mediaUrls,
        meta: {
          wifi: venueData.wifi,
          parking: venueData.parking,
          breakfast: venueData.breakfast,
          pets: venueData.pets,
        },
        location: {
          address: venueData.address,
          city: venueData.city,
          zip: venueData.zip,
          country: venueData.country,
          lat: venueData.lat ?? 0,
          lng: venueData.lng ?? 0,
        },
      });
    },
    onSuccess: () => {
      toast.success("Venue updated.");
      setEditingVenueId(null);
      void queryClient.invalidateQueries({ queryKey: ["profile", session?.name] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to update venue.";
      toast.error(message);
    },
  });

  const handleDeleteVenue = React.useCallback(
    async (venueId: string) => {
      const confirmed = window.confirm("Delete this venue? This action cannot be undone.");
      if (!confirmed || deleteVenueMutation.isPending) {
        return;
      }

      await deleteVenueMutation.mutateAsync(venueId);
    },
    [deleteVenueMutation],
  );

  const deleteBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      if (!session?.accessToken) {
        throw new Error("You must be logged in to delete a booking.");
      }

      await apiClient.bookings.remove(bookingId, session.accessToken);
    },
    onSuccess: () => {
      toast.success("Booking removed.");
      void queryClient.invalidateQueries({ queryKey: ["profile", session?.name] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to delete booking.";
      toast.error(message);
    },
  });

  const handleDeleteBooking = React.useCallback(
    async (bookingId: string) => {
      const confirmed = window.confirm("Delete this booking? This action cannot be undone.");
      if (!confirmed || deleteBookingMutation.isPending) {
        return;
      }

      await deleteBookingMutation.mutateAsync(bookingId);
    },
    [deleteBookingMutation],
  );

  if (!session) {
    return (
      <section className="mx-auto max-w-7xl p-6">
        <h1 className="mb-3 text-2xl font-semibold text-black">My profile</h1>
        <p className="text-slate-600">
          You need to sign in to view your profile. {" "}
          <Link to="/loginRoute" className="font-medium text-black underline underline-offset-4">
            Go to login
          </Link>
        </p>
      </section>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <section className="mx-auto max-w-7xl p-6">
        <p className="text-slate-600">Loading profile...</p>
      </section>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    const message = profileQuery.error instanceof Error ? profileQuery.error.message : "Unknown error";

    return (
      <section className="mx-auto max-w-7xl p-6">
        <p className="text-red-600">Failed to load profile: {message}</p>
      </section>
    );
  }

  const { profile, venues, bookings } = profileQuery.data;
  const avatarUrl = profile.avatar?.url?.trim();
  const bannerUrl = profile.banner?.url?.trim();
  const venueCount = profile._count?.venues ?? venues.length;
  const bookingCount = profile._count?.bookings ?? bookings.length;
  const bookingsTotalPages = Math.max(1, Math.ceil(bookings.length / PROFILE_PAGE_SIZE));
  const venuesTotalPages = Math.max(1, Math.ceil(venues.length / PROFILE_PAGE_SIZE));
  const safeBookingsPage = Math.min(bookingsPage, bookingsTotalPages);
  const safeVenuesPage = Math.min(venuesPage, venuesTotalPages);
  const visibleBookings = bookings.slice(
    (safeBookingsPage - 1) * PROFILE_PAGE_SIZE,
    (safeBookingsPage - 1) * PROFILE_PAGE_SIZE + PROFILE_PAGE_SIZE,
  );
  const visibleVenues = venues.slice(
    (safeVenuesPage - 1) * PROFILE_PAGE_SIZE,
    (safeVenuesPage - 1) * PROFILE_PAGE_SIZE + PROFILE_PAGE_SIZE,
  );

  return (
    <section className="mx-auto max-w space-y-8">
      <div className="overflow-hidden border bg-white">
        <div className="relative h-56 w-full bg-slate-100 sm:h-64">
          {bannerUrl ? (
            <img src={bannerUrl} alt={`${profile.name} banner`} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-linear-to-r from-slate-200 to-slate-100" />
          )}
        </div>

        <div className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:items-center sm:text-left">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-full border bg-slate-100">
            {avatarUrl ? (
              <img src={avatarUrl} alt={`${profile.name} avatar`} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-lg font-semibold text-slate-500">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center space-y-2 sm:items-start">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-black">{profile.name}</h1>
              <p className="text-sm text-slate-600">{profile.email}</p>
              {profile.bio ? <p className="text-slate-700">{profile.bio}</p> : null}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm sm:justify-start">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Venues: {venueCount}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Bookings: {bookingCount}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                Account: {profile.venueManager ? "Venue manager" : "Traveller"}
              </span>
              <Button className="hover:cursor-pointer" size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                Edit profile
              </Button>
              {profile.venueManager ? (
                <Link to="/createVenueRoute">
                  <Button className="hover:cursor-pointer" size="sm">Create venue</Button>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-xl font-semibold text-black">Recent bookings</h2>
              <p className="text-sm text-slate-500">Your latest trips and stay details in one place.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {bookingCount} total
            </span>
          </div>

          {bookingsTotalPages > 1 ? (
            <div className="flex items-center justify-center gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3">
              <button
                type="button"
                onClick={() => setBookingsPage((current) => Math.max(1, current - 1))}
                disabled={safeBookingsPage <= 1}
                className="rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous bookings page"
              >
                &larr;
              </button>
              <p className="text-sm text-slate-600">Page {safeBookingsPage} of {bookingsTotalPages}</p>
              <button
                type="button"
                onClick={() => setBookingsPage((current) => Math.min(bookingsTotalPages, current + 1))}
                disabled={safeBookingsPage >= bookingsTotalPages}
                className="rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next bookings page"
              >
                &rarr;
              </button>
            </div>
          ) : null}

          {bookings.length === 0 ? (
            <div className="grid min-h-52 place-items-center bg-linear-to-br from-slate-50 to-white p-6 text-center">
              <div className="space-y-2">
                <p className="text-base font-medium text-black">No bookings yet</p>
                <p className="text-sm text-slate-500">Once you reserve a stay, it will show up here with the key details.</p>
                <Link to="/venuesListRoute">
                  <Button className="mt-2 hover:cursor-pointer" size="sm" variant="outline">Browse venues</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4 sm:p-5">
              {visibleBookings.map((booking) => {
                const venueName = booking.venue?.name ?? "Venue";
                const venueLocation = [booking.venue?.location.city, booking.venue?.location.country].filter(Boolean).join(", ");
                const checkIn = toLocaleDate(booking.dateFrom);
                const checkOut = toLocaleDate(booking.dateTo);
                const venueImage = booking.venue?.media?.[0]?.url?.trim();
                const venueImageAlt = booking.venue?.media?.[0]?.alt || venueName;

                return (
                  <div
                    key={booking.id}
                    className="rounded-2xl border border-slate-200 bg-linear-to-r from-white to-slate-50 p-4 transition hover:border-slate-300"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="h-18 w-22 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                          {venueImage ? (
                            <img src={venueImage} alt={venueImageAlt} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-[11px] text-slate-500">No image</div>
                          )}
                        </div>

                        <div className="space-y-2 min-w-0">
                          <div>
                            <p className="text-base font-semibold text-black line-clamp-1">{venueName}</p>
                            {venueLocation ? (
                              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                                <MapPin className="size-3.5" />
                                {venueLocation}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                              <CalendarDays className="size-3.5" />
                              {checkIn} - {checkOut}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                              <Users className="size-3.5" />
                              {booking.guests} guest{booking.guests === 1 ? "" : "s"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {booking.venue?.id ? (
                          <Button
                            className="hover:cursor-pointer"
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewVenueId(booking.venue!.id)}
                          >
                            <Eye className="size-4" />
                            View venue
                          </Button>
                        ) : null}
                        <Button
                          className="hover:cursor-pointer"
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleDeleteBooking(booking.id)}
                          disabled={deleteBookingMutation.isPending}
                        >
                          <Trash2 className="size-4" />
                          Remove booking
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        {profile.venueManager ? (
          <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-xl font-semibold text-black">Your venues</h2>
                <p className="text-sm text-slate-500">Manage your listings with a clearer overview of pricing and capacity.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {venueCount} listed
              </span>
            </div>

            {venuesTotalPages > 1 ? (
              <div className="flex items-center justify-center gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setVenuesPage((current) => Math.max(1, current - 1))}
                  disabled={safeVenuesPage <= 1}
                  className="rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous venues page"
                >
                  &larr;
                </button>
                <p className="text-sm text-slate-600">Page {safeVenuesPage} of {venuesTotalPages}</p>
                <button
                  type="button"
                  onClick={() => setVenuesPage((current) => Math.min(venuesTotalPages, current + 1))}
                  disabled={safeVenuesPage >= venuesTotalPages}
                  className="rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next venues page"
                >
                  &rarr;
                </button>
              </div>
            ) : null}

            {venues.length === 0 ? (
              <div className="grid min-h-52 place-items-center bg-linear-to-br from-slate-50 to-white p-6 text-center">
                <div className="space-y-2">
                  <p className="text-base font-medium text-black">No venues yet</p>
                  <p className="text-sm text-slate-500">Create your first venue to start hosting travellers.</p>
                  <Link to="/createVenueRoute">
                    <Button className="mt-2 hover:cursor-pointer" size="sm">Create venue</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-2">
                {visibleVenues.map((venue) => {
                  const previewImage = venue.media?.[0]?.url?.trim() ?? "";
                  const clampedRating = Math.max(0, Math.min(5, venue.rating ?? 0));
                  const roundedRating = Math.round(clampedRating);
                  const locationLabel = [venue.location.city, venue.location.country].filter(Boolean).join(", ");

                  return (
                    <Card key={venue.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-none ring-0">
                      <div className="relative h-48 overflow-hidden bg-slate-100">
                        {previewImage ? (
                          <img
                            src={previewImage}
                            alt={venue.media?.[0]?.alt || venue.name}
                            className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-sm text-slate-500">No image available</div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/65 to-transparent p-4">
                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <p className="line-clamp-1 text-lg font-semibold text-white">{venue.name}</p>
                              {locationLabel ? (
                                <p className="mt-1 flex items-center gap-1.5 text-xs text-white/80">
                                  <MapPin className="size-3.5" />
                                  {locationLabel}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      <CardHeader className="pb-3">
                        <CardDescription className="text-sm text-slate-600">
                          {venue.description || "No description yet."}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                            <Users className="size-3.5" />
                            Up to {venue.maxGuests} guests
                          </span>
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700"
                            aria-label={`${clampedRating.toFixed(1)} out of 5 stars`}
                            title={`${clampedRating.toFixed(1)} / 5`}
                          >
                            {"★".repeat(roundedRating)}
                            {"☆".repeat(5 - roundedRating)}
                            <span className="ml-1 text-slate-600">{clampedRating.toFixed(1)}</span>
                          </span>
                        </div>
                      </CardContent>

                      <CardFooter className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80">
                        <Button
                          className="hover:cursor-pointer"
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewVenueId(venue.id)}
                        >
                          <Eye className="size-4" />
                          View
                        </Button>
                        <Button
                          className="hover:cursor-pointer"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingVenueId(venue.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          className="hover:cursor-pointer"
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleDeleteVenue(venue.id)}
                          disabled={deleteVenueMutation.isPending}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </article>
        ) : null}
      </div>

      <EditProfileDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onSubmit={(data) => editProfileMutation.mutate(data)}
        isPending={editProfileMutation.isPending}
      />

      <VenuePreviewDialog
        open={Boolean(previewVenueId)}
        onClose={() => setPreviewVenueId(null)}
        venueId={previewVenueId}
      />

      <EditVenueDialog
        open={Boolean(editingVenueId)}
        onClose={() => setEditingVenueId(null)}
        venueId={editingVenueId}
        onSubmit={(data) => updateVenueMutation.mutate(data)}
        isPending={updateVenueMutation.isPending}
      />
    </section>
  );
}

function EditProfileDialog({
  open,
  onClose,
  profile,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  profile: VenueManagerProfile;
  onSubmit: (data: EditProfileFormData) => void;
  isPending: boolean;
}) {
  const [bio, setBio] = React.useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = React.useState(profile.avatar?.url ?? "");
  const avatarAlt = profile.avatar?.alt ?? "";
  const [bannerUrl, setBannerUrl] = React.useState(profile.banner?.url ?? "");
  const bannerAlt = profile.banner?.alt ?? "";
  const [errors, setErrors] = React.useState<Partial<Record<keyof EditProfileFormData, string>>>({})

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const result = EditProfileSchema.safeParse({ bio, avatarUrl, avatarAlt, bannerUrl, bannerAlt });

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof EditProfileFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof EditProfileFormData;
        fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    onSubmit(result.data);
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-black cursor-pointer">Edit profile</DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground" htmlFor="edit-bio">
                Bio <span className="text-xs text-muted-foreground">(optional, max 160 chars)</span>
              </label>
              <textarea
                id="edit-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={3}
                className={cn(
                  "w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:ring-4 focus:ring-foreground/5 resize-none",
                  errors.bio ? "border-destructive" : "border-border focus:border-foreground/30"
                )}
                placeholder="Tell people a bit about yourself..."
              />
              {errors.bio && <p className="text-xs text-destructive">{errors.bio}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground" htmlFor="edit-avatar-url">
                Avatar URL <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <input
                id="edit-avatar-url"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-xl border bg-background px-3 text-sm text-foreground outline-none transition focus:ring-4 focus:ring-foreground/5",
                  errors.avatarUrl ? "border-destructive" : "border-border focus:border-foreground/30"
                )}
                placeholder="https://example.com/avatar.jpg"
              />
              {errors.avatarUrl && <p className="text-xs text-destructive">{errors.avatarUrl}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground" htmlFor="edit-banner-url">
                Banner URL <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <input
                id="edit-banner-url"
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-xl border bg-background px-3 text-sm text-foreground outline-none transition focus:ring-4 focus:ring-foreground/5",
                  errors.bannerUrl ? "border-destructive" : "border-border focus:border-foreground/30"
                )}
                placeholder="https://example.com/banner.jpg"
              />
              {errors.bannerUrl && <p className="text-xs text-destructive">{errors.bannerUrl}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button className="hover:cursor-pointer" type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button className="hover:cursor-pointer" type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function VenuePreviewDialog({
  open,
  onClose,
  venueId,
}: {
  open: boolean;
  onClose: () => void;
  venueId: string | null;
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["profile-venue-preview", venueId],
    enabled: open && Boolean(venueId),
    queryFn: async () => {
      const response = await apiClient.venues.get(
        venueId!,
        { _owner: true, _bookings: true },
      );

      return response.data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const [activeImage, setActiveImage] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setActiveImage("");
      return;
    }

    const image = data?.media?.find((item) => item.url?.trim())?.url ?? "";
    setActiveImage(image);
  }, [open, data]);

  const locationLabel = data
    ? [data.location.city, data.location.country].filter(Boolean).join(", ")
    : "";

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px]" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto p-3 sm:p-6">
        <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
          <DialogPanel className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
              <DialogTitle className="text-lg font-semibold text-black">Venue preview</DialogTitle>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close venue preview"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
              {isLoading ? (
                <div className="grid min-h-60 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600">
                  Loading venue...
                </div>
              ) : null}

              {isError ? (
                <div className="grid min-h-60 place-items-center rounded-2xl border border-red-200 bg-red-50 px-4 text-center text-red-600">
                  {error instanceof Error ? error.message : "Failed to load venue"}
                </div>
              ) : null}

              {!isLoading && !isError && data ? (
                <div className="space-y-6">
                  <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="relative h-64 w-full bg-slate-100 sm:h-96">
                      {activeImage ? (
                        <img
                          src={activeImage}
                          alt={data.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-slate-500">No image</div>
                      )}

                      <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                        <h3 className="text-xl font-semibold text-white sm:text-2xl">{data.name}</h3>
                        {locationLabel ? (
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/90">
                            <MapPin className="size-4" />
                            {locationLabel}
                          </p>
                        ) : null}
                      </div>

                      {(data.media?.length ?? 0) > 1 ? (
                        <div className="absolute inset-x-0 bottom-0 flex gap-2 overflow-x-auto px-4 pb-4 pt-20 sm:px-6">
                          {data.media?.map((item, index) => (
                            <button
                              key={`${item.url}-${index}`}
                              type="button"
                              onClick={() => setActiveImage(item.url)}
                              className={`h-14 w-22 shrink-0 overflow-hidden rounded-xl border ${
                                activeImage === item.url ? "border-white" : "border-white/40"
                              }`}
                            >
                              <img src={item.url} alt={item.alt || data.name} className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
                      <VenueMetaItem label="Price" value={`$${data.price} / night`} />
                      <VenueMetaItem label="Max guests" value={String(data.maxGuests)} />
                      <VenueMetaItem label="Rating" value={data.rating.toFixed(1)} icon={<Star className="size-3.5 fill-current" />} />
                      <VenueMetaItem label="Updated" value={toLocaleDateTime(data.updated)} />
                    </div>
                  </article>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                      <h4 className="mb-2 text-base font-semibold text-black">Description</h4>
                      <p className="text-sm text-slate-600">{data.description || "No description provided."}</p>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                      <h4 className="mb-2 text-base font-semibold text-black">Amenities</h4>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                        <FacilityItems label="Wifi" enabled={data.meta.wifi} />
                        <FacilityItems label="Parking" enabled={data.meta.parking} />
                        <FacilityItems label="Breakfast" enabled={data.meta.breakfast} />
                        <FacilityItems label="Pets" enabled={data.meta.pets} />
                      </div>
                    </article>
                  </div>
                </div>
              ) : null}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

function VenueMetaItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-800">
        {icon}
        {value}
      </p>
    </div>
  );
}

function FacilityItems({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-1 ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
      {label}: {enabled ? "Yes" : "No"}
    </span>
  );
}

function toLocaleDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString();
}

function toLocaleDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}

function EditVenueDialog({
  open,
  onClose,
  venueId,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  venueId: string | null;
  onSubmit: (data: CreateVenueFormData & { venueId: string }) => void;
  isPending: boolean;
}) {
  const { data: venue, isLoading } = useQuery({
    queryKey: ["edit-venue", venueId],
    enabled: open && Boolean(venueId),
    queryFn: async () => {
      const response = await apiClient.venues.get(venueId!);
      return response.data;
    },
    staleTime: 30_000,
  });

  const [formData, setFormData] = React.useState<CreateVenueFormData>({
    name: '',
    description: '',
    price: 100,
    rating: 1,
    maxGuests: 2,
    mediaUrls: [],
    wifi: false,
    parking: false,
    breakfast: false,
    pets: false,
    address: '',
    city: '',
    zip: '',
    country: '',
    lat: undefined, // temporarily undefined, should be set from venue
    lng: undefined,
  });

  const [imageUrl, setImageUrl] = React.useState('');
  const [formErrors, setFormErrors] = React.useState<Partial<Record<keyof CreateVenueFormData, string>>>({});

  React.useEffect(() => {
    if (venue) {
      setFormData({
        name: venue.name || '',
        description: venue.description || '',
        price: venue.price || 100,
        rating: Math.max(1, Math.min(5, Math.round(venue.rating || 1))),
        maxGuests: venue.maxGuests || 2,
        mediaUrls: venue.media || [],
        wifi: venue.meta?.wifi || false,
        parking: venue.meta?.parking || false,
        breakfast: venue.meta?.breakfast || false,
        pets: venue.meta?.pets || false,
        address: venue.location?.address || '',
        city: venue.location?.city || '',
        zip: venue.location?.zip || '',
        country: venue.location?.country || '',
        lat: typeof venue.location?.lat === 'number' ? venue.location.lat : undefined,
        lng: typeof venue.location?.lng === 'number' ? venue.location.lng : undefined,
      });
    }
  }, [venue]);

  const handleAddImage = () => {
    if (!imageUrl) {
      toast.error('Please enter an image URL.');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      mediaUrls: [...(prev.mediaUrls || []), { url: imageUrl }],
    }));
    setImageUrl('');
    toast.success('Image added!');
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      mediaUrls: (prev.mediaUrls || []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormErrors({});

    const result = CreateVenueSchema.safeParse(formData);

    if (!result.success) {
      const errors: Partial<Record<keyof CreateVenueFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof CreateVenueFormData;
        errors[path] = issue.message;
      });
      setFormErrors(errors);
      console.error('Validation errors:', errors);
      toast.error('Please fix the errors in the form.');
      return;
    }

    if (!venueId) {
      toast.error('No venue ID found.');
      return;
    }

    onSubmit({ ...result.data, venueId });
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto p-3 sm:p-6">
        <div className="mx-auto flex min-h-full max-w-2xl items-center justify-center">
          <DialogPanel className="w-full rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold text-black">Edit Venue</DialogTitle>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-8"><LoaderCircle className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-black">Basic Information</h3>
                  
                  <div>
                    <label htmlFor="edit-name" className="block text-sm font-medium mb-2 text-black">
                      Venue Name *
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={cn(
                        'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
                        formErrors.name ? 'border-destructive' : 'border-border'
                      )}
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-destructive">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="edit-description" className="block text-sm font-medium mb-2 text-black">
                      Description *
                    </label>
                    <textarea
                      id="edit-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className={cn(
                        'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
                        formErrors.description ? 'border-destructive' : 'border-border'
                      )}
                    />
                    {formErrors.description && (
                      <p className="mt-1 text-sm text-destructive">{formErrors.description}</p>
                    )}
                  </div>
                </div>

                {/* Pricing & Capacity */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-black">Pricing & Capacity</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-price" className="block text-sm font-medium mb-2 text-black">
                        Price per Night ($) *
                      </label>
                      <input
                        id="edit-price"
                        type="number"
                        min="1"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                        className={cn(
                          'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
                          formErrors.price ? 'border-destructive' : 'border-border'
                        )}
                      />
                      {formErrors.price && (
                        <p className="mt-1 text-sm text-destructive">{formErrors.price}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="edit-maxGuests" className="block text-sm font-medium mb-2 text-black">
                        Max Guests *
                      </label>
                      <input
                        id="edit-maxGuests"
                        type="number"
                        min="1"
                        value={formData.maxGuests}
                        onChange={(e) => setFormData({ ...formData, maxGuests: Number(e.target.value) })}
                        className={cn(
                          'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
                          formErrors.maxGuests ? 'border-destructive' : 'border-border'
                        )}
                      />
                      {formErrors.maxGuests && (
                        <p className="mt-1 text-sm text-destructive">{formErrors.maxGuests}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="block text-sm font-medium mb-2 text-black">Rating *</p>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormData({ ...formData, rating: star })}
                          aria-label={`Set rating to ${star} star${star === 1 ? '' : 's'}`}
                          className={cn(
                            'rounded-md px-2 py-1 text-lg leading-none transition',
                            formData.rating >= star ? 'text-amber-500' : 'text-slate-300 hover:text-amber-300'
                          )}
                        >
                          ★
                        </button>
                      ))}
                      <span className="text-sm text-slate-600">{formData.rating}/5</span>
                    </div>
                    {formErrors.rating && (
                      <p className="mt-1 text-sm text-destructive">{formErrors.rating}</p>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-black">Location</h3>
                  <div>
                    <label htmlFor="edit-address" className="block text-sm font-medium mb-2 text-black">
                      Address *
                    </label>
                    <input
                      id="edit-address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className={cn(
                        'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
                        formErrors.address ? 'border-destructive' : 'border-border'
                      )}
                    />
                    {formErrors.address && (
                      <p className="mt-1 text-sm text-destructive">{formErrors.address}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-city" className="block text-sm font-medium mb-2 text-black">
                        City *
                      </label>
                      <input
                        id="edit-city"
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className={cn(
                          'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
                          formErrors.city ? 'border-destructive' : 'border-border'
                        )}
                      />
                      {formErrors.city && (
                        <p className="mt-1 text-sm text-destructive">{formErrors.city}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="edit-zip" className="block text-sm font-medium mb-2 text-black">
                        ZIP Code *
                      </label>
                      <input
                        id="edit-zip"
                        type="text"
                        value={formData.zip}
                        onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                        className={cn(
                          'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
                          formErrors.zip ? 'border-destructive' : 'border-border'
                        )}
                      />
                      {formErrors.zip && (
                        <p className="mt-1 text-sm text-destructive">{formErrors.zip}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-country" className="block text-sm font-medium mb-2 text-black">
                        Country *
                      </label>
                      <input
                        id="edit-country"
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className={cn(
                          'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
                          formErrors.country ? 'border-destructive' : 'border-border'
                        )}
                      />
                      {formErrors.country && (
                        <p className="mt-1 text-sm text-destructive">{formErrors.country}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amenities */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-black">Amenities</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(['wifi', 'parking', 'breakfast', 'pets'] as const).map((amenity) => (
                      <label key={amenity} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData[amenity]}
                          onChange={(e) => setFormData({ ...formData, [amenity]: e.target.checked })}
                          className="w-4 h-4 rounded border-border"
                        />
                        <span className="text-sm font-medium capitalize text-black">{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Images */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-black">Venue Images</h3>
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="edit-imageUrl" className="block text-sm font-medium mb-2 text-black">
                        Image URL
                      </label>
                      <input
                        id="edit-imageUrl"
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background transition-colors text-black"
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={handleAddImage}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Image
                    </Button>
                  </div>

                  {formData.mediaUrls && formData.mediaUrls.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-black">Venue Images ({formData.mediaUrls.length})</h4>
                      <div className="space-y-2">
                        {formData.mediaUrls.map((media, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-lg border border-border bg-muted p-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{media.url}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="ml-2 inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isPending}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="flex-1"
                  >
                    {isPending && <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />}
                    {isPending ? 'Updating...' : 'Update Venue'}
                  </Button>
                </div>
              </form>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
