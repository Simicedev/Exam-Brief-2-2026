import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'

export const Route = createFileRoute('/homeRoute')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <Button onClick={() => toast.success("Toast works!", { description: "This is a toast message" })}>Show toast!</Button>
      
    </div>
  )
}
