/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
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
  price: number;
  rating: number;
  maxGuests: number;
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
      price: venue.price,
      rating: venue.rating ?? 0,
      maxGuests: venue.maxGuests,
      
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
      <div className="space-y-2 p-4 text-center">
        <h1 className="text-2xl text-black">Welcome to VayCay!</h1>
        <p className="text-sm text-slate-600">
          Discover your next vacation spot with us. Explore popular areas and find the perfect venue for your stay.
        </p>
        <Link to="/venuesListRoute" className="text-blue-500 hover:underline">
          <Button className="bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 hover:cursor-pointer">View all venues</Button>
        </Link>
      </div>
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
                  <Link
                    className="flex"
                    to="/venuesListRoute"
                    search={{ country: area.country }}
                  > <Button className="bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 hover:cursor-pointer">View more in {area.country}</Button>
                  </Link>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {area.venues.map((venue) => {
                    const clampedRating = Math.max(0, Math.min(5, venue.rating ?? 0));
                    const roundedRating = Math.round(clampedRating);

                    return (
                      <Card key={venue.id} className="overflow-hidden">
                        <img
                          src={venue.imageUrl}
                          alt={venue.name}
                          className="h-40 w-full object-cover"
                        />
                        <CardHeader>
                          <CardTitle className="text-black">{venue.name}</CardTitle>
                          <CardDescription className="text-slate-600">
                            ${venue.price} per night
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-sm text-slate-600">
                            Max - {venue.maxGuests} Guests
                          </CardDescription>
                        </CardContent>
                        <CardContent>
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
                            <Button className="bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 hover:cursor-pointer" size="sm">View Details</Button>
                          </Link>
                        </CardFooter>
                      </Card>
                    );
                  })}
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
