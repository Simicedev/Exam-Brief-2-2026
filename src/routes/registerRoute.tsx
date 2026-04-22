import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/registerRoute')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/registerRoute"!</div>
}
