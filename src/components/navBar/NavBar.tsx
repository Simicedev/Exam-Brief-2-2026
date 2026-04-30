import * as React from "react"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { Hotel, LogOut, Menu, Plus, UserRound, X } from "lucide-react"

import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuList,
} from "../ui/navigation-menu"
import { addAuthChangedListener, clearStoredSession, getStoredSession } from "../../lib/auth"
import { cn } from "../../lib/utils"

type AppRoute =
	| "/homeRoute"
	| "/venuesListRoute"
	| "/createVenueRoute"
	| "/profileRoute"
	| "/loginRoute"
	| "/registerRoute"

type NavigationItem = {
	name: string
	to: AppRoute
	requiresAuth?: boolean
	requiresManager?: boolean
}

const navigation: NavigationItem[] = [
	{ name: "Home", to: "/homeRoute" },
	{ name: "Venues", to: "/venuesListRoute" },
	{ name: "Create venue", to: "/createVenueRoute", requiresAuth: true, requiresManager: true },
]

const guestLinks: NavigationItem[] = [
	{ name: "Login", to: "/loginRoute" },
	{ name: "Register", to: "/registerRoute" },
]

function isActiveRoute(pathname: string, to: AppRoute) {
	return pathname === to
}

function getInitials(name?: string) {
	if (!name) {
		return "U"
	}

	return name.charAt(0).toUpperCase()
}

