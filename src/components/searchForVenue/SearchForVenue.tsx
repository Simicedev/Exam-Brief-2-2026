import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { DayPicker, type Matcher } from "react-day-picker"
import "react-day-picker/style.css"
import { CalendarDays, Search, Users } from "lucide-react"

import { ApiError, apiClient } from "../../api/apiClient"

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 12
const SUGGESTION_LIMIT = 5
const SUGGESTION_SOURCE_LIMIT = 100
const SEARCH_QUERY_PARAM = "query"

function toStartOfDay(value: Date | string) {
	const date = new Date(value)
	date.setHours(0, 0, 0, 0)
	return date
}

function toInputDate(date: Date) {
	return toStartOfDay(date).toISOString().split("T")[0]
}

function toCalendarLabel(value: string) {
	if (!value) {
		return "Select a date"
	}

	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}

	return date.toLocaleDateString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	})
}

function toPositiveNumber(value: string | null, fallback: number) {
	const parsedValue = Number(value)

	if (!Number.isFinite(parsedValue) || parsedValue < 1) {
		return fallback
	}

	return parsedValue
}

function sanitizeLocationInput(value: string) {
	return value.replace(/\d+/g, "")
}

const normalizeText = (value: string) => value.trim().toLowerCase()

const hasDisplayImage = (media: Array<{ url?: string }> | undefined) =>
	Boolean(media?.[0]?.url?.trim())

const startsWithQuery = (value: string, queryValue: string) =>
	normalizeText(value).startsWith(normalizeText(queryValue))

async function fetchSuggestionVenues() {
	const venues = [] as Awaited<ReturnType<typeof apiClient.venues.list>>["data"]
	let page = DEFAULT_PAGE
	let isLastPage = false

	while (!isLastPage) {
		const response = await apiClient.venues.list({
			page,
			limit: SUGGESTION_SOURCE_LIMIT,
		})

		venues.push(...response.data)
		isLastPage = response.meta.isLastPage
		page += 1
	}

	return venues
}

