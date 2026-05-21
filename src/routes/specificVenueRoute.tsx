/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DayPicker, type Matcher } from "react-day-picker";
import "react-day-picker/style.css";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiClient } from "../api/apiClient";
import type { Venue } from "../api/interfaceHolidazeApi";
import { getStoredSession } from "../lib/auth";
import { Button } from "../components/ui/button";

type SpecificVenueSearch = {
  id?: string;
};

const toDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const toStartOfDay = (value: Date | string) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toInputDate = (date: Date) => {
  return toStartOfDay(date).toISOString().split("T")[0];
};

const toCalendarLabel = (value: string) => {
  if (!value) {
    return "Select a date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getGalleryImages = (venue: Venue) => {
  return venue.media?.filter((item) => item.url?.trim()) ?? [];
};

const getTitle = (venue: Venue) => {
  const city = venue.location.city || "Unknown city";
  const country = venue.location.country || "Unknown country";
  return `${venue.name} - ${city}, ${country}`;
};

export const Route = createFileRoute("/specificVenueRoute")({
  validateSearch: (search: Record<string, unknown>): SpecificVenueSearch => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  component: SpecificVenueRoute,
});

function SpecificVenueRoute() {
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const venueId = search.id?.trim();
  const [session, setSession] = React.useState(() => getStoredSession());
  const [activeImage, setActiveImage] = React.useState("");
  const [openCalendar, setOpenCalendar] = React.useState<"checkIn" | "checkOut" | null>(null);
  const checkInCalendarRef = React.useRef<HTMLDivElement | null>(null);
  const checkOutCalendarRef = React.useRef<HTMLDivElement | null>(null);
  const [bookingForm, setBookingForm] = React.useState({
    dateFrom: "",
    dateTo: "",
    guests: "1",
  });

  React.useEffect(() => {
    const syncSession = () => {
      setSession(getStoredSession());
    };

    window.addEventListener("storage", syncSession);
    window.addEventListener("focus", syncSession);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("focus", syncSession);
    };
  }, []);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["venue", "specific", venueId, session?.name],
    enabled: Boolean(venueId),
    queryFn: async () => {
      const baseResponse = await apiClient.venues.get(venueId!, {
        _owner: true,
        _bookings: true,
      });

      return baseResponse.data;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, queryError) => {
      if (queryError instanceof ApiError && (queryError.status === 404 || queryError.status === 400)) {
        return false;
      }

      return failureCount < 2;
    },
  });

  React.useEffect(() => {
    if (!isError) {
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    toast.error(`Failed to fetch venue: ${message}`);
  }, [isError, error]);

  React.useEffect(() => {
    const galleryImages = data ? getGalleryImages(data) : [];
    setActiveImage(galleryImages[0]?.url ?? "");
  }, [data]);

  React.useEffect(() => {
    if (!openCalendar) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const activeRef = openCalendar === "checkIn" ? checkInCalendarRef.current : checkOutCalendarRef.current;

      if (activeRef && !activeRef.contains(target)) {
        setOpenCalendar(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openCalendar]);

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!venueId) {
        throw new Error("Missing venue id.");
      }

      if (!session?.accessToken) {
        throw new Error("You must be logged in to book this venue.");
      }

      const guests = Number(bookingForm.guests);
      if (!bookingForm.dateFrom || !bookingForm.dateTo) {
        throw new Error("Select both check-in and check-out dates.");
      }

      if (!Number.isFinite(guests) || guests < 1) {
        throw new Error("Guests must be at least 1.");
      }

      if (data && guests > data.maxGuests) {
        throw new Error(`This venue allows up to ${data.maxGuests} guests.`);
      }

      const dateFrom = new Date(bookingForm.dateFrom);
      const dateTo = new Date(bookingForm.dateTo);

      if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
        throw new Error("Enter valid booking dates.");
      }

      if (dateTo <= dateFrom) {
        throw new Error("Check-out must be after check-in.");
      }

      await apiClient.bookings.create(session.accessToken, {
        venueId,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        guests,
      });
    },
    onSuccess: async () => {
      toast.success("Booking created.");
      setBookingForm({ dateFrom: "", dateTo: "", guests: "1" });
      await queryClient.invalidateQueries({ queryKey: ["venue", "specific", venueId] });
    },
    onError: (mutationError) => {
      const message = mutationError instanceof Error ? mutationError.message : "Failed to create booking.";
      toast.error(message);
    },
  });


  if (!venueId) {
    return (
      <section className="mx-auto max-w-6xl space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-black">Venue details</h1>
        <p className="text-slate-600">Missing venue id in the URL search params.</p>
        <Link to="/venuesListRoute">
          <Button className="cursor-pointer" variant="outline">Back to venues</Button>
        </Link>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="mx-auto max-w-6xl space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-black">Loading venue...</h1>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </section>
    );
  }

  if (isError || !data) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return (
      <section className="mx-auto max-w-6xl space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-black">Venue details</h1>
        <p className="text-red-600">Could not load venue: {message}</p>
        <Link to="/venuesListRoute">
          <Button className="cursor-pointer" variant="outline">Back to venues</Button>
        </Link>
      </section>
    );
  }

  const venue = data;
  const galleryImages = getGalleryImages(venue);
  const bookings = venue.bookings ?? [];
  const ownerAvatar = venue.owner?.avatar?.url?.trim();
  const isOwner = Boolean(session?.name && venue.owner?.name === session.name);
  const minimumDate = toStartOfDay(new Date());
  const selectedCheckIn = bookingForm.dateFrom ? toStartOfDay(bookingForm.dateFrom) : undefined;
  const selectedCheckOut = bookingForm.dateTo ? toStartOfDay(bookingForm.dateTo) : undefined;
  const pastDayMatcher: Matcher = { before: minimumDate };
  const bookedRanges = bookings.map((booking) => ({
    from: toStartOfDay(booking.dateFrom),
    to: toStartOfDay(booking.dateTo),
  }));
  const unavailableDayMatchers: Matcher[] = [
    pastDayMatcher,
    ...bookedRanges,
  ];
  const checkOutDisabledMatchers: Matcher[] = [
    ...unavailableDayMatchers,
    (date: Date) => (selectedCheckIn ? toStartOfDay(date) <= selectedCheckIn : false),
  ];

  const handleBookingInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setBookingForm((current) => ({ ...current, [name]: value }));
  };

  const handleCheckInSelect = (date: Date | undefined) => {
    if (!date) {
      return;
    }

    const nextCheckIn = toInputDate(date);
    setBookingForm((current) => {
      const nextState = { ...current, dateFrom: nextCheckIn };

      if (current.dateTo && toStartOfDay(current.dateTo) <= toStartOfDay(date)) {
        nextState.dateTo = "";
      }

      return nextState;
    });
    setOpenCalendar("checkOut");
  };

  const handleCheckOutSelect = (date: Date | undefined) => {
    if (!date) {
      return;
    }

    setBookingForm((current) => ({ ...current, dateTo: toInputDate(date) }));
    setOpenCalendar(null);
  };

  const handleBookingSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await bookingMutation.mutateAsync();
  };

  return (
    <section className="relative isolate mx-auto max-w-6xl space-y-6 overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none absolute -left-28 top-20 -z-10 h-64 w-64 rounded-full" />
      <div className="pointer-events-none absolute -right-24 top-44 -z-10 h-72 w-72 rounded-full" />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="mt-1 text-2xl font-semibold text-black sm:text-3xl">{getTitle(venue)}</h1>
        </div>
       
      </div>

      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative h-72 w-full sm:h-100">
          {activeImage ? (
            <img
              src={activeImage}
              alt={galleryImages.find((item) => item.url === activeImage)?.alt || venue.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-slate-100 text-slate-500">No image</div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <h2 className="max-w-3xl text-xl font-semibold text-white sm:text-2xl">{venue.name}</h2>
            <p className="mt-1 text-sm text-white/90">{venue.location.city || "Unknown city"}, {venue.location.country || "Unknown country"}</p>
          </div>
          {galleryImages.length > 1 ? (
            <div className="absolute inset-x-0 bottom-0 flex gap-2 overflow-x-auto px-4 pb-4 pt-20 sm:px-6">
              {galleryImages.map((item, index) => {
                const isActive = item.url === activeImage;

                return (
                  <button
                    key={`${item.url}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(item.url)}
                    className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-2xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${isActive ? "border-white shadow-lg" : "border-white/35 opacity-80 hover:opacity-100"}`}
                    aria-label={`Show image ${index + 1}`}
                  >
                    <img src={item.url} alt={item.alt || `${venue.name} media ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <InfoItem label="Price" value={`$${venue.price} / night`} />
          <InfoItem label="Rating" value={venue.rating.toFixed(1)} />
          <InfoItem label="Max guests" value={String(venue.maxGuests)} />
          <InfoItem label="Created" value={toDateTime(venue.created)} />
          <InfoItem label="Updated" value={toDateTime(venue.updated)} />
        </div>
      </article>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <article className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-black">Book this venue</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {isOwner
                    ? "Owners cannot book their own venue from this page."
                    : `Reserve your stay for up to ${venue.maxGuests} guests.`}
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                ${venue.price} / night
              </div>
            </div>

            {isOwner ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Owner mode is active. Go to profile page to edit your bookings or create new ones. {" "}
              </div>
            ) : !session?.accessToken ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                You need to sign in before booking. {" "}
                <Link to="/loginRoute" className="font-medium text-black underline underline-offset-4">
                  Go to login
                </Link>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleBookingSubmit}>
                <div className="flex flex-col gap-4">
                  <div className="space-y-2 text-left">
                    <span className="text-sm font-medium text-slate-800">Check-in</span>
                    <div ref={checkInCalendarRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenCalendar((current) => current === "checkIn" ? null : "checkIn")}
                        className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                        aria-label="Open check-in calendar"
                      >
                        <span>{toCalendarLabel(bookingForm.dateFrom)}</span>
                        <CalendarDays className="size-4 text-slate-600" />
                      </button>
                      <input type="hidden" name="dateFrom" value={bookingForm.dateFrom} />
                      {openCalendar === "checkIn" ? (
                        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                          <BookingCalendar
                            selected={selectedCheckIn}
                            onSelect={handleCheckInSelect}
                            disabled={unavailableDayMatchers}
                            bookedRanges={bookedRanges}
                            pastMatcher={pastDayMatcher}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <span className="text-sm font-medium text-slate-800">Check-out</span>
                    <div ref={checkOutCalendarRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenCalendar((current) => current === "checkOut" ? null : "checkOut")}
                        className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                        aria-label="Open check-out calendar"
                      >
                        <span>{toCalendarLabel(bookingForm.dateTo)}</span>
                        <CalendarDays className="size-4 text-slate-600" />
                      </button>
                      <input type="hidden" name="dateTo" value={bookingForm.dateTo} />
                      {openCalendar === "checkOut" ? (
                        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                          <BookingCalendar
                            selected={selectedCheckOut}
                            onSelect={handleCheckOutSelect}
                            disabled={checkOutDisabledMatchers}
                            bookedRanges={bookedRanges}
                            pastMatcher={pastDayMatcher}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <label className="space-y-2 text-left">
                    <span className="text-sm font-medium text-slate-800">Guests</span>
                    <input
                      type="number"
                      name="guests"
                      min="1"
                      max={String(venue.maxGuests)}
                      value={bookingForm.guests}
                      onChange={handleBookingInputChange}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      required
                    />
                  </label>
                </div>

                <p className="text-sm text-slate-500">
                  Booked dates are marked in red, and past dates are greyed out. Neither can be selected.
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">Your booking request will be submitted immediately if the dates are valid.</p>
                  <Button className="cursor-pointer" type="submit" disabled={bookingMutation.isPending}>
                    {bookingMutation.isPending ? "Booking..." : "Reserve now"}
                  </Button>
                </div>
              </form>
            )}
          </article>

          <article className="space-y-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-black">Description</h2>
            <p className="text-slate-700">{venue.description || "No description provided."}</p>
          </article>

          {isOwner ? (
            <article className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-black">Bookings</h2>
              {bookings.length === 0 ? (
                <p className="text-slate-600">No bookings yet.</p>
              ) : (
                <ul className="space-y-3">
                  {bookings.map((booking) => (
                    <li key={booking.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <InfoItem label="Booking ID" value={booking.id} />
                        <InfoItem label="Date From" value={toDateTime(booking.dateFrom)} />
                        <InfoItem label="Date To" value={toDateTime(booking.dateTo)} />
                        <InfoItem label="Guests" value={String(booking.guests)} />
                        <InfoItem label="Created" value={toDateTime(booking.created)} />
                        <InfoItem label="Updated" value={toDateTime(booking.updated)} />
                        <InfoItem label="Customer Name" value={booking.customer.name} />
                        <InfoItem label="Customer Email" value={booking.customer.email} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ) : null}
        </div>

        <aside className="flex flex-col space-y-6 lg:col-span-4">
          <article className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-black">Location</h2>
            <div className="grid gap-3">
              <InfoItem label="Address" value={venue.location.address || "N/A"} />
              <InfoItem label="City" value={venue.location.city || "N/A"} />
              <InfoItem label="Zip" value={venue.location.zip || "N/A"} />
              <InfoItem label="Country" value={venue.location.country || "N/A"} />
            </div>
          </article>

          <article className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-black">Facilities</h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <FacilityItems label="Wifi" enabled={venue.meta.wifi} />
              <FacilityItems label="Parking" enabled={venue.meta.parking} />
              <FacilityItems label="Breakfast" enabled={venue.meta.breakfast} />
              <FacilityItems label="Pets" enabled={venue.meta.pets} />
            </ul>
          </article>

          <article className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-black">Owner</h2>
            {venue.owner ? (
              <>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {ownerAvatar ? (
                    <img src={ownerAvatar} alt={venue.owner?.avatar?.alt || `${venue.owner?.name} avatar`} className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                      {venue.owner.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-slate-900">{venue.owner.name}</p>
                    <p className="text-sm text-slate-600">{venue.owner.email}</p>
                  </div>
                </div>
                <InfoItem label="Bio" value={venue.owner.bio || "No bio"} />
              </>
            ) : (
              <p className="text-slate-600">No owner data included.</p>
            )}
          </article>
        </aside>
      </div>
    </section>
  );
}

function BookingCalendar({
  selected,
  onSelect,
  disabled,
  bookedRanges,
  pastMatcher,
}: {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  disabled: Matcher[];
  bookedRanges: Array<{ from: Date; to: Date }>;
  pastMatcher: Matcher;
}) {
  return (
    <div className="space-y-3">
      <DayPicker
        mode="single"
        navLayout="after"
        selected={selected}
        onSelect={onSelect}
        disabled={disabled}
        modifiers={{ booked: bookedRanges, past: pastMatcher }}
        modifiersClassNames={{
          booked: "!bg-red-50 !text-red-700 line-through decoration-2 decoration-red-500",
          past: "!bg-slate-100 !text-slate-400 line-through decoration-2 decoration-slate-400",
        }}
        classNames={{
          root: "rdp-root",
          months: "flex",
          month: "flex flex-col gap-3",
          month_grid: "order-2",
          month_caption: "flex items-center justify-between px-1",
          caption_label: "text-sm font-semibold text-slate-900",
          nav: "order-3 flex items-center justify-center gap-2 pt-1",
          button_previous: "grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100",
          button_next: "grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100",
          weekdays: "grid grid-cols-7",
          weekday: "text-center text-xs font-medium uppercase tracking-wide text-slate-400",
          week: "mt-1 grid grid-cols-7",
          day: "grid place-items-center p-0",
          day_button: "grid size-10 place-items-center rounded-xl text-sm text-slate-800 transition hover:bg-slate-100",
          selected: "!bg-black !text-white hover:!bg-black",
          today: "font-semibold text-black ring-1 ring-slate-200",
          disabled: "opacity-100",
          outside: "text-slate-300",
          hidden: "invisible",
        }}
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="inline-block rounded bg-red-50 px-2 py-1 text-red-700 line-through decoration-2 decoration-red-500">Booked</span>
        <span className="inline-block rounded bg-slate-100 px-2 py-1 text-slate-500 line-through decoration-2 decoration-slate-400">Past</span>
        <span>These dates are unavailable.</span>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 line-clamp-3 text-sm text-slate-800">{value}</p>
    </div>
  );
}

function FacilityItems({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <li className={`rounded-xl border px-3 py-2 text-sm ${enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
      <span className="font-medium">{label}</span>: {enabled ? "Available" : "Unavailable"}
    </li>
  );
}
