/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { X } from "lucide-react";
import { ApiError, apiClient } from "../api/apiClient";
import type { Booking, Venue, VenueManagerProfile } from "../api/interfaceHolidazeApi";
import { addAuthChangedListener, getStoredSession } from "../lib/auth";
import { cn } from "../lib/utils";
import { EditProfileSchema } from "../zodSchema/editProfileForm";
import type { EditProfileFormData } from "../zodSchema/editProfileForm";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

type ProfileQueryResult = {
  profile: VenueManagerProfile;
  venues: Venue[];
  bookings: Booking[];
};

export const Route = createFileRoute("/profileRoute")({
  component: ProfileRoutePage,
});

function ProfileRoutePage() {
  const queryClient = useQueryClient();
  const [session, setSession] = React.useState(() => getStoredSession());

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

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr] space-y-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-black">Your venues</h2>

          {venues.length === 0 ? (
            <p className="text-slate-600">No venues yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {venues.map((venue) => (
                <Card key={venue.id} className="overflow-hidden">
                  {venue.media[0]?.url ? (
                    <img
                      src={venue.media[0].url}
                      alt={venue.media[0].alt || venue.name}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="h-40 w-full bg-slate-100" />
                  )}
                  <CardHeader>
                    <CardTitle className="line-clamp-1 text-black">{venue.name}</CardTitle>
                    <CardDescription className="line-clamp-2 text-slate-600">
                      {venue.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600">${venue.price} per night</p>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Link to="/specificVenueRoute" search={{ id: venue.id }}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleDeleteVenue(venue.id)}
                      disabled={deleteVenueMutation.isPending}
                    >
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div>
            <h2 className="mb-3 text-xl font-semibold text-black">Recent bookings</h2>
            {bookings.length === 0 ? (
              <p className="text-slate-600">No bookings yet.</p>
            ) : (
              <ul className="overflow-hidden rounded-xl border bg-white">
                {bookings.slice(0, 8).map((booking) => {
                  const venueName = booking.venue?.name ?? "Venue";
                  const checkIn = toLocaleDate(booking.dateFrom);
                  const checkOut = toLocaleDate(booking.dateTo);

                  return (
                    <li key={booking.id} className="border-b p-3 last:border-b-0">
                      <p className="line-clamp-1 text-sm font-medium text-black">{venueName}</p>
                      <p className="text-xs text-slate-600">
                        {checkIn} - {checkOut}
                      </p>
                      <p className="text-xs text-slate-600">Guests: {booking.guests}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <EditProfileDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onSubmit={(data) => editProfileMutation.mutate(data)}
        isPending={editProfileMutation.isPending}
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

function toLocaleDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString();
}