export default function SearchForVenue() {
	const navigate = useNavigate()
	const searchInputRef = React.useRef<HTMLInputElement | null>(null)
	const suggestionBoxRef = React.useRef<HTMLDivElement | null>(null)
	const checkInCalendarRef = React.useRef<HTMLDivElement | null>(null)
	const returnCalendarRef = React.useRef<HTMLDivElement | null>(null)
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
	const limit = toPositiveNumber(currentParams.get("limit"), DEFAULT_LIMIT)
	const [draftQuery, setDraftQuery] = React.useState(query)
	const [draftDate, setDraftDate] = React.useState(selectedDate)
	const [draftReturnDate, setDraftReturnDate] = React.useState(returnDate)
	const [draftGuests, setDraftGuests] = React.useState(guestCount)
	const [showSuggestions, setShowSuggestions] = React.useState(false)
	const [isSearchOpen, setIsSearchOpen] = React.useState(false)
	const [openCalendar, setOpenCalendar] = React.useState<"checkIn" | "checkOut" | null>(null)

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

	React.useEffect(() => {
		if (!openCalendar) {
			return
		}

		const handlePointerDown = (event: MouseEvent) => {
			const target = event.target as Node
			const activeRef = openCalendar === "checkIn" ? checkInCalendarRef.current : returnCalendarRef.current

			if (activeRef?.contains(target)) {
				return
			}

			setOpenCalendar(null)
		}

		document.addEventListener("mousedown", handlePointerDown)

		return () => {
			document.removeEventListener("mousedown", handlePointerDown)
		}
	}, [openCalendar])

	const suggestionSourceQuery = useQuery({
		queryKey: ["venues", "toolbar-suggestions-source"],
		queryFn: fetchSuggestionVenues,
		enabled: showSuggestions && draftQuery.trim().length >= 2,
		staleTime: 5 * 60_000,
		refetchOnWindowFocus: false,
		retry: (failureCount, queryError) => {
			if (queryError instanceof ApiError && queryError.status === 429) {
				return false
			}

			return failureCount < 2
		},
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
		setIsSearchOpen(false)

		await applyFilters({
			query: draftQuery.trim(),
			date: draftDate,
			returnDate: draftReturnDate,
			guests: draftGuests,
			page: DEFAULT_PAGE,
		})
	}

	const minimumDate = toStartOfDay(new Date())
	const selectedCheckIn = draftDate ? toStartOfDay(draftDate) : undefined
	const selectedReturnDate = draftReturnDate ? toStartOfDay(draftReturnDate) : undefined
	const pastDayMatcher: Matcher = { before: minimumDate }
	const checkInDisabledMatchers: Matcher[] = [pastDayMatcher]
	const checkOutDisabledMatchers: Matcher[] = [
		pastDayMatcher,
		(date: Date) => (selectedCheckIn ? toStartOfDay(date) <= selectedCheckIn : false),
	]

	const handleCheckInSelect = (date: Date | undefined) => {
		if (!date) {
			return
		}

		const nextCheckIn = toInputDate(date)
		setDraftDate(nextCheckIn)
		if (draftReturnDate && toStartOfDay(draftReturnDate) <= toStartOfDay(date)) {
			setDraftReturnDate("")
		}
		setOpenCalendar("checkOut")
	}

	const handleReturnDateSelect = (date: Date | undefined) => {
		if (!date) {
			return
		}

		setDraftReturnDate(toInputDate(date))
		setOpenCalendar(null)
	}

	const suggestions = React.useMemo(() => {
		const queryValue = draftQuery.trim()

		if (queryValue.length < 2) {
			return []
		}

		const venues = suggestionSourceQuery.data ?? []
		const dedupe = new Set<string>()

		const results = venues
			.map((venue) => {
				const city = venue.location.city?.trim() ?? ""
				const country = venue.location.country?.trim() ?? ""
				const name = venue.name?.trim() ?? ""
				const locationLabel = [city, country].filter(Boolean).join(", ")

				if (!name || !locationLabel || !hasDisplayImage(venue.media)) {
					return null
				}

				const hasMatch =
					(startsWithQuery(city, queryValue) && city) ||
					(startsWithQuery(country, queryValue) && country) ||
					(startsWithQuery(name, queryValue) && name) ||
					""

				if (!hasMatch) {
					return null
				}

				const dedupeKey = `${name.toLowerCase()}::${locationLabel.toLowerCase()}`
				if (dedupe.has(dedupeKey)) {
					return null
				}

				dedupe.add(dedupeKey)

				return {
					id: venue.id,
					label: locationLabel,
					subLabel: name,
					queryValue: `${name}, ${locationLabel}`,
				}
			})
			.filter((item): item is { id: string; label: string; subLabel: string; queryValue: string } => item !== null)
			.slice(0, SUGGESTION_LIMIT)

		return results
	}, [draftQuery, suggestionSourceQuery.data])

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
				<div className="flex items-center justify-between lg:flex-row lg:gap-3">
					<button
						type="button"
						onClick={() => setIsSearchOpen(!isSearchOpen)}
						className="lg:hidden inline-flex items-center justify-center rounded-2xl border border-border bg-white p-2 shadow-sm transition hover:bg-muted"
						aria-label="Toggle search form"
					>
						<Search className="size-5 text-foreground" />
					</button>
					<form className={`${isSearchOpen ? "grid" : "hidden lg:grid"} flex-1 gap-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto]`} onSubmit={handleSubmit}>
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
									{suggestionSourceQuery.isLoading ? (
										<p className="px-3 py-2 text-sm  text-black">Looking up destinations...</p>
									) : suggestions.length > 0 ? (
										<div className="space-y-1">
											{suggestions.map((suggestion) => (
												<button
													key={suggestion.id}
													type="button"
													onClick={() => handleSuggestionSelect(suggestion.queryValue)}
													className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-muted"
												>
													<span className="block text-sm font-medium text-foreground">{suggestion.subLabel}</span>
													<span className="block text-xs text-muted-foreground">{suggestion.label}</span>
												</button>
											))}
										</div>
									) : (
										<p className="px-3 py-2 text-sm text-muted-foreground">No matching destinations found.</p>
									)}
								</div>
							) : null}
						</div>

						<div ref={checkInCalendarRef} className="relative min-w-0">
							<button
								type="button"
								onClick={() => setOpenCalendar((current) => current === "checkIn" ? null : "checkIn")}
								className="flex w-full min-w-0 items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2 text-left shadow-sm transition hover:bg-muted"
								aria-label="Open check-in calendar"
							>
								<CalendarDays className="size-4 shrink-0 text-muted-foreground" />
								<div className="min-w-0 flex-1">
									<span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
										Check-in date
									</span>
									<span className="block truncate text-sm text-foreground">{toCalendarLabel(draftDate)}</span>
								</div>
							</button>
							<input type="hidden" name="date" value={draftDate} />

							{openCalendar === "checkIn" ? (
								<div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-border bg-white p-3 shadow-xl">
									<SearchToolbarCalendar
										selected={selectedCheckIn}
										onSelect={handleCheckInSelect}
										disabled={checkInDisabledMatchers}
										showBookedLegend={false}
									/>
								</div>
							) : null}
						</div>

						<div ref={returnCalendarRef} className="relative min-w-0">
							<button
								type="button"
								onClick={() => setOpenCalendar((current) => current === "checkOut" ? null : "checkOut")}
								className="flex w-full min-w-0 items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2 text-left shadow-sm transition hover:bg-muted"
								aria-label="Open return date picker"
							>
								<CalendarDays className="size-4 shrink-0 text-muted-foreground" />
								<div className="min-w-0 flex-1">
									<span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
										Return date
									</span>
									<span className="block truncate text-sm text-foreground">{toCalendarLabel(draftReturnDate)}</span>
								</div>
							</button>
							<input type="hidden" name="returnDate" value={draftReturnDate} />

							{openCalendar === "checkOut" ? (
								<div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-border bg-white p-3 shadow-xl">
									<SearchToolbarCalendar
										selected={selectedReturnDate}
										onSelect={handleReturnDateSelect}
										disabled={checkOutDisabledMatchers}
										showBookedLegend={false}
									/>
								</div>
							) : null}
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

function SearchToolbarCalendar({
	selected,
	onSelect,
	disabled,
	showBookedLegend,
}: {
	selected?: Date;
	onSelect: (date: Date | undefined) => void;
	disabled: Matcher[];
	showBookedLegend: boolean;
}) {
	return (
		<div className="space-y-3">
			<DayPicker
				mode="single"
				navLayout="after"
				selected={selected}
				onSelect={onSelect}
				disabled={disabled}
				modifiers={{ past: disabled[0] }}
				modifiersClassNames={{
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
				<span className="inline-block rounded bg-slate-100 px-2 py-1 text-slate-500 line-through decoration-2 decoration-slate-400">Past</span>
				<span>{showBookedLegend ? "Unavailable dates are disabled." : "Past dates are disabled."}</span>
			</div>
		</div>
	)
}