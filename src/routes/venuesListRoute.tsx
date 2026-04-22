import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/venuesListRoute')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/venuesListRoute"!</div>
}
