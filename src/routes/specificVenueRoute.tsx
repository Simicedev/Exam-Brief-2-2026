import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/specificVenueRoute')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/specificVenueRoute"!</div>
}
