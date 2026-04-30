/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { LoaderCircle, LogIn } from 'lucide-react'
import { toast } from 'sonner'

import { ApiError, apiClient } from '../api/apiClient'
import { Button } from '../components/ui/button'
import { getStoredSession, setStoredSession } from '../lib/auth'
import { cn } from '../lib/utils'
import { LoginSchema } from '../zodSchema/loginForm'
import type { LoginFormData } from '../zodSchema/loginForm'

const REDIRECT_ROUTE = '/homeRoute'

export const Route = createFileRoute('/loginRoute')({
  component: LoginRoutePage,
})

function LoginRoutePage() {
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [formErrors, setFormErrors] = React.useState<Partial<Record<keyof LoginFormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!getStoredSession()) {
      return
    }

    void navigate({ to: REDIRECT_ROUTE, replace: true })
  }, [navigate])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormErrors({})

    const formData: LoginFormData = {
      email,
      password,
    }

    const result = LoginSchema.safeParse(formData)

    if (!result.success) {
      const errors: Partial<Record<keyof LoginFormData, string>> = {}
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof LoginFormData
        errors[path] = issue.message
      })
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await apiClient.auth.login({
        email: result.data.email,
        password: result.data.password,
      })

      setStoredSession(response.data)
      toast.success(`Welcome back, ${response.data.name}.`)
      await navigate({ to: REDIRECT_ROUTE })
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Unable to sign in right now. Please try again.'

      toast.error(message)
      setFormErrors({ email: message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="flex min-h-[calc(100svh-16rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="hidden overflow-hidden rounded-[2rem] bg-(--main-color) p-8 text-left text-white shadow-2xl shadow-black/10 lg:block">
          <div className="flex h-full flex-col justify-between gap-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold tracking-[0.24em] uppercase text-white/70">VayCay</p>
              <h1 className="max-w-md text-4xl font-semibold tracking-tight text-white">
                Log in and keep planning your next stay.
              </h1>
              <p className="max-w-xl text-base leading-7 text-white/75">
                Use the same Holidaze account you registered with to browse venues, manage trips,
                and access host tools if you are a venue manager.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
                <p className="text-sm font-medium text-white">Travellers</p>
                <p className="mt-2 text-sm text-white/70">
                  Pick up where you left off and keep your saved trip plans moving.
                </p>
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
                <p className="text-sm font-medium text-white">Venue managers</p>
                <p className="mt-2 text-sm text-white/70">
                  Sign in to access venue creation and profile management tools.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-background p-6 text-left shadow-xl shadow-black/5 sm:p-8">
          <div className="mb-8 space-y-3">
            <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted-foreground">
              Account access
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Log in with the account you use for Holidaze bookings and venue management.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={cn(
                  "h-12 w-full rounded-2xl border bg-background px-4 text-base text-foreground outline-none transition focus:ring-4 focus:ring-foreground/5",
                  formErrors.email ? "border-destructive focus:border-destructive" : "border-border focus:border-foreground/30"
                )}
                placeholder="name@stud.noroff.no"
                required
              />
              {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={cn(
                  "h-12 w-full rounded-2xl border bg-background px-4 text-base text-foreground outline-none transition focus:ring-4 focus:ring-foreground/5",
                  formErrors.password ? "border-destructive focus:border-destructive" : "border-border focus:border-foreground/30"
                )}
                placeholder="Enter your password"
                required
              />
              {formErrors.password && <p className="text-xs text-destructive">{formErrors.password}</p>}
            </div>

            <Button
              type="submit"
              variant="default"
              size="lg"
              disabled={isSubmitting}
              className="h-12 w-full rounded-2xl bg-(--main-color) text-white hover:opacity-95"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Signing in
                </>
              ) : (
                <>
                  <LogIn className="size-4" />
                  Log in
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Need an account?{' '}
            <Link to="/registerRoute" className="font-medium text-foreground underline underline-offset-4">
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
