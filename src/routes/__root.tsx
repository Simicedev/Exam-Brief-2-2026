import { Toaster } from '../components/ui/sonner'
import { Outlet, createRootRoute, redirect, useRouterState } from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import Footer from '../components/footer/Footer'
import NavBar from '../components/navBar/NavBar'
import SearchForVenue from '../components/searchForVenue/SearchForVenue'

export const Route = createRootRoute({
  component: RootComponent,
  beforeLoad: ({ location }) => {
    if (location.pathname === "/") {
      throw redirect({ to: "/homeRoute" });
    }
  },
});
function RootComponent() {
	const pathname = useRouterState({ select: (state) => state.location.pathname })
	const hideVenueSearch = pathname === '/loginRoute' || pathname === '/registerRoute' || pathname === '/profileRoute'

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      {hideVenueSearch ? null : <SearchForVenue />}
      <main className="flex-1">
        <Outlet />
      </main>
      <ReactQueryDevtools initialIsOpen={false} />
      <Footer />
      <Toaster />
    </div>
  )
}
