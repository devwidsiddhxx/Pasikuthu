import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'

type Donation = {
  id: string
  created_at: string
  food_name: string
  description: string | null
  qty: number
  name: string | null
  location: string | null
  contact_number: string | null
}

const CITY_SUGGESTIONS = [
  'Chennai',
  'Hyderabad',
  'Bengaluru',
  'Coimbatore',
  'Madurai',
  'Mumbai',
  'Delhi',
  'Kolkata',
  'Pune',
  'Kochi',
  'Trichy',
  'Salem',
  'Vizag',
  'Mysuru',
  'Ahmedabad',
] as const

const emailRedirectTo =
  typeof window !== 'undefined' ? `${window.location.origin}/` : undefined

const buildWhatsAppLink = (phone: string | null) => {
  if (!phone) return null
  let digitsOnly = phone.replace(/\D/g, '')
  if (!digitsOnly.length) return null
  if (digitsOnly.length === 10) {
    digitsOnly = `91${digitsOnly}`
  }
  return `https://wa.me/${digitsOnly}`
}

const formatPhoneForDisplay = (phone: string | null) => {
  if (!phone) return ''
  const digitsOnly = phone.replace(/\D/g, '')
  if (!digitsOnly.length) return ''
  const withCountry =
    digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly
  const localPart = withCountry.slice(-10)
  return `+${withCountry.slice(0, withCountry.length - 10)} ${localPart}`
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [otpState, setOtpState] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  )
  const [otpError, setOtpError] = useState<string | null>(null)

  const [donations, setDonations] = useState<Donation[]>([])
  const [donationsLoading, setDonationsLoading] = useState(false)
  const [donationsError, setDonationsError] = useState<string | null>(null)
  const [updatingDonationId, setUpdatingDonationId] = useState<string | null>(null)
  const [updateDonationError, setUpdateDonationError] = useState<string | null>(
    null,
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLocation, setFilterLocation] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'finished'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'qty' | 'name'>('date')
  const [deletingDonationId, setDeletingDonationId] = useState<string | null>(null)

  const [formState, setFormState] = useState({
    food_name: '',
    description: '',
    qty: '1',
    name: '',
    location: '',
    contact_number: '',
  })
  const [formStatus, setFormStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const initialiseAuth = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()
      setSession(currentSession)
    }

    void initialiseAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadDonations = useCallback(async () => {
    if (!session) {
      setDonations([])
      setDonationsLoading(false)
      return
    }

    setDonationsLoading(true)
    setDonationsError(null)

    const { data, error } = await supabase
      .from('donations')
      .select('id, created_at, food_name, description, qty, name, location, contact_number')
      .order('created_at', { ascending: false })

    if (error) {
      setDonationsError(error.message)
      setDonations([])
    } else {
      setDonations((data ?? []) as Donation[])
    }

    setDonationsLoading(false)
  }, [session])

  useEffect(() => {
    void loadDonations()
  }, [loadDonations])

  const handleSendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email) return

    setOtpState('sending')
    setOtpError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
        shouldCreateUser: true,
      },
    })

    if (error) {
      setOtpError(error.message)
      setOtpState('error')
      return
    }

    setOtpState('sent')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setDonations([])
  }

  const handleUpdateQuantity = async (donation: Donation) => {
    const input = window.prompt(
      `Update quantity for ${donation.food_name}\nCurrent: ${donation.qty}`,
      donation.qty.toString(),
    )

    if (input === null || input.trim() === '') return
    
    const nextQty = Number(input.trim())
    if (!Number.isFinite(nextQty) || nextQty < 0) {
      setUpdateDonationError('Quantity must be zero or a positive number.')
      setTimeout(() => setUpdateDonationError(null), 5000)
      return
    }

    if (nextQty === donation.qty) {
      return
    }

    setUpdatingDonationId(donation.id)
    setUpdateDonationError(null)

    try {
      const { data, error } = await supabase
        .from('donations')
        .update({ qty: nextQty })
        .eq('id', donation.id)
        .select('id, created_at, food_name, description, qty, name, location, contact_number')

      if (error) {
        console.error('Update error:', error)
        setUpdateDonationError(`Failed to update: ${error.message}`)
        setTimeout(() => setUpdateDonationError(null), 5000)
        setUpdatingDonationId(null)
        return
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const updatedDonation = data[0] as Donation
        setDonations((current) =>
          current.map((item) =>
            item.id === donation.id ? updatedDonation : item,
          ),
        )
      } else {
        await loadDonations()
      }
    } catch (err) {
      console.error('Update exception:', err)
      setUpdateDonationError('An unexpected error occurred. Please try again.')
      setTimeout(() => setUpdateDonationError(null), 5000)
    } finally {
      setUpdatingDonationId(null)
    }
  }

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session) return

    const trimmedName = formState.food_name.trim()
    const trimmedDescription = formState.description.trim()
    if (!trimmedName) {
      setFormError('Food name is required.')
      setFormStatus('error')
      return
    }

    setFormStatus('submitting')
    setFormError(null)

    const qty = Number(formState.qty)

    if (!Number.isFinite(qty) || qty <= 0) {
      setFormError('Quantity must be greater than zero.')
      setFormStatus('error')
      return
    }

    const trimmedNameField = formState.name.trim()
    const trimmedLocation = formState.location.trim()
    const phoneDigits = formState.contact_number.replace(/\D/g, '')

    if (phoneDigits.length !== 10) {
      setFormError('Contact number must be exactly 10 digits.')
      setFormStatus('error')
      return
    }

    const normalizedPhone = `+91${phoneDigits}`
    const normalizedLocation =
      trimmedLocation.length === 0
        ? null
        : CITY_SUGGESTIONS.find(
            (city) => city.toLowerCase() === trimmedLocation.toLowerCase(),
          ) ?? trimmedLocation

    const payload = {
      food_name: trimmedName,
      description: trimmedDescription.length ? trimmedDescription : null,
      qty,
      name: trimmedNameField.length ? trimmedNameField : null,
      location: normalizedLocation,
      contact_number: normalizedPhone,
    }

    const { data, error } = await supabase
      .from('donations')
      .insert(payload)
      .select()
      .single()

    if (error) {
      setFormError(error.message)
      setFormStatus('error')
      return
    }

    setFormStatus('success')
    setFormState({ food_name: '', description: '', qty: '1', name: '', location: '', contact_number: '' })
    setDonations((current) =>
      data ? [(data as Donation), ...current] : current,
    )
  }

  const otpMessage = useMemo(() => {
    if (otpState === 'sent') {
      return 'Check your email for the magic link to finish signing in.'
    }
    if (otpState === 'error' && otpError) {
      return otpError
    }
    return null
  }, [otpState, otpError])

  const statistics = useMemo(() => {
    const total = donations.length
    const active = donations.filter((d) => d.qty > 0).length
    const finished = donations.filter((d) => d.qty === 0).length
    const totalQty = donations.reduce((sum, d) => sum + d.qty, 0)
    const locations = [...new Set(donations.map((d) => d.location).filter(Boolean))]
    return { total, active, finished, totalQty, locations: locations.length }
  }, [donations])

  const filteredAndSortedDonations = useMemo(() => {
    let filtered = [...donations]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (d) =>
          d.food_name.toLowerCase().includes(query) ||
          d.description?.toLowerCase().includes(query) ||
          d.name?.toLowerCase().includes(query),
      )
    }

    if (filterLocation) {
      filtered = filtered.filter((d) => d.location === filterLocation)
    }

    if (filterStatus === 'active') {
      filtered = filtered.filter((d) => d.qty > 0)
    } else if (filterStatus === 'finished') {
      filtered = filtered.filter((d) => d.qty === 0)
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortBy === 'qty') {
        return b.qty - a.qty
      }
      if (sortBy === 'name') {
        return a.food_name.localeCompare(b.food_name)
      }
      return 0
    })

    return sorted
  }, [donations, searchQuery, filterLocation, filterStatus, sortBy])

  const handleDeleteDonation = async (donationId: string) => {
    if (!window.confirm('Are you sure you want to delete this donation?')) {
      return
    }

    setDeletingDonationId(donationId)

    const { error } = await supabase.from('donations').delete().eq('id', donationId)

    if (error) {
      setUpdateDonationError(`Failed to delete: ${error.message}`)
      setTimeout(() => setUpdateDonationError(null), 5000)
      setDeletingDonationId(null)
      return
    }

    setDonations((current) => current.filter((d) => d.id !== donationId))
    setDeletingDonationId(null)
  }

  const isSignedIn = Boolean(session?.user)

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 py-10">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4">
        <header className="flex flex-col items-start justify-between gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Fork */}
                <line x1="4" y1="2" x2="4" y2="10" />
                <line x1="6" y1="2" x2="6" y2="10" />
                <line x1="8" y1="2" x2="8" y2="10" />
                <line x1="4" y1="10" x2="9" y2="10" />
                <line x1="5.5" y1="10" x2="5.5" y2="22" />
                {/* Spoon */}
                <ellipse cx="17" cy="6" rx="3.5" ry="2.5" />
                <line x1="15.5" y1="6" x2="15.5" y2="22" />
              </svg>
            </div>
      <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Pasikuthu
              </h1>
              <p className="text-sm text-slate-600">
                Sign in with your email to log donations and track contributions.
              </p>
            </div>
          </div>
          {isSignedIn ? (
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                {session?.user?.email}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </header>

        {!isSignedIn ? (
          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Sign in to continue
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Enter your email to start contributing to food donations.
            </p>
            <form onSubmit={handleSendOtp} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                  placeholder="you@example.com"
                />
              </label>
              <button
                type="submit"
                disabled={otpState === 'sending'}
                className="inline-flex items-center justify-center rounded-lg border border-transparent bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-75"
              >
                {otpState === 'sending' ? 'Sending magic link...' : 'Send magic link'}
              </button>
              {otpMessage ? (
                <p
                  className={
                    otpState === 'error'
                      ? 'text-sm text-rose-600'
                      : 'text-sm text-emerald-600'
                  }
                >
                  {otpMessage}
                </p>
              ) : null}
            </form>
          </section>
        ) : null}

        {isSignedIn ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_minmax(16rem,22rem)]">
            <div className="space-y-6">
              <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">
                  Add a donation
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Log donated food items with a quick description and quantity.
                </p>
                <form
                  onSubmit={handleFormSubmit}
                  className="mt-6 flex flex-col gap-4"
                >
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Food name
                    <input
                      type="text"
                      required
                      value={formState.food_name}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          food_name: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                      placeholder="Canned beans"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Description
                    <textarea
                      value={formState.description}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                      placeholder="Optional details about packaging or expiry"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Quantity
                    <input
                      type="number"
                      min={1}
                      value={formState.qty}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          qty: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                      placeholder="1"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Name
                    <input
                      type="text"
                      value={formState.name}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                      placeholder="Donor name"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Location
                    <input
                      type="text"
                      list="city-options"
                      value={formState.location}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          location: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                      placeholder="Start typing a city..."
                    />
                    <datalist id="city-options">
                      {CITY_SUGGESTIONS.map((city) => (
                        <option key={city} value={city} />
                      ))}
                    </datalist>
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Contact Number
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
                        +91
                      </span>
                      <input
                        type="tel"
                        value={formState.contact_number}
                        onChange={(event) => {
                          const digitsOnly = event.target.value
                            .replace(/\D/g, '')
                            .slice(0, 10)
                          setFormState((prev) => ({
                            ...prev,
                            contact_number: digitsOnly,
                          }))
                        }}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                        placeholder="10-digit mobile number"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Exactly 10 digits. We will prefix +91 automatically.
                    </p>
                  </label>

                  <button
                    type="submit"
                    disabled={formStatus === 'submitting'}
                    className="inline-flex items-center justify-center rounded-lg border border-transparent bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-75"
                  >
                    {formStatus === 'submitting'
                      ? 'Saving donation...'
                      : 'Save donation'}
                  </button>

                  {formStatus === 'success' ? (
                    <p className="text-sm text-emerald-600">
                      Donation saved successfully.
                    </p>
                  ) : null}
                  {formError ? (
                    <p className="text-sm text-rose-600">{formError}</p>
                  ) : null}
                </form>
              </div>
            </div>

            <aside className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-medium text-slate-600">Total</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{statistics.total}</p>
                </div>
                <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-medium text-slate-600">Active</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">{statistics.active}</p>
                </div>
                <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-medium text-slate-600">Finished</p>
                  <p className="mt-1 text-2xl font-bold text-rose-600">{statistics.finished}</p>
                </div>
                <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-medium text-slate-600">Total Qty</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{statistics.totalQty}</p>
                </div>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Donations ({filteredAndSortedDonations.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => loadDonations()}
                    disabled={donationsLoading}
                    className="text-sm font-medium text-emerald-600 transition hover:text-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {donationsLoading ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>

                {/* Search and Filters */}
                <div className="mt-4 space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by food name, description, or donor..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                      />
                    </div>
                    <select
                      value={filterLocation}
                      onChange={(e) => setFilterLocation(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                    >
                      <option value="">All Locations</option>
                      {statistics.locations > 0 &&
                        [...new Set(donations.map((d) => d.location).filter(Boolean))].map(
                          (loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ),
                        )}
                    </select>
                    <select
                      value={filterStatus}
                      onChange={(e) =>
                        setFilterStatus(e.target.value as 'all' | 'active' | 'finished')
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active Only</option>
                      <option value="finished">Finished Only</option>
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'date' | 'qty' | 'name')}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                    >
                      <option value="date">Sort: Date</option>
                      <option value="qty">Sort: Quantity</option>
                      <option value="name">Sort: Name</option>
                    </select>
      </div>
                  {(searchQuery || filterLocation || filterStatus !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setFilterLocation('')
                        setFilterStatus('all')
                      }}
                      className="text-xs text-slate-600 underline hover:text-slate-900"
                    >
                      Clear filters
        </button>
                  )}
                </div>

                <div className="mt-4 space-y-4">
                {donationsError ? (
                  <p className="text-sm text-rose-600">{donationsError}</p>
                ) : null}
                {updateDonationError ? (
                  <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {updateDonationError}
                  </p>
                ) : null}

                {!donationsLoading && donations.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    No donations recorded yet. Add your first donation using the
                    form.
                  </p>
                ) : null}

                {!donationsLoading && donations.length > 0 && filteredAndSortedDonations.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    No donations match your filters. Try adjusting your search or filters.
                  </p>
                ) : null}

                {donationsLoading ? (
                  <p className="text-sm text-slate-600">Loading donations…</p>
                ) : (
                  filteredAndSortedDonations.map((donation) => {
                    const whatsappLink = buildWhatsAppLink(donation.contact_number)
                    return (
                      <article
                        key={donation.id}
                        className="rounded-lg border border-slate-200 p-4 shadow-sm transition hover:border-emerald-200 hover:shadow"
                      >
                        <header className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-semibold text-slate-900">
                            {donation.food_name}
                          </h3>
                        {donation.qty > 0 ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Qty: {donation.qty}
                          </span>
                        ) : (
                          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                            Finished
                          </span>
                        )}
                        </header>
                        {donation.description ? (
                          <p className="mt-2 text-sm text-slate-700">
                            {donation.description}
                          </p>
                        ) : null}
                        <div className="mt-3 space-y-1 text-sm text-slate-600">
                          {donation.name && (
                            <p>
                              <span className="font-medium">Name:</span> {donation.name}
                            </p>
                          )}
                          {donation.location && (
                            <p>
                              <span className="font-medium">Location:</span>{' '}
                              {donation.location}
                            </p>
                          )}
                          {donation.contact_number && (
                            <p>
                              <span className="font-medium">Contact:</span>{' '}
                              {whatsappLink ? (
                                <a
                                  href={whatsappLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-700 underline-offset-2 hover:underline"
                                >
                                  {formatPhoneForDisplay(donation.contact_number)}
                                </a>
                              ) : (
                                formatPhoneForDisplay(donation.contact_number)
                              )}
                            </p>
                          )}
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">
                          {new Date(donation.created_at).toLocaleString()}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(donation)}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                            disabled={updatingDonationId === donation.id || deletingDonationId === donation.id}
                          >
                            {updatingDonationId === donation.id ? (
                              <>
                                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
                                Updating
                              </>
                            ) : (
                              <>
                                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                                Update quantity
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDonation(donation.id)}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                            disabled={updatingDonationId === donation.id || deletingDonationId === donation.id}
                          >
                            {deletingDonationId === donation.id ? (
                              <>
                                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-600" />
                                Deleting
                              </>
                            ) : (
                              <>
                                <span className="h-2 w-2 rounded-full bg-rose-600" />
                                Delete
                              </>
                            )}
                          </button>
                        </div>
                      </article>
                    )
                  })
                )}
              </div>
              </div>
            </aside>
          </section>
        ) : null}
      </main>

      <footer className="mx-auto mt-8 w-full max-w-4xl px-4 pb-6 text-center text-xs text-slate-500">
        Built by Siddharth Venkatesh
      </footer>
    </div>
  )
}

export default App
