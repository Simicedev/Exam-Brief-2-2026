/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiClient } from "../api/apiClient";
import type { Venue } from "../api/interfaceHolidazeApi";
import { Link } from "@tanstack/react-router";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import SkeletonCard from "@/components/skeletonCard/SkeletonCard";

type VenuesSearch = {
  city?: string;
  country?: string;
  query?: string;
  date?: string;
  returnDate?: string;
  guests?: number;
  page?: number;
};

type VenuesQueryResult = {
  venues: Venue[];
  totalPages: number;
};

const API_PAGE_SIZE = 21;
const DISPLAY_PAGE_SIZE = 21;

const toPositiveNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
};

const fetchVenuesPage = async (page: number) => {
  return apiClient.venues.list({
    _bookings: true,
    page,
    limit: API_PAGE_SIZE,
    sort: "created",
    sortOrder: "desc",
  });
};

const fetchAllVenues = async () => {
  const venues: Venue[] = [];
  let page = 1;
  let isLastPage = false;

  while (!isLastPage) {
    const response = await fetchVenuesPage(page);
    venues.push(...response.data);
    isLastPage = response.meta.isLastPage;
    page += 1;
  }

  return venues;
};

const hasDateOverlap = (venue: Venue, selectedFrom: Date, selectedTo: Date) => {
  const bookings = venue.bookings ?? [];

  return bookings.some((booking) => {
    const bookingFrom = new Date(booking.dateFrom);
    const bookingTo = new Date(booking.dateTo);

    return selectedFrom <= bookingTo && selectedTo >= bookingFrom;
  });
};

