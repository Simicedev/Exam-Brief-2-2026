/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { LoaderCircle, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import { ApiError, apiClient } from '../api/apiClient'
import { Button } from '../components/ui/button'
import { getStoredSession } from '../lib/auth'
import { cn } from '../lib/utils'
import { CreateVenueSchema } from '../zodSchema/createForm'
import type { CreateVenueFormData } from '../zodSchema/createForm'
import type { Venue } from '../api/interfaceHolidazeApi'

const REDIRECT_ROUTE = '/homeRoute'

type EditVenueSearch = {
  id: string
}

export const Route = createFileRoute('/editVenueRoute')({
  validateSearch: (search: Record<string, unknown>): EditVenueSearch => ({
    id: (search.id as string) || '',
  }),
  component: EditVenueRoute,
})

function EditVenueRoute() {
  const navigate = useNavigate()
  const { id } = useSearch({ from: '/editVenueRoute' })
  const session = getStoredSession()

  const [isLoading, setIsLoading] = React.useState(true)
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
    lat: undefined,
    lng: undefined,
  })

  const [imageUrl, setImageUrl] = React.useState('')
  const [formErrors, setFormErrors] = React.useState<Partial<Record<keyof CreateVenueFormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const fetchVenue = React.useCallback(
    async () => {
      try {
        setIsLoading(true)
        const response = await apiClient.venues.get(id)
        const fetchedVenue = response.data

        // Check if current user is the owner
        if (fetchedVenue.owner?.email !== session?.email) {
          toast.error('You can only edit your own venues.')
          await navigate({ to: REDIRECT_ROUTE, replace: true })
          return
        }

        populateForm(fetchedVenue)
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : 'Unable to load venue. Please try again.'

        toast.error(message)
        await navigate({ to: REDIRECT_ROUTE, replace: true })
      } finally {
        setIsLoading(false)
      }
    },
    [id, session?.email, navigate]
  )

  React.useEffect(() => {
    if (!session || !session.venueManager) {
      toast.error('Only venue managers can edit venues.')
      void navigate({ to: REDIRECT_ROUTE, replace: true })
      return
    }

    if (!id) {
      toast.error('No venue ID provided.')
      void navigate({ to: REDIRECT_ROUTE, replace: true })
      return
    }

    void fetchVenue()
  }, [session, id, navigate, fetchVenue])

  const populateForm = (venueData: Venue) => {
    setFormData({
      name: venueData.name || '',
      description: venueData.description || '',
      price: venueData.price || 100,
      rating: Math.max(1, Math.min(5, Math.round(venueData.rating || 1))),
      maxGuests: venueData.maxGuests || 2,
      mediaUrls: venueData.media || [],
      wifi: venueData.meta?.wifi || false,
      parking: venueData.meta?.parking || false,
      breakfast: venueData.meta?.breakfast || false,
      pets: venueData.meta?.pets || false,
      address: venueData.location?.address || '',
      city: venueData.location?.city || '',
      zip: venueData.location?.zip || '',
      country: venueData.location?.country || '',
      continent: venueData.location?.continent,
      lat: venueData.location?.lat,
      lng: venueData.location?.lng,
    })
  }

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
      toast.error('You must be logged in to edit a venue.')
      return
    }

    if (!id) {
      toast.error('No venue ID found.')
      return
    }

    setIsSubmitting(true)

    try {
      const updatedVenue = await apiClient.venues.update(id, session.accessToken, {
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
          lat: result.data.lat || 0,
          lng: result.data.lng || 0,
        },
      })

      toast.success(`Venue "${updatedVenue.data.name}" updated successfully!`)
      await navigate({ to: `/specificVenueRoute/${updatedVenue.data.id}` })
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Unable to update venue. Please try again.'

      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <section className="flex min-h-[calc(100svh-16rem)] items-center justify-center px-4 py-12">
        <div className="text-center">
          <LoaderCircle className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading venue...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="flex min-h-[calc(100svh-16rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl rounded-[2rem] border border-border bg-background p-6 shadow-xl shadow-black/5 sm:p-8">
        <div className="mb-8 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-black">Edit Venue</h1>
          <p className="text-base text-black">
            Update your venue information
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-black">Basic Information</h2>
            
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
                  'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
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
                  'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
                  formErrors.description ? 'border-destructive' : 'border-border'
                )}
              />
              {formErrors.description && (
                <p className="mt-1 text-sm font-medium text-destructive">{formErrors.description}</p>
              )}
            </div>
          </div>

          {/* Pricing & Capacity */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-black">Pricing & Capacity</h2>
            
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
                    'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
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
                    'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
                    formErrors.maxGuests ? 'border-destructive' : 'border-border'
                  )}
                />
                {formErrors.maxGuests && (
                  <p className="mt-1 text-sm font-medium text-destructive">{formErrors.maxGuests}</p>
                )}
              </div>
            </div>

            <div >
              <p className="block text-sm font-medium mb-2 text-black">Rating *</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    aria-label={`Set rating to ${star} star${star === 1 ? '' : 's'}`}
                    className={cn(
                      'rounded-md px-2 py-1 text-lg leading-none transition',
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
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-black">Location</h2>
            
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
                  'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
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
                    'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
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
                    'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
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
                    'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
                    formErrors.country ? 'border-destructive' : 'border-border'
                  )}
                />
                {formErrors.country && (
                  <p className="mt-1 text-sm font-medium text-destructive">{formErrors.country}</p>
                )}
              </div>

              <div>
                <label htmlFor="continent" className="block text-sm font-medium mb-2 text-black">
                  Continent *
                </label>
                <input
                  id="continent"
                  type="text"
                  value={formData.continent}
                  onChange={(e) => setFormData({ ...formData, continent: e.target.value })}
                  className={cn(
                    'w-full px-4 py-2 rounded-lg border bg-background transition-colors text-black',
                    formErrors.continent ? 'border-destructive' : 'border-border'
                  )}
                />
                {formErrors.continent && (
                  <p className="mt-1 text-sm font-medium text-destructive">{formErrors.continent}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="lat" className="block text-sm font-medium mb-2 text-black">
                  Latitude
                </label>
                <input
                  id="lat"
                  type="number"
                  step="0.0001"
                  min="-90"
                  max="90"
                  value={formData.lat || ''}
                  onChange={(e) => setFormData({ ...formData, lat: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background transition-colors text-black"
                />
              </div>

              <div>
                <label htmlFor="lng" className="block text-sm font-medium mb-2 text-black">
                  Longitude
                </label>
                <input
                  id="lng"
                  type="number"
                  step="0.0001"
                  min="-180"
                  max="180"
                  value={formData.lng || ''}
                  onChange={(e) => setFormData({ ...formData, lng: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background transition-colors text-black"
                />
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-black">Amenities</h2>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(['wifi', 'parking', 'breakfast', 'pets'] as const).map((amenity) => (
                <label key={amenity} className="flex items-center space-x-3 cursor-pointer">
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
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-black">Venue Images</h2>
            
            <div className="space-y-3">
              <div>
                <label htmlFor="imageUrl" className="block text-sm font-medium mb-2 text-black">
                  Image URL
                </label>
                <input
                  id="imageUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background transition-colors text-black"
                />
              </div>

              <Button
                type="button"
                onClick={handleAddImage}
                variant="outline"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Image
              </Button>
            </div>

            {formData.mediaUrls && formData.mediaUrls.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-black">Venue Images ({formData.mediaUrls.length})</h3>
                <div className="space-y-2">
                  {formData.mediaUrls.map((media, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{media.url}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="ml-2 inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: `/specificVenueRoute/${id}` })}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting && <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />}
              {isSubmitting ? 'Updating...' : 'Update Venue'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}