export default function NavBar() {
	const pathname = useRouterState({ select: (state) => state.location.pathname })
	const navigate = useNavigate()
	const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
	const [accountMenuOpen, setAccountMenuOpen] = React.useState(false)
	const [session, setSession] = React.useState(() => getStoredSession())
	const accountMenuRef = React.useRef<HTMLDivElement | null>(null)

	React.useEffect(() => {
		const syncSession = () => {
			setSession(getStoredSession())
		}

		syncSession()
		const removeAuthChangedListener = addAuthChangedListener(syncSession)
		window.addEventListener("storage", syncSession)
		window.addEventListener("focus", syncSession)

		return () => {
			removeAuthChangedListener()
			window.removeEventListener("storage", syncSession)
			window.removeEventListener("focus", syncSession)
		}
	}, [])

	React.useEffect(() => {
		setMobileMenuOpen(false)
		setAccountMenuOpen(false)
	}, [pathname])

	React.useEffect(() => {
		if (!accountMenuOpen) {
			return
		}

		const handlePointerDown = (event: MouseEvent) => {
			if (!accountMenuRef.current?.contains(event.target as Node)) {
				setAccountMenuOpen(false)
			}
		}

		document.addEventListener("mousedown", handlePointerDown)

		return () => {
			document.removeEventListener("mousedown", handlePointerDown)
		}
	}, [accountMenuOpen])

	const visibleNavigation = navigation.filter((item) => {
		if (item.requiresManager) {
			return Boolean(session?.venueManager)
		}

		if (item.requiresAuth) {
			return Boolean(session)
		}

		return true
	})

	const handleSignOut = async () => {
		clearStoredSession()
		setAccountMenuOpen(false)
		await navigate({ to: "/loginRoute" })
	}

	return (
		<header className="sticky top-0 z-50 border-b bg-(--main-color) backdrop-blur">
			<nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
				<div className="flex items-center gap-3">
					<button
						type="button"
						className="inline-flex size-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:cursor-pointer hover:bg-white/15 sm:hidden"
						onClick={() => setMobileMenuOpen((open) => !open)}
						aria-expanded={mobileMenuOpen}
						aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
					>
						{mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
					</button>

					<Link
						to="/homeRoute"
						className="inline-flex items-center gap-3 rounded-xl px-2 py-1 text-left text-white transition hover:bg-white/10"
					>
						<span className="inline-flex size-10 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
							<Hotel className="size-5" />
						</span>
						<span className="hidden sm:block">
							<span className="block text-sm font-semibold tracking-[0.24em] uppercase text-white">
								VayCay
							</span>
							<span className="block text-xs text-white/75">Stay somewhere worth remembering</span>
						</span>
					</Link>
				</div>

				<NavigationMenu className="hidden sm:flex">
					<NavigationMenuList className="gap-2">
						{visibleNavigation.map((item) => (
							<NavigationMenuItem key={item.to}>
								<Link
									to={item.to}
									className={cn(
										"group/navigation-menu-trigger inline-flex h-9 w-max items-center justify-center rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all outline-none hover:bg-white/10 focus:bg-white/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-popup-open:bg-white/10 data-popup-open:hover:bg-white/10 data-open:bg-white/10 data-open:hover:bg-white/10 data-open:focus:bg-white/10",
										"h-10 rounded-full px-4",
										isActiveRoute(pathname, item.to)
											? "bg-white/15 text-white hover:bg-white/20 hover:text-white focus:bg-white/20"
											: "bg-transparent text-white/80 hover:text-white",
									)}
								>
									{item.name}
								</Link>
							</NavigationMenuItem>
						))}
					</NavigationMenuList>
				</NavigationMenu>

				<div className="flex items-center gap-2">
					{!session ? (
						<>
							<Link
								to="/loginRoute"
								className="hidden rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white sm:inline-flex"
							>
								Login
							</Link>
							<Link
								to="/registerRoute"
								className="inline-flex rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
							>
								Register
							</Link>
						</>
					) : (
						<div className="relative" ref={accountMenuRef}>
							<button
								type="button"
								className="inline-flex items-center gap-3 rounded-full border border-border bg-background px-2 py-2 text-left transition hover:bg-muted"
								onClick={() => setAccountMenuOpen((open) => !open)}
								aria-expanded={accountMenuOpen}
								aria-label="Toggle user menu"
							>
								<span className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
									{getInitials(session.name)}
								</span>
								<span className="hidden pr-2 sm:block">
									<span className="block text-sm font-medium text-foreground">{session.name}</span>
									<span className="block text-xs text-muted-foreground">
										{session.venueManager ? "Venue manager" : "Traveller"}
									</span>
								</span>
							</button>

							{accountMenuOpen ? (
								<div className="absolute right-0 mt-3 w-60 rounded-2xl border border-border bg-background p-2 shadow-2xl shadow-black/10">
									<div className="border-b border-border px-3 py-2">
										<p className="text-sm font-medium text-foreground">{session.name}</p>
										<p className="truncate text-xs text-muted-foreground">{session.email}</p>
									</div>

									<div className="mt-2 space-y-1">
										<Link
											to="/profileRoute"
											className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
										>
											<UserRound className="size-4" />
											Your profile
										</Link>

										{session.venueManager ? (
											<Link
												to="/createVenueRoute"
												className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
											>
												<Plus className="size-4" />
												Create venue
											</Link>
										) : null}

										<button
											type="button"
											className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
											onClick={handleSignOut}
										>
											<LogOut className="size-4" />
											Sign out
										</button>
									</div>
								</div>
							) : null}
						</div>
					)}
				</div>
			</nav>

			{mobileMenuOpen ? (
				<div className="border-t border-white/15 px-4 py-4 sm:hidden">
					<div className="space-y-2">
						{visibleNavigation.map((item) => (
							<Link
								key={item.to}
								to={item.to}
								className={cn(
									"block rounded-2xl px-4 py-3 text-left text-sm font-medium transition",
									isActiveRoute(pathname, item.to)
										? "bg-white/15 text-white"
										: "bg-white/10 text-white/85 hover:bg-white/15 hover:text-white",
								)}
							>
								{item.name}
							</Link>
						))}
					</div>

					<div className="mt-4 rounded-2xl border border-white/15 bg-white/10 p-3">
						{session ? (
							<div className="space-y-2">
								<div>
									<p className="text-sm font-medium text-white">{session.name}</p>
									<p className="text-xs text-white/70">{session.email}</p>
								</div>

								<Link
									to="/profileRoute"
									className="block rounded-xl px-3 py-2 text-sm text-white/85 transition hover:bg-white/10 hover:text-white"
								>
									Your profile
								</Link>

								{session.venueManager ? (
									<Link
										to="/createVenueRoute"
										className="block rounded-xl px-3 py-2 text-sm text-white/85 transition hover:bg-white/10 hover:text-white"
									>
										Create venue
									</Link>
								) : null}

								<button
									type="button"
									className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10 hover:text-white"
									onClick={handleSignOut}
								>
									Sign out
								</button>
							</div>
						) : (
							<div className="grid grid-cols-2 gap-2">
								{guestLinks.map((item) => (
									<Link
										key={item.to}
										to={item.to}
										className={cn(
											"rounded-xl px-3 py-2 text-center text-sm font-medium transition",
											item.to === "/registerRoute"
												? "bg-white text-(--main-color)"
												: "bg-white/10 text-white hover:bg-white/15",
										)}
									>
										{item.name}
									</Link>
								))}
							</div>
						)}
					</div>
				</div>
			) : null}
		</header>
	)
}