export const Route = createFileRoute("/venuesListRoute")({
  validateSearch: (search: Record<string, unknown>): VenuesSearch => ({
    city: typeof search.city === "string" ? search.city : undefined,
    country: typeof search.country === "string" ? search.country : undefined,
    query:
      typeof search.query === "string"
        ? search.query.trim()
        : typeof search.q === "string"
          ? search.q.trim()
          : undefined,
    date: typeof search.date === "string" ? search.date : undefined,
    returnDate: typeof search.returnDate === "string" ? search.returnDate : undefined,
    guests: toPositiveNumber(search.guests),
    page: toPositiveNumber(search.page),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const isAreaView = Boolean(search.city || search.country);
  const currentPage = search.page ?? 1;
  const loadingLabel = search.city && search.country
    ? `Loading venues in ${search.city}, ${search.country}...`
    : search.country
      ? `Loading venues in ${search.country}...`
      : "Loading venues...";
  const hasActiveFilters = Boolean(
    search.city || search.country || search.query || search.date || search.returnDate || search.guests,
  );
  
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "venues",
      "list",
      hasActiveFilters ? "filtered-all-pages" : "single-page",
      hasActiveFilters ? null : currentPage,
    ],
    queryFn: async () => {
      if (hasActiveFilters) {
        const venues = await fetchAllVenues();
        return {
          venues,
          totalPages: Math.max(1, Math.ceil(venues.length / DISPLAY_PAGE_SIZE)),
        } satisfies VenuesQueryResult;
      }

      const response = await fetchVenuesPage(currentPage);
      return {
        venues: response.data,
        totalPages: response.meta.pageCount,
      } satisfies VenuesQueryResult;
    },
    staleTime: hasActiveFilters ? 5 * 60_000 : 30_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, queryError) => {
      if (queryError instanceof ApiError && queryError.status === 429) {
        return false;
      }

      return failureCount < 2;
    },
  });

  React.useEffect(() => {
    if (isError) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to fetch venues: ${message}`);
    }
  }, [isError, error]);

  const setPage = React.useCallback(
    (nextPage: number) => {
      navigate({
        to: "/venuesListRoute",
        search: (prev) => ({ ...prev, page: Math.max(1, nextPage) }),
        replace: true,
      });
    },
    [navigate],
  );

  const filterKey = `${search.city ?? ""}|${search.country ?? ""}|${search.query ?? ""}|${search.date ?? ""}|${search.returnDate ?? ""}|${search.guests ?? ""}`;
  const previousFilterKey = React.useRef(filterKey);

  React.useEffect(() => {
    if (previousFilterKey.current !== filterKey) {
      previousFilterKey.current = filterKey;
      setPage(1);
    }
  }, [filterKey, setPage]);

  const filteredVenues = React.useMemo(() => {
    const venues = data?.venues ?? [];
    const query = search.query?.toLowerCase() ?? "";
    const queryTokens = query
      .split(/[^a-z0-9]+/i)
      .map((token) => token.trim())
      .filter(Boolean);
    const selectedFrom = search.date ? new Date(search.date) : undefined;
    const selectedTo = search.returnDate ? new Date(search.returnDate) : undefined;

    const matchingVenues = venues.filter((venue: Venue) => {
      const hasImage = Boolean(venue.media?.[0]?.url?.trim());
      const matchesCity = search.city
        ? venue.location.city?.toLowerCase() === search.city.toLowerCase()
        : true;
      const matchesCountry = search.country
        ? venue.location.country?.toLowerCase() === search.country.toLowerCase()
        : true;
      const searchableText = `${venue.name} ${venue.location.city ?? ""} ${venue.location.country ?? ""}`.toLowerCase();
      const matchesQuery = queryTokens.length > 0
        ? queryTokens.every((token) => searchableText.includes(token))
        : true;
      const matchesGuests = search.guests ? venue.maxGuests === search.guests : true;

      const matchesAvailability =
        selectedFrom && selectedTo ? !hasDateOverlap(venue, selectedFrom, selectedTo) : true;

      return hasImage && matchesCity && matchesCountry && matchesQuery && matchesGuests && matchesAvailability;
    });

    return matchingVenues.sort((a, b) => {
      const aCreated = Date.parse(a.created);
      const bCreated = Date.parse(b.created);

      return (Number.isNaN(bCreated) ? 0 : bCreated) - (Number.isNaN(aCreated) ? 0 : aCreated);
    });
  }, [data, search.city, search.country, search.query, search.date, search.returnDate, search.guests]);

  const totalPages = hasActiveFilters
    ? Math.max(1, Math.ceil(filteredVenues.length / DISPLAY_PAGE_SIZE))
    : data?.totalPages ?? currentPage;

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const hasPrevPage = safeCurrentPage > 1;
  const hasNextPage = safeCurrentPage < totalPages;

  const visibleVenues = React.useMemo(() => {
    if (!hasActiveFilters) {
      return filteredVenues;
    }

    const start = (safeCurrentPage - 1) * DISPLAY_PAGE_SIZE;
    return filteredVenues.slice(start, start + DISPLAY_PAGE_SIZE);
  }, [filteredVenues, hasActiveFilters, safeCurrentPage]);

  React.useEffect(() => {
    if (isLoading) {
      return;
    }

    if (currentPage > totalPages) {
      setPage(totalPages);
    }
  }, [currentPage, totalPages, isLoading, setPage]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTypingTarget) {
        return;
      }

      if (event.key === "ArrowRight" && hasNextPage) {
        setPage(safeCurrentPage + 1);
      }

      if (event.key === "ArrowLeft" && hasPrevPage) {
        setPage(safeCurrentPage - 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [hasNextPage, hasPrevPage, safeCurrentPage, setPage]);

  return (
    <section className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-black">
          {search.city && search.country
            ? `Venues in ${search.city}, ${search.country}`
            : isAreaView
              ? `Destinations in ${search.country}`
              : "Explore all venues"}
        </h1>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage(safeCurrentPage - 1)}
            disabled={!hasPrevPage}
            className="rounded border px-3 py-2 text-sm text-black cursor-pointer disabled:opacity-40"
            aria-label="Go to previous page"
          >
            &larr;
          </button>
          <p className="text-sm text-slate-600">
            Page {safeCurrentPage} of {totalPages}
          </p>
          <button
            type="button"
            onClick={() => setPage(safeCurrentPage + 1)}
            disabled={!hasNextPage}
            className="rounded border px-3 py-2 text-sm text-black cursor-pointer disabled:opacity-40"
            aria-label="Go to next page"
          >
            &rarr;
          </button>
        </div>
       
      </div>

      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-medium text-slate-800">{loadingLabel}</p>
          <p className="text-xs text-slate-600">Please wait while we fetch available venues.</p>
        </div>
      ) : null}

      <SkeletonCard isLoading={isLoading} />

      {!isLoading && filteredVenues.length === 0 && <p className="text-black">No venues found for this area.</p>}

      {!isLoading && filteredVenues.length > 0 && (
        <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleVenues.map((venue) => {
            const clampedRating = Math.max(0, Math.min(5, venue.rating ?? 0));
            const roundedRating = Math.round(clampedRating);
            
            return (
              <Card key={venue.id} className="overflow-hidden">
                <img
                  src={venue.media?.[0]?.url || ""}
                  alt={venue.media?.[0]?.alt || venue.name}
                  className="h-48 w-full object-cover"
                />
                <CardHeader>
                  <CardTitle className="text-black">{venue.name}</CardTitle>
                  <CardDescription className="text-slate-600">
                    ${venue.price} per night
                  </CardDescription>
                  <CardDescription className="text-sm text-slate-600">
                    Max - {venue.maxGuests} Guests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-slate-600">
                    {venue.location.city}, {venue.location.country}
                  </CardDescription>
                  <div
                    className="text-sm text-amber-500"
                    aria-label={`${clampedRating.toFixed(1)} out of 5 stars`}
                    title={`${clampedRating.toFixed(1)} / 5`}
                  >
                    {"★".repeat(roundedRating)}
                    {"☆".repeat(5 - roundedRating)}
                    <span className="ml-2 text-slate-600">{clampedRating.toFixed(1)}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <Link to="/specificVenueRoute" search={{ id: venue.id }}>
                    <Button size="sm">View Details</Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
        
        </>
      )}
    </section>
  );
}
