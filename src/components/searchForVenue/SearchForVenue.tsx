import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { CalendarDays, Search, Users } from "lucide-react"

import { apiClient } from "../../api/apiClient"

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 12
const SUGGESTION_LIMIT = 5
const SEARCH_QUERY_PARAM = "q"

function toPositiveNumber(value: string | null, fallback: number) {
	const parsedValue = Number(value)

	if (!Number.isFinite(parsedValue) || parsedValue < 1) {
		return fallback
	}

	return parsedValue
}

function buildSearchParams(query: string, page: number, limit: number) {
	return {
		page,
		limit,
		...(query ? { [SEARCH_QUERY_PARAM]: query } : {}),
	}
}

function sanitizeLocationInput(value: string) {
	return value.replace(/\d+/g, "")
}

export default function SearchForVenue() {
	const navigate = useNavigate()
	const checkInDateInputRef = React.useRef<HTMLInputElement | null>(null)
	const returnDateInputRef = React.useRef<HTMLInputElement | null>(null)
	const searchInputRef = React.useRef<HTMLInputElement | null>(null)
	const suggestionBoxRef = React.useRef<HTMLDivElement | null>(null)
	const { pathname, searchStr } = useRouterState({
		select: (state) => ({
			pathname: state.location.pathname,
			searchStr: state.location.searchStr,
		}),
	})

	const currentParams = React.useMemo(() => new URLSearchParams(searchStr), [searchStr])
	const query = currentParams.get(SEARCH_QUERY_PARAM)?.trim() ?? ""
	const selectedDate = currentParams.get("date") ?? ""
	const returnDate = currentParams.get("returnDate") ?? ""
	const guestCount = currentParams.get("guests") ?? ""
	const page = toPositiveNumber(currentParams.get("page"), DEFAULT_PAGE)
	const limit = toPositiveNumber(currentParams.get("limit"), DEFAULT_LIMIT)
	const [draftQuery, setDraftQuery] = React.useState(query)
	const [draftDate, setDraftDate] = React.useState(selectedDate)
	const [draftReturnDate, setDraftReturnDate] = React.useState(returnDate)
	const [draftGuests, setDraftGuests] = React.useState(guestCount)
	const [showSuggestions, setShowSuggestions] = React.useState(false)

	React.useEffect(() => {
		setDraftQuery(query)
		setDraftDate(selectedDate)
		setDraftReturnDate(returnDate)
		setDraftGuests(guestCount)
	}, [guestCount, query, returnDate, selectedDate])

	React.useEffect(() => {
		if (draftDate && draftReturnDate && draftReturnDate < draftDate) {
			setDraftReturnDate("")
		}
	}, [draftDate, draftReturnDate])

	React.useEffect(() => {
		if (!showSuggestions) {
			return
		}

		const handlePointerDown = (event: MouseEvent) => {
			const target = event.target as Node

			if (suggestionBoxRef.current?.contains(target) || searchInputRef.current?.contains(target)) {
				return
			}

			setShowSuggestions(false)
		}

		document.addEventListener("mousedown", handlePointerDown)

		return () => {
			document.removeEventListener("mousedown", handlePointerDown)
		}
	}, [showSuggestions])

	useQuery({
		queryKey: ["venues", "toolbar", query, page, limit],
		queryFn: () => apiClient.venues.list(buildSearchParams(query, page, limit)),
		staleTime: 30_000,
	})

	const suggestionQuery = useQuery({
		queryKey: ["venues", "toolbar-suggestions", draftQuery.trim()],
		queryFn: () =>
			apiClient.venues.list({
				[SEARCH_QUERY_PARAM]: draftQuery.trim(),
				page: DEFAULT_PAGE,
				limit: SUGGESTION_LIMIT,
			}),
		enabled: draftQuery.trim().length >= 2,
		staleTime: 30_000,
	})

	const applyFilters = React.useCallback(
		async (nextFilters: { query: string; date: string; returnDate: string; guests: string; page?: number }) => {
			const nextPage = nextFilters.page ?? DEFAULT_PAGE

			await navigate({
				to: "/venuesListRoute",
				search: true,
				hash: "",
				params: {},
				replace: pathname === "/venuesListRoute",
			})

			const nextUrl = new URL(window.location.href)
			nextUrl.searchParams.set("page", String(nextPage))
			nextUrl.searchParams.set("limit", String(limit))

			if (nextFilters.query) {
				nextUrl.searchParams.set(SEARCH_QUERY_PARAM, nextFilters.query)
			} else {
				nextUrl.searchParams.delete(SEARCH_QUERY_PARAM)
			}

			if (nextFilters.date) {
				nextUrl.searchParams.set("date", nextFilters.date)
			} else {
				nextUrl.searchParams.delete("date")
			}

			if (nextFilters.returnDate) {
				nextUrl.searchParams.set("returnDate", nextFilters.returnDate)
			} else {
				nextUrl.searchParams.delete("returnDate")
			}

			if (nextFilters.guests) {
				nextUrl.searchParams.set("guests", nextFilters.guests)
			} else {
				nextUrl.searchParams.delete("guests")
			}

			window.history.replaceState({}, "", `${nextUrl.pathname}?${nextUrl.searchParams.toString()}`)
			window.dispatchEvent(new PopStateEvent("popstate"))
		},
		[limit, navigate, pathname],
	)

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setShowSuggestions(false)

		await applyFilters({
			query: draftQuery.trim(),
			date: draftDate,
			returnDate: draftReturnDate,
			guests: draftGuests,
			page: DEFAULT_PAGE,
		})
	}

	const openDatePicker = (input: HTMLInputElement | null) => {
		if (typeof input?.showPicker === "function") {
			input.showPicker()
			return
		}

		input?.focus()
		input?.click()
	}

	const suggestions = (suggestionQuery.data?.data ?? []).map((venue) => ({
		id: venue.id,
		label: venue.location.city || venue.location.country || venue.name,
		subLabel: venue.name,
	}))

	const handleLocationChange = (value: string) => {
		setDraftQuery(sanitizeLocationInput(value))
		setShowSuggestions(true)
	}

	const handleLocationKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (/\d/.test(event.key)) {
			event.preventDefault()
		}
	}

	const handleSuggestionSelect = (value: string) => {
		setDraftQuery(value)
		setShowSuggestions(false)
		searchInputRef.current?.focus()
	}

	return (
		<section className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur-lg">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<form className="grid flex-1 gap-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto]" onSubmit={handleSubmit}>
						<div className="relative min-w-0">
							<label className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2 shadow-sm">
								<Search className="size-4 shrink-0 text-muted-foreground" />
								<div className="min-w-0 flex-1 text-left">
									<span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
										Where to?
									</span>
									<input
										ref={searchInputRef}
										type="search"
										value={draftQuery}
										onChange={(event) => handleLocationChange(event.target.value)}
										onFocus={() => setShowSuggestions(true)}
										onKeyDown={handleLocationKeyDown}
										placeholder="Search venues by name or destination"
										inputMode="text"
										className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
									/>
								</div>
							</label>

							{showSuggestions && draftQuery.trim().length >= 2 ? (
								<div
									ref={suggestionBoxRef}
									className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-border bg-white p-2 shadow-xl"
								>
									{suggestionQuery.isLoading ? (
										<p className="px-3 py-2 text-sm text-muted-foreground">Looking up destinations...</p>
									) : suggestions.length > 0 ? (
										<div className="space-y-1">
											{suggestions.map((suggestion) => (
												<button
													key={suggestion.id}
													type="button"
													onClick={() => handleSuggestionSelect(suggestion.label)}
													className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-muted"
												>
													<span className="block text-sm font-medium text-foreground">{suggestion.label}</span>
													<span className="block text-xs text-muted-foreground">{suggestion.subLabel}</span>
												</button>
											))}
										</div>
									) : (
										<p className="px-3 py-2 text-sm text-muted-foreground">No matching destinations found.</p>
									)}
								</div>
							) : null}
						</div>

						<div className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2 shadow-sm">
							<button
								type="button"
								onClick={() => openDatePicker(checkInDateInputRef.current)}
								className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
								aria-label="Open date picker"
							>
								<CalendarDays className="size-4" />
							</button>
							<div className="min-w-0 flex-1 text-left">
								<span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
									Check-in date
								</span>
								<input
									ref={checkInDateInputRef}
									type="date"
									value={draftDate}
									onChange={(event) => setDraftDate(event.target.value)}
									className="w-full bg-transparent text-sm text-foreground outline-none"
								/>
							</div>
						</div>

						<div className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2 shadow-sm">
							<button
								type="button"
								onClick={() => openDatePicker(returnDateInputRef.current)}
								className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
								aria-label="Open return date picker"
							>
								<CalendarDays className="size-4" />
							</button>
							<div className="min-w-0 flex-1 text-left">
								<span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
									Return date
								</span>
								<input
									ref={returnDateInputRef}
									type="date"
									value={draftReturnDate}
									min={draftDate || undefined}
									onChange={(event) => setDraftReturnDate(event.target.value)}
									className="w-full bg-transparent text-sm text-foreground outline-none"
								/>
							</div>
						</div>

						<label className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2 shadow-sm">
							<Users className="size-4 shrink-0 text-muted-foreground" />
							<div className="min-w-0 flex-1 text-left">
								<span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
									How many guests?
								</span>
								<input
									type="number"
									min="1"
									step="1"
									value={draftGuests}
									onChange={(event) => setDraftGuests(event.target.value)}
									placeholder="2"
									className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
								/>
							</div>
						</label>

						<button
							type="submit"
							className="inline-flex h-14 items-center justify-center rounded-2xl bg-(--main-color) px-5 text-sm font-semibold text-white transition hover:opacity-90"
						>
							Search
						</button>
					</form>
				</div>
			</div>
		</section>
	)
}