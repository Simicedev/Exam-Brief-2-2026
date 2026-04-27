import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/registerRoute')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <h1>Register</h1>
      <p>This is the register page.</p>
    </div>
  )
}
