/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { LoaderCircle, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { ApiError, apiClient } from '../api/apiClient'
import { Button } from '../components/ui/button'
import { getStoredSession, setStoredSession } from '../lib/auth'
import { cn } from '../lib/utils'
import { RegisterSchema } from '../zodSchema/registerForm'
import type { RegisterFormData } from '../zodSchema/registerForm'

const REDIRECT_ROUTE = '/homeRoute'

export const Route = createFileRoute('/registerRoute')({
  component: RegisterRoutePage,
})

function RegisterRoutePage() {
	const navigate = useNavigate()
	const [name, setName] = React.useState('')
	const [email, setEmail] = React.useState('')
	const [password, setPassword] = React.useState('')
	const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
	const [bannerFile, setBannerFile] = React.useState<File | null>(null)
	const [accountType, setAccountType] = React.useState<'traveller' | 'manager'>('traveller')
	const [termsAccepted, setTermsAccepted] = React.useState(false)
	const [formErrors, setFormErrors] = React.useState<Partial<Record<keyof RegisterFormData, string>>>({})
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

		const formData: RegisterFormData = {
			name,
			email,
			password,
			avatarFile,
			bannerFile,
			accountType,
			termsAccepted,
		}

		const result = RegisterSchema.safeParse(formData)

		if (!result.success) {
			const errors: Partial<Record<keyof RegisterFormData, string>> = {}
			result.error.issues.forEach((issue) => {
				const path = issue.path[0] as keyof RegisterFormData
				errors[path] = issue.message
			})
			setFormErrors(errors)
			return
		}

		setIsSubmitting(true)

		try {
			await apiClient.auth.register({
				name: result.data.name,
				email: result.data.email,
				password: result.data.password,
				venueManager: result.data.accountType === 'manager',
			})

			const loginResponse = await apiClient.auth.login({
				email: result.data.email,
				password: result.data.password,
			})

			setStoredSession(loginResponse.data)
			toast.success(`Welcome, ${loginResponse.data.name}. Your account is ready!`)
			await navigate({ to: REDIRECT_ROUTE })
		} catch (error) {
			const message =
				error instanceof ApiError
					? error.message
					: 'Unable to create your account. Please try again.'

			toast.error(message)
			setFormErrors({ name: message })
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<section className="flex min-h-[calc(100svh-16rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
			<div className="rounded-[2rem] border border-border bg-background p-6 text-left shadow-xl shadow-black/5 sm:p-8 w-full max-w-2xl">
				<div className="mb-8 space-y-3">
					<p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted-foreground">
						Create account
					</p>
					<h2 className="text-3xl font-semibold tracking-tight text-foreground">Get started with VayCay</h2>
					<p className="text-sm leading-6 text-muted-foreground">
						Create your account to browse, book, and manage venues.
					</p>
				</div>

				<form className="space-y-4" onSubmit={handleSubmit}>
					<fieldset className="space-y-3">
						<legend className="text-sm font-medium text-foreground">Account type</legend>
						<div className="grid gap-3 sm:grid-cols-2">
							<label
								className={cn(
									'flex items-start gap-3 rounded-2xl border-2 p-4 cursor-pointer transition',
									accountType === 'traveller'
										? 'border-primary bg-primary/5'
										: 'border-border bg-background hover:border-border/50'
								)}
							>
								<input
									type="radio"
									name="account-type"
									value="traveller"
									checked={accountType === 'traveller'}
									onChange={() => setAccountType('traveller')}
									className="mt-1 h-5 w-5 accent-primary"
								/>
								<div className="flex-1">
									<p className="text-sm font-medium text-foreground">Traveller</p>
									<p className="text-xs text-muted-foreground">Browse and book venues</p>
								</div>
							</label>

							<label
								className={cn(
									'flex items-start gap-3 rounded-2xl border-2 p-4 cursor-pointer transition',
									accountType === 'manager'
										? 'border-primary bg-primary/5'
										: 'border-border bg-background hover:border-border/50'
								)}
							>
								<input
									type="radio"
									name="account-type"
									value="manager"
									checked={accountType === 'manager'}
									onChange={() => setAccountType('manager')}
									className="mt-1 h-5 w-5 accent-primary"
								/>
								<div className="flex-1">
									<p className="text-sm font-medium text-foreground">Venue manager</p>
									<p className="text-xs text-muted-foreground">Create and manage venues</p>
								</div>
							</label>
						</div>
					</fieldset>

					<div className="space-y-2">
						<label className="block text-sm font-medium text-foreground" htmlFor="register-name">
							Username
						</label>
						<input
							id="register-name"
							type="text"
							autoComplete="username"
							value={name}
							onChange={(event) => setName(event.target.value)}
							className={cn(
								"h-12 w-full rounded-2xl border bg-background px-4 text-base text-foreground outline-none transition focus:ring-4 focus:ring-foreground/5",
								formErrors.name ? "border-destructive focus:border-destructive" : "border-border focus:border-foreground/30"
							)}
							placeholder="yourname"
							required
						/>
						{formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
					</div>

					<div className="space-y-2">
						<label className="block text-sm font-medium text-foreground" htmlFor="register-email">
							Email
						</label>
						<input
							id="register-email"
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
						<label className="block text-sm font-medium text-foreground" htmlFor="register-password">
							Password
						</label>
						<input
							id="register-password"
							type="password"
							autoComplete="new-password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							minLength={8}
							className={cn(
								"h-12 w-full rounded-2xl border bg-background px-4 text-base text-foreground outline-none transition focus:ring-4 focus:ring-foreground/5",
								formErrors.password ? "border-destructive focus:border-destructive" : "border-border focus:border-foreground/30"
							)}
							placeholder="Enter a strong password (min. 8 characters)"
							required
						/>
						{formErrors.password && <p className="text-xs text-destructive">{formErrors.password}</p>}
					</div>

					<div className="space-y-2">
						<label className="block text-sm font-medium text-foreground" htmlFor="register-avatar">
							Avatar <span className="text-xs text-muted-foreground">(optional)</span>
						</label>
						<div className="flex gap-2">
							<input
								id="register-avatar"
								type="file"
								accept="image/jpeg,image/png,image/webp,image/gif"
								onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
								className={cn(
									"h-12 w-full rounded-2xl border bg-background px-4 text-base text-foreground outline-none transition file:mr-4 file:border-0 file:bg-primary file:px-3 file:py-2 file:rounded-lg file:text-primary-foreground file:cursor-pointer hover:file:bg-primary/90",
									formErrors.avatarFile ? "border-destructive focus:border-destructive" : "border-border focus:border-foreground/30"
								)}
							/>
						</div>
						{avatarFile && <p className="text-xs text-muted-foreground">Selected: {avatarFile.name}</p>}
						{formErrors.avatarFile && <p className="text-xs text-destructive">{formErrors.avatarFile}</p>}
					</div>

					<div className="space-y-2">
						<label className="block text-sm font-medium text-foreground" htmlFor="register-banner">
							Banner <span className="text-xs text-muted-foreground">(optional)</span>
						</label>
						<div className="flex gap-2">
							<input
								id="register-banner"
								type="file"
								accept="image/jpeg,image/png,image/webp,image/gif"
								onChange={(event) => setBannerFile(event.target.files?.[0] || null)}
								className={cn(
									"h-12 w-full rounded-2xl border bg-background px-4 text-base text-foreground outline-none transition file:mr-4 file:border-0 file:bg-primary file:px-3 file:py-2 file:rounded-lg file:text-primary-foreground file:cursor-pointer hover:file:bg-primary/90",
									formErrors.bannerFile ? "border-destructive focus:border-destructive" : "border-border focus:border-foreground/30"
								)}
							/>
						</div>
						{bannerFile && <p className="text-xs text-muted-foreground">Selected: {bannerFile.name}</p>}
						{formErrors.bannerFile && <p className="text-xs text-destructive">{formErrors.bannerFile}</p>}
					</div>

					<div className="flex items-start gap-3 rounded-2xl border border-border bg-background/50 p-4">
						<input
							id="register-terms"
							type="checkbox"
							checked={termsAccepted}
							onChange={(event) => setTermsAccepted(event.target.checked)}
							className={cn(
								"mt-1 h-5 w-5 rounded accent-primary",
								formErrors.termsAccepted ? "border-destructive" : "border-border bg-background"
							)}
							required
						/>
						<div className="flex-1">
							<label htmlFor="register-terms" className="text-sm text-muted-foreground">
								I agree to the{' '}
								<a href="#" className="text-foreground underline hover:underline">
									terms and conditions
								</a>
							</label>
							{formErrors.termsAccepted && <p className="text-xs text-destructive mt-1">{formErrors.termsAccepted}</p>}
						</div>
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
								Creating account
							</>
						) : (
							<>
								<UserPlus className="size-4" />
								Create account
							</>
						)}
					</Button>

					<p className="mt-6 text-sm text-muted-foreground">
						Already have an account?{' '}
						<Link to="/loginRoute" className="font-medium text-foreground underline underline-offset-4">
							Log in here
						</Link>
					</p>
				</form>
			</div>
		</section>
	)
}
