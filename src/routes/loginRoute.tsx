import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/loginRoute')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/login"!</div>
}
