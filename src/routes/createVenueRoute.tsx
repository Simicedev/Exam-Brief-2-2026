import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/createVenueRoute')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/createVenueRoute"!</div>
}
