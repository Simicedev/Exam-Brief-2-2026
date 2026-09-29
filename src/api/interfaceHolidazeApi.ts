export type Media = {
    url: string;
    alt?: string;
};

export type PaginationMeta = {
    isFirstPage: boolean;
    isLastPage: boolean;
    currentPage: number;
    previousPage: number | null;
    nextPage: number | null;
    pageCount: number;
    totalCount: number;
};

export type ApiResponse<T, TMeta = Record<string, unknown>> = {
    data: T;
    meta: TMeta;
};

export type ApiListResponse<T> = ApiResponse<T[], PaginationMeta>;

export type Profile = {
    name: string;
    email: string;
    bio: string;
    avatar?: Media;
    banner?: Media;
};

export type Venue = {
    id: string;
    name: string;
    description: string;
    media?: Media[];
    price: number;
    maxGuests: number;
    rating: number;
    created: string;
    updated: string;
    meta: {
        wifi: boolean;
        parking: boolean;
        breakfast: boolean;
        pets: boolean;
    };
    location: {
        address: string;
        city: string;
        zip: string;
        country: string;
        continent: string;
        lat: number;
        lng: number;
    };
    owner?: Profile;
    bookings?: Array<{
        id: string;
        dateFrom: string;
        dateTo: string;
        guests: number;
        created: string;
        updated: string;
        customer: Profile;
    }>;
};

export type Booking = {
    id: string;
    dateFrom: string;
    dateTo: string;
    guests: number;
    created: string;
    updated: string;
    venue?: Venue;
    customer?: Profile;
};

export type VenueManagerProfile = Profile & {
    venueManager: boolean;
    venues?: Venue[];
    bookings?: Booking[];
    _count: {
        venues: number;
        bookings: number;
    };
};

export type VenuePayload = {
    name: string;
    description: string;
    media?: Venue["media"];
    price: number;
    maxGuests: number;
    rating?: number;
    meta?: Partial<Venue["meta"]>;
    location?: Partial<Venue["location"]>;
};

export type BookingPayload = {
    venueId: string;
    dateFrom: string;
    dateTo: string;
    guests: number;
};

export type VenueResponse = ApiResponse<Venue>;

export type VenueListResponse = ApiListResponse<Venue>;

export type CreateVenueRequest = VenuePayload;

export type UpdateVenueRequest = Partial<VenuePayload>;


export type BookingResponse = ApiResponse<Booking>;

export type BookingListResponse = ApiListResponse<Booking>;

export type CreateBookingRequest = BookingPayload;

export type UpdateBookingRequest = Partial<Omit<BookingPayload, "venueId">>;


export type ProfileResponse = ApiResponse<VenueManagerProfile>;

export type ProfileListResponse = ApiListResponse<VenueManagerProfile>;

export type UpdateProfileRequest = Partial<Pick<VenueManagerProfile, "bio" | "avatar" | "banner" | "venueManager">>;

export type RegisteredProfile = Profile & {
    venueManager: boolean;
};

export type AuthSession = RegisteredProfile & {
    accessToken: string;
};

export type RegisterRequest = {
    name: string;
    email: string;
    password: string;
    bio?: string;
    avatar?: Media;
    banner?: Media;
    venueManager?: boolean;
};

export type LoginRequest = {
    email: string;
    password: string;
};

export type RegisterResponse = ApiResponse<RegisteredProfile>;

export type LoginResponse = ApiResponse<AuthSession>;

