import * as React from 'react'
import { Toaster } from '../components/ui/sonner'
import { Outlet, createRootRoute, redirect } from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import Footer from '../components/footer/Footer'
import NavBar from '../components/navBar/NavBar'

export const Route = createRootRoute({
  component: RootComponent,
  beforeLoad: ({ location }) => {
    if (location.pathname === "/") {
      throw redirect({ to: "/homeRoute" });
    }
  },
});
function RootComponent() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <ReactQueryDevtools initialIsOpen={false} />
      <Footer />
      <Toaster />
    </div>
  )
}
