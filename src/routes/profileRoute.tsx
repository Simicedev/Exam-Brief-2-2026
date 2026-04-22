import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/profileRoute')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/profileRoute"!</div>
}
