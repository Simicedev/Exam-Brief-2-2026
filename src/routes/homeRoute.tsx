/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, MapPin, Users } from "lucide-react";
import { apiClient } from "../api/apiClient";
import type { Venue } from "../api/interfaceHolidazeApi";
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


type VenuePreview = {
  id: string;
  name: string;
  imageUrl: string;
  city: string;
  price: number;
  rating: number;
  maxGuests: number;
  amenities: string[];
};

type PopularArea = {
  country: string;
  venues: VenuePreview[];
  totalGuests: number;
};

const fetchVenues = async () => {
  const response = await apiClient.venues.list({
    _bookings: true,
    limit: 100,
  });

  return response.data;
};

function toPopularAreas(venues: Venue[]): PopularArea[] {
  const grouped = new Map<string, PopularArea>();

  for (const venue of venues) {
    const country = venue.location.country?.trim();
    const imageUrl = venue.media?.[0]?.url?.trim();

    // Only keep venues with a valid area name and a display image.
    if (!country || !imageUrl) {
      continue;
    }

    const key = country.toLowerCase();
    const bookings = venue.bookings ?? [];
    const totalGuests = bookings.reduce((sum, booking) => sum + booking.guests, 0);

    const preview: VenuePreview = {
      id: venue.id,
      name: venue.name,
      imageUrl,
      city: venue.location.city?.trim() ?? "",
      price: venue.price,
      rating: venue.rating ?? 0,
      maxGuests: venue.maxGuests,
      amenities: [
        venue.meta?.wifi && "Wi-Fi",
        venue.meta?.parking && "Parking",
        venue.meta?.breakfast && "Breakfast",
        venue.meta?.pets && "Pets welcome",
      ].filter((amenity): amenity is string => Boolean(amenity)),
    };

    const existing = grouped.get(key);

    if (existing) {
      
      existing.totalGuests += totalGuests;
      if (existing.venues.length < 3) {
        existing.venues.push(preview);
      }
      existing.venues = existing.venues.slice(0, 3);
      continue;
    }

    grouped.set(key, {
      country,
      venues: [preview],
      totalGuests,
    });

  }

  return Array.from(grouped.values())
    .filter((area) => area.venues.length >= 3)
    .sort((a, b) => b.totalGuests - a.totalGuests);
}

export const Route = createFileRoute("/homeRoute")({
  component: HomePageRoute,
});

function HomePageRoute() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["venues", "popular-areas"],
    queryFn: fetchVenues,
  });

  React.useEffect(() => {
    if (isError) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to fetch popular areas: ${message}`);
    }
  }, [isError, error]);

  const popularAreas = React.useMemo(() => toPopularAreas(data ?? []), [data]);
  return (
    <div className="space-y-4 p-2 md:p-4 lg:p-6">
      <section className="flex min-h-95 items-end overflow-hidden bg-[#232c3d] px-6 py-10 sm:min-h-115 sm:px-10 sm:py-12 lg:px-16">
        <div className="max-w-2xl text-left text-white">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
            Find your somewhere
          </p>
          <h1 className="font-serif text-6xl leading-none sm:text-7xl">VayCay</h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
            Distinctive stays for slower mornings, brighter days, and stories worth bringing home.
          </p>
          <Link to="/venuesListRoute" className="mt-7 inline-flex">
            <Button className="bg-amber-200 px-5 py-2.5 text-sm font-semibold text-[#232c3d] transition hover:bg-amber-100 hover:cursor-pointer">
              View all venues
            </Button>
          </Link>
        </div>
      </section>
      <section>
        <p className="flex text-black italic">Explore popular areas</p>

        <SkeletonCard isLoading={isLoading} />

        {!isLoading && popularAreas.length === 0 && (
          <p className="text-black">No venue data available yet.</p>
        )}

        {!isLoading && popularAreas.length > 0 && (
          <ol className="space-y-6">
            
            {popularAreas.slice(0, 3).map((area) => (
              
              <li key={`${area.country}`} className="flex flex-col border-t border-b p-4 shadow-sm text-white">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {area.country}
                    </p>
                  </div>
                  
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {area.venues.map((venue) => {
                    const clampedRating = Math.max(0, Math.min(5, venue.rating ?? 0));
                    const roundedRating = Math.round(clampedRating);

                    return (
                      <Card key={venue.id} className="group/card overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                        <div className="h-44 overflow-hidden bg-slate-100">
                          <img
                            src={venue.imageUrl}
                            alt={venue.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                          />
                        </div>
                        <CardHeader className="gap-2 px-5 pb-2 pt-5">
                          <CardTitle className="line-clamp-1 text-lg font-semibold text-[#232c3d]">{venue.name}</CardTitle>
                          <CardDescription className="flex items-baseline gap-1 text-[#232c3d]">
                            <span className="text-lg font-bold">${venue.price}</span>
                            <span className="text-xs font-medium text-slate-500">/ night</span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 px-5 pb-5">
                          {venue.city ? (
                            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                              <MapPin aria-hidden="true" className="size-4 shrink-0 text-amber-700" />
                              <span className="line-clamp-1">{venue.city}, {area.country}</span>
                            </p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              <Users aria-hidden="true" className="size-3.5 text-[#232c3d]" />
                              Up to {venue.maxGuests} guests
                            </span>
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"
                              aria-label={`${clampedRating.toFixed(1)} out of 5 stars`}
                              title={`${clampedRating.toFixed(1)} / 5`}
                            >
                              <span aria-hidden="true" className="text-amber-600">
                                {"★".repeat(roundedRating)}{"☆".repeat(5 - roundedRating)}
                              </span>
                              {clampedRating.toFixed(1)}
                            </span>
                          </div>
                          {venue.amenities.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {venue.amenities.slice(0, 3).map((amenity) => (
                                <span key={amenity} className="rounded-sm border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                  {amenity}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </CardContent>
                        <CardFooter className="mt-auto border-t border-slate-100 bg-slate-50/70 px-5 py-4">
                          <Link to="/specificVenueRoute" search={{ id: venue.id }}>
                            <Button className="group/button h-10 w-full justify-between gap-2 rounded-full bg-[#232c3d] px-5 text-white shadow-sm transition-all hover:cursor-pointer hover:bg-[#35445c] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#e7b85c]" size="sm">
                              View Details
                              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover/button:translate-x-1" />
                            </Button>
                          </Link>
                        </CardFooter>
                        
                      </Card>
                      
                    );
                    
                  })}
                  <Link
                    className="col-span-full justify-self-end"
                    to="/venuesListRoute"
                    search={{ country: area.country }}
                  >
                    <Button className="bg-amber-200 px-4 py-2.5 text-sm font-semibold text-[#232c3d] transition hover:bg-amber-100 hover:cursor-pointer">
                      View more in {area.country}
                    </Button>
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="text-black">15% Off This Week</CardTitle>
            <CardDescription className="text-slate-700">
              Use code <span className="font-semibold text-black">GETAWAY15</span> before it is too late.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>Plan your next stay today and save on selected destinations.</p>
            <p>Perfect for weekend trips, family holidays, and last-minute escapes.</p>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-slate-600">Offer shown for design preview only.</p>
          </CardFooter>
        </Card>

        <Card className="border border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-black">Loyalty Points Rewards</CardTitle>
            <CardDescription className="text-slate-700">
              Collect points every time you book and unlock member perks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>Earn points on each reservation and use them toward future stays.</p>
            <p>More bookings means better rewards, upgrades, and exclusive deals.</p>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-slate-600">Visual card only, no functionality attached.</p>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}
