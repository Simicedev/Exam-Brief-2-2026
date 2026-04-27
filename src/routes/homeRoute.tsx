import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'

export const Route = createFileRoute('/homeRoute')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <h1 className="text-2xl text-black italic">Welcome to VayCay!</h1>
      
    </div>
  )
}
