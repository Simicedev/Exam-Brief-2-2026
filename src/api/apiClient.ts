import type {
	BookingListResponse,
	BookingResponse,
	CreateBookingRequest,
	CreateVenueRequest,
	LoginRequest,
	LoginResponse,
	ProfileListResponse,
	ProfileResponse,
	RegisterRequest,
	RegisterResponse,
	UpdateBookingRequest,
	UpdateProfileRequest,
	UpdateVenueRequest,
	VenueListResponse,
	VenueResponse,
} from "./interfaceHolidazeApi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://v2.api.noroff.dev";
const API_KEY = import.meta.env.VITE_API_KEY || "";

type QueryValue = string | number | boolean | null | undefined;

type RequestOptions = {
	method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	token?: string;
	body?: unknown;
	searchParams?: Record<string, QueryValue>;
};

export class ApiError extends Error {
	status: number;
	details?: unknown;

	constructor(message: string, status: number, details?: unknown) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.details = details;
	}
}

function buildUrl(path: string, searchParams?: Record<string, QueryValue>) {
	const url = new URL(path, API_BASE_URL);

	if (searchParams) {
		Object.entries(searchParams).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				url.searchParams.set(key, String(value));
			}
		});
	}

	return url;
}

function buildHeaders(token?: string, hasBody?: boolean) {
	const headers = new Headers({
		"X-Noroff-API-Key": API_KEY,
	});

	if (hasBody) {
		headers.set("Content-Type", "application/json");
	}

	if (token) {
		headers.set("Authorization", `Bearer ${token}`);
	}

	return headers;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const { method = "GET", token, body, searchParams } = options;
	const response = await fetch(buildUrl(path, searchParams), {
		method,
		headers: buildHeaders(token, body !== undefined),
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});

	const payload = await response.json().catch(() => null);

	if (!response.ok) {
		throw new ApiError(
			typeof payload?.errors?.[0]?.message === "string"
				? payload.errors[0].message
				: `Request failed with status ${response.status}`,
			response.status,
			payload,
		);
	}

	return payload as T;
}

export const apiClient = {
	auth: {
		register(payload: RegisterRequest) {
			return request<RegisterResponse>("/auth/register", {
				method: "POST",
				body: payload,
				searchParams: {
					_holidaze: true,
				},
			});
		},

		login(payload: LoginRequest) {
			return request<LoginResponse>("/auth/login", {
				method: "POST",
				body: payload,
				searchParams: {
					_holidaze: true,
				},
			});
		},
	},

	venues: {
		list(searchParams?: Record<string, QueryValue>) {
			return request<VenueListResponse>("/holidaze/venues", { searchParams });
		},

		get(id: string, searchParams?: Record<string, QueryValue>) {
			return request<VenueResponse>(`/holidaze/venues/${id}`, { searchParams });
		},

		create(token: string, payload: CreateVenueRequest) {
			return request<VenueResponse>("/holidaze/venues", {
				method: "POST",
				token,
				body: payload,
			});
		},

		update(id: string, token: string, payload: UpdateVenueRequest) {
			return request<VenueResponse>(`/holidaze/venues/${id}`, {
				method: "PUT",
				token,
				body: payload,
			});
		},

		remove(id: string, token: string) {
			return request<{ meta: Record<string, never> }>(`/holidaze/venues/${id}`, {
				method: "DELETE",
				token,
			});
		},
	},

	bookings: {
		list(searchParams?: Record<string, QueryValue>) {
			return request<BookingListResponse>("/holidaze/bookings", { searchParams });
		},

		get(id: string, searchParams?: Record<string, QueryValue>) {
			return request<BookingResponse>(`/holidaze/bookings/${id}`, { searchParams });
		},

		create(token: string, payload: CreateBookingRequest) {
			return request<BookingResponse>("/holidaze/bookings", {
				method: "POST",
				token,
				body: payload,
			});
		},

		update(id: string, token: string, payload: UpdateBookingRequest) {
			return request<BookingResponse>(`/holidaze/bookings/${id}`, {
				method: "PUT",
				token,
				body: payload,
			});
		},

		remove(id: string, token: string) {
			return request<{ meta: Record<string, never> }>(`/holidaze/bookings/${id}`, {
				method: "DELETE",
				token,
			});
		},
	},

	profiles: {
		list(searchParams?: Record<string, QueryValue>) {
			return request<ProfileListResponse>("/holidaze/profiles", { searchParams });
		},

		get(name: string, searchParams?: Record<string, QueryValue>, token?: string) {
			return request<ProfileResponse>(`/holidaze/profiles/${name}`, { searchParams, token });
		},

		update(name: string, token: string, payload: UpdateProfileRequest) {
			return request<ProfileResponse>(`/holidaze/profiles/${name}`, {
				method: "PUT",
				token,
				body: payload,
			});
		},
	},
};

export type ApiClient = typeof apiClient;

