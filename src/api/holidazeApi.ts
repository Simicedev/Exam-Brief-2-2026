import [ useQuery ] from '@tanstack/react-query'

// ─── Shared Types ───

interface Media {
    url: string;
    alt: string;
}

interface VenueMeta {
    wifi: boolean;
    parking: boolean;
    breakfast: boolean;
    pets: boolean;
}

interface VenueLocation {
    address: string;
    city: string;
    zip: string;
    country: string;
    continent: string;
    lat: number;
    lng: number;
}

interface PaginationMeta {
    isFirstPage: boolean;
    isLastPage: boolean;
    currentPage: number;
    previousPage: number | null;
    nextPage: number | null;
    pageCount: number;
    totalCount: number;
}

interface Profile {
    name: string;
    email: string;
    bio: string;
    avatar: Media;
    banner: Media;
}

// ─── Venue ───

interface VenueBooking {
    id: string;
    dateFrom: string;
    dateTo: string;
    guests: number;
    created: string;
    updated: string;
    customer: Profile;
}

interface Venue {
    id: string;
    name: string;
    description: string;
    media: Media[];
    price: number;
    maxGuests: number;
    rating: number;
    created: string;
    updated: string;
    meta: VenueMeta;
    location: VenueLocation;
    owner?: Profile;
    bookings?: VenueBooking[];
}

interface VenueResponse {
    data: Venue;
    meta: Record<string, unknown>;
}

interface VenueListResponse {
    data: Venue[];
    meta: PaginationMeta;
}

interface CreateVenueRequest {
    name: string;
    description: string;
    media?: Media[];
    price: number;
    maxGuests: number;
    rating?: number;
    meta?: Partial<VenueMeta>;
    location?: Partial<VenueLocation>;
}

interface UpdateVenueRequest {
    name?: string;
    description?: string;
    media?: Media[];
    price?: number;
    maxGuests?: number;
    rating?: number;
    meta?: Partial<VenueMeta>;
    location?: Partial<VenueLocation>;
}

// ─── Booking ───

interface Booking {
    id: string;
    dateFrom: string;
    dateTo: string;
    guests: number;
    created: string;
    updated: string;
    venue?: Venue;
    customer?: Profile;
}

interface BookingResponse {
    data: Booking;
    meta: Record<string, unknown>;
}

interface BookingListResponse {
    data: Booking[];
    meta: PaginationMeta;
}

interface CreateBookingRequest {
    venueId: string;
    dateFrom: string;
    dateTo: string;
    guests: number;
}

interface UpdateBookingRequest {
    dateFrom?: string;
    dateTo?: string;
    guests?: number;
}

// ─── Profile ───

interface HolidazeProfile {
    name: string;
    email: string;
    bio: string;
    avatar: Media;
    banner: Media;
    venueManager: boolean;
    venues?: Venue[];
    bookings?: Booking[];
    _count: {
        venues: number;
        bookings: number;
    };
}

interface ProfileResponse {
    data: HolidazeProfile;
    meta: Record<string, unknown>;
}

interface ProfileListResponse {
    data: HolidazeProfile[];
    meta: PaginationMeta;
}

interface UpdateProfileRequest {
    bio?: string;
    avatar?: Media;
    banner?: Media;
    venueManager?: boolean;
}

