import { Link } from "@tanstack/react-router"

import { getStoredSession } from "../../lib/auth"

const browseLinks = [
	{ label: "Home", to: "/homeRoute" as const },
	{ label: "Venues", to: "/venuesListRoute" as const },
]

export default function Footer() {
	const session = getStoredSession()
	const year = new Date().getFullYear()

	return (
		<footer className="border-t border-white/15 bg-(--main-color) text-white">
			<div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 text-left sm:px-6 md:grid-cols-[1.6fr_1fr_1fr] lg:px-8">
				<div className="space-y-3">
					<p className="text-sm font-semibold tracking-[0.24em] uppercase text-white">VayCay</p>
					<p className="max-w-md text-sm leading-6 text-white/75">
						A clean booking experience for travellers and venue managers, adapted to the route structure in this project.
					</p>
				</div>

				<div>
					<p className="text-sm font-semibold text-white underline">Browse</p>
					<div className="mt-3 space-y-2">
						{browseLinks.map((item) => (
							<Link
								key={item.to}
								to={item.to}
								className="block text-sm text-white/75 transition hover:text-white"
							>
								{item.label}
							</Link>
						))}
					</div>
				</div>

				<div>
					<p className="text-sm font-semibold text-white underline">Account</p>
					<div className="mt-3 space-y-2 text-sm text-white/75">
						{session ? (
							<>
								<p>Signed in as {session.name}</p>
								<Link to="/profileRoute" className="block transition hover:text-white">
									Go to profile
								</Link>
								{session.venueManager ? (
									<Link to="/createVenueRoute" className="block transition hover:text-white">
										Create a venue
									</Link>
								) : null}
							</>
						) : (
							<>
								<Link to="/loginRoute" className="block transition hover:text-white">
									Login
								</Link>
								<Link to="/registerRoute" className="block transition hover:text-white">
									Register
								</Link>
							</>
						)}
					</div>
				</div>
			</div>

			<div className="border-t border-white/15 px-4 py-4 text-center text-xs text-white/70 sm:px-6 lg:px-8">
				<p>© {year} Holidaze. Built for the Exam Brief 2 project.</p>
			</div>
		</footer>
	)
}
