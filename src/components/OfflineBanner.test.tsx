import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OfflineBanner, { type OfflineBannerProps } from './OfflineBanner'

describe('OfflineBanner behavior', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: false })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows an accessible offline status with default props', () => {
    render(<OfflineBanner />)

    const status = screen.getByRole('status', { name: /you are offline/i })
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent(/showing cached data/i)
    expect(screen.queryByText('Stale')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry connecting to the server' }))
      .toHaveAttribute('type', 'button')
  })

  it('updates the stale-data chip when its prop changes', () => {
    const props: OfflineBannerProps = { hasStaleData: true }
    const { rerender } = render(<OfflineBanner {...props} />)
    expect(screen.getByText('Stale')).toHaveAccessibleName('Data may be outdated')

    rerender(<OfflineBanner hasStaleData={false} />)
    expect(screen.queryByText('Stale')).not.toBeInTheDocument()

    rerender(<OfflineBanner hasStaleData />)
    expect(screen.getByText('Stale')).toBeInTheDocument()
  })

  it('appears and disappears as browser connectivity events change', () => {
    vi.stubGlobal('navigator', { onLine: true })
    render(<OfflineBanner />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    act(() => window.dispatchEvent(new Event('offline')))
    expect(screen.getByRole('status')).toBeInTheDocument()

    act(() => window.dispatchEvent(new Event('online')))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    act(() => window.dispatchEvent(new Event('offline')))
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('hides after a successful HEAD retry probe', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    render(<OfflineBanner apiBaseUrl="https://api.example.com" />)

    fireEvent.click(screen.getByRole('button', { name: /retry connecting/i }))
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com', {
      method: 'HEAD',
      cache: 'no-store',
      signal: expect.any(AbortSignal),
    })
  })

  it('remains visible after a failed response, then hides after a successful retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    render(<OfflineBanner apiBaseUrl="https://api.example.com" hasStaleData />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /retry connecting/i }))
    })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Stale')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /retry connecting/i }))
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps the banner visible when an invalid endpoint rejects the probe', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Invalid URL'))
    vi.stubGlobal('fetch', fetchMock)
    render(<OfflineBanner apiBaseUrl="not a URL" />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /retry connecting/i }))
    })
    expect(fetchMock).toHaveBeenCalledWith('not a URL', expect.objectContaining({ method: 'HEAD' }))
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('uses the browser flag when no API endpoint is configured', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<OfflineBanner apiBaseUrl="" />)
    expect(screen.getByRole('status')).toBeInTheDocument()

    vi.stubGlobal('navigator', { onLine: true })
    fireEvent.click(screen.getByRole('button', { name: /retry connecting/i }))
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
