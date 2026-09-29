/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LoaderCircle, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import { ApiError, apiClient } from '../api/apiClient'
import { Button } from '../components/ui/button'
import { getStoredSession } from '../lib/auth'
import { cn } from '../lib/utils'
import { CreateVenueSchema } from '../zodSchema/createForm'
import type { CreateVenueFormData } from '../zodSchema/createForm'

const REDIRECT_ROUTE = '/homeRoute'

export const Route = createFileRoute('/createVenueRoute')({
  component: CreateVenueRoute,
})

function CreateVenueRoute() {
  const navigate = useNavigate()
  const session = getStoredSession()
  
  const [formData, setFormData] = React.useState<CreateVenueFormData>({
    name: '',
    description: '',
    price: 100,
    rating: 1,
    maxGuests: 2,
    mediaUrls: [],
    wifi: false,
    parking: false,
    breakfast: false,
    pets: false,
    address: '',
    city: '',
    zip: '',
    country: '',
  })

  const [imageUrl, setImageUrl] = React.useState('')
  const [formErrors, setFormErrors] = React.useState<Partial<Record<keyof CreateVenueFormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!session || !session.venueManager) {
      toast.error('Only venue managers can create venues.')
      void navigate({ to: REDIRECT_ROUTE, replace: true })
    }
  }, [session, navigate])

  const handleAddImage = () => {
    if (!imageUrl) {
      toast.error('Please enter an image URL.')
      return
    }

    setFormData((prev) => ({
      ...prev,
      mediaUrls: [...(prev.mediaUrls || []), { url: imageUrl }],
    }))
    setImageUrl('')
    toast.success('Image added!')
  }

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      mediaUrls: (prev.mediaUrls || []).filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormErrors({})

    const result = CreateVenueSchema.safeParse(formData)

    if (!result.success) {
      const errors: Partial<Record<keyof CreateVenueFormData, string>> = {}
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof CreateVenueFormData
        errors[path] = issue.message
      })
      setFormErrors(errors)
      console.error('Validation errors:', errors)
      toast.error('Please fix the errors in the form.')
      return
    }

    if (!session?.accessToken) {
      toast.error('You must be logged in to create a venue.')
      return
    }

    setIsSubmitting(true)

    try {
      const venue = await apiClient.venues.create(session.accessToken, {
        name: result.data.name,
        description: result.data.description,
        price: result.data.price,
        rating: result.data.rating,
        maxGuests: result.data.maxGuests,
        media: result.data.mediaUrls,
        meta: {
          wifi: result.data.wifi,
          parking: result.data.parking,
          breakfast: result.data.breakfast,
          pets: result.data.pets,
        },
        location: {
          address: result.data.address,
          city: result.data.city,
          zip: result.data.zip,
          country: result.data.country,
        },
      })

      toast.success(`Venue "${venue.data.name}" created successfully!`)
      await navigate({ to: `/specificVenueRoute/${venue.data.id}` })
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Unable to create venue. Please try again.'

      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="min-h-[calc(100svh-16rem)] bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 border-b border-slate-200 pb-7">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Hosting / New listing
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#232c3d] sm:text-4xl">Create your venue</h1>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-relaxed text-slate-600 sm:text-base">
            Share the details travellers need to picture their stay.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-2">
          
          <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:col-span-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">01 / The stay</p>
              <h2 className="text-lg font-semibold text-[#232c3d]">Basic information</h2>
            </div>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2 text-black">
                Venue Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={cn(
                  'w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus-visible:border-[#232c3d] focus-visible:ring-4 focus-visible:ring-[#232c3d]/10',
                  formErrors.name ? 'border-destructive' : 'border-border'
                )}
              />
              {formErrors.name && (
                <p className="mt-1 text-sm font-medium text-destructive">{formErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2 text-black">
                Description *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className={cn(
                  'w-full min-h-32 rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus-visible:border-[#232c3d] focus-visible:ring-4 focus-visible:ring-[#232c3d]/10',
                  formErrors.description ? 'border-destructive' : 'border-border'
                )}
              />
              {formErrors.description && (
                <p className="mt-1 text-sm font-medium text-destructive">{formErrors.description}</p>
              )}
            </div>
          </div>

          {/* Pricing & Capacity */}
          <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">02 / The details</p>
              <h2 className="text-lg font-semibold text-[#232c3d]">Pricing and capacity</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="price" className="block text-sm font-medium mb-2 text-black">
                  Price per Night ($) *
                </label>
                <input
                  id="price"
                  type="number"
                  min="1"
                  max="10000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className={cn(
                    'w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-[#232c3d] focus-visible:ring-4 focus-visible:ring-[#232c3d]/10',
                    formErrors.price ? 'border-destructive' : 'border-border'
                  )}
                />
                {formErrors.price && (
                  <p className="mt-1 text-sm font-medium text-destructive">{formErrors.price}</p>
                )}
              </div>

              <div>
                <label htmlFor="maxGuests" className="block text-sm font-medium mb-2 text-black">
                  Max Guests *
                </label>
                <input
                  id="maxGuests"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.maxGuests}
                  onChange={(e) => setFormData({ ...formData, maxGuests: Number(e.target.value) })}
                  className={cn(
                    'w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-[#232c3d] focus-visible:ring-4 focus-visible:ring-[#232c3d]/10',
                    formErrors.maxGuests ? 'border-destructive' : 'border-border'
                  )}
                />
                {formErrors.maxGuests && (
                  <p className="mt-1 text-sm font-medium text-destructive">{formErrors.maxGuests}</p>
                )}
              </div>
            </div>

            <div>
              <p className="block text-sm font-medium mb-2 text-black">Rating *</p>
              <div className="flex items-center justify-start gap-1 rounded-md bg-amber-50 px-3 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    aria-label={`Set rating to ${star} star${star === 1 ? '' : 's'}`}
                    className={cn(
                      'grid size-10 place-items-center rounded-md text-xl leading-none transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700',
                      formData.rating >= star ? 'text-amber-500' : 'text-slate-300 hover:text-amber-300'
                    )}
                  >
                    ★
                  </button>
                ))}
                <span className="text-sm text-slate-600">{formData.rating}/5</span>
              </div>
              {formErrors.rating && (
                <p className="mt-1 text-sm font-medium text-destructive">{formErrors.rating}</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">03 / The place</p>
              <h2 className="text-lg font-semibold text-[#232c3d]">Location</h2>
            </div>
            
            <div>
              <label htmlFor="address" className="block text-sm font-medium mb-2 text-black">
                Address *
              </label>
              <input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={cn(
                  'w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-[#232c3d] focus-visible:ring-4 focus-visible:ring-[#232c3d]/10',
                  formErrors.address ? 'border-destructive' : 'border-border'
                )}
              />
              {formErrors.address && (
                <p className="mt-1 text-sm font-medium text-destructive">{formErrors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="city" className="block text-sm font-medium mb-2 text-black">
                  City *
                </label>
                <input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className={cn(
                    'w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-[#232c3d] focus-visible:ring-4 focus-visible:ring-[#232c3d]/10',
                    formErrors.city ? 'border-destructive' : 'border-border'
                  )}
                />
                {formErrors.city && (
                  <p className="mt-1 text-sm font-medium text-destructive">{formErrors.city}</p>
                )}
              </div>

              <div>
                <label htmlFor="zip" className="block text-sm font-medium mb-2 text-black">
                  ZIP Code *
                </label>
                <input
                  id="zip"
                  type="text"
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  className={cn(
                    'w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-[#232c3d] focus-visible:ring-4 focus-visible:ring-[#232c3d]/10',
                    formErrors.zip ? 'border-destructive' : 'border-border'
                  )}
                />
                {formErrors.zip && (
                  <p className="mt-1 text-sm font-medium text-destructive">{formErrors.zip}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="country" className="block text-sm font-medium mb-2 text-black">
                  Country *
                </label>
                <input
                  id="country"
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className={cn(
                    'w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-[#232c3d] focus-visible:ring-4 focus-visible:ring-[#232c3d]/10',
                    formErrors.country ? 'border-destructive' : 'border-border'
                  )}
                />
                {formErrors.country && (
                  <p className="mt-1 text-sm font-medium text-destructive">{formErrors.country}</p>
                )}
              </div>

              
            </div>
          </div>

          {/* Facilities */}
          <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">04 / The comforts</p>
              <h2 className="text-lg font-semibold text-[#232c3d]">Amenities</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(['wifi', 'parking', 'breakfast', 'pets'] as const).map((amenity) => (
                <label key={amenity} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 transition hover:border-slate-400 has-checked:border-[#232c3d] has-checked:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formData[amenity]}
                    onChange={(e) => setFormData({ ...formData, [amenity]: e.target.checked })}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm font-medium capitalize text-black">{amenity}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Images */}
          <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">05 / First impressions</p>
              <h2 className="text-lg font-semibold text-[#232c3d]">Venue images</h2>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-3 sm:flex sm:items-end sm:gap-3 sm:space-y-0">
                <div className="min-w-0 flex-1">
                <label htmlFor="imageUrl" className="block text-sm font-medium mb-2 text-black">
                  Image URL
                </label>
                <input
                  id="imageUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-[#232c3d] focus-visible:ring-4 focus-visible:ring-[#232c3d]/10"
                />
                </div>
                <Button
                  type="button"
                  onClick={handleAddImage}
                  variant="outline"
                  className="min-h-11 w-full rounded-md border-slate-300 px-4 sm:w-auto"
                >
                  <Plus className="mr-2 size-4" />
                  Add image
                </Button>
              </div>
            </div>

            {formData.mediaUrls && formData.mediaUrls.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-700">Added images ({formData.mediaUrls.length})</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {formData.mediaUrls.map((media, index) => (
                    <div
                      key={index}
                      className="group/image relative aspect-4/3 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                    >
                      <img src={media.url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        aria-label={`Remove image ${index + 1}`}
                        className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm transition hover:bg-red-50 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end lg:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: REDIRECT_ROUTE })}
              className="min-h-11 rounded-full px-6 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-h-11 rounded-full bg-[#232c3d] px-6 text-white shadow-sm transition hover:bg-[#35445c] sm:min-w-44 cursor-pointer"
            >
              {isSubmitting && <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />}
              {isSubmitting ? 'Creating...' : 'Create Venue'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}
