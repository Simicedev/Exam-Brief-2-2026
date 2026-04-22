import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/editVenueRoute')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/editVenueRoute"!</div>
}
