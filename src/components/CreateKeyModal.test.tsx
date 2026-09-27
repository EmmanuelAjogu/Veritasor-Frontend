import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CreateKeyModal } from './CreateKeyModal'

function renderModal(isOpen = true) {
  const onClose = vi.fn()
  const onCreated = vi.fn()
  const view = render(<CreateKeyModal isOpen={isOpen} onClose={onClose} onCreated={onCreated} />)
  return { ...view, onClose, onCreated }
}

describe('CreateKeyModal', () => {
  it('returns no content or callbacks while closed', () => {
    const { container, onClose, onCreated } = renderModal(false)

    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('renders the configuration form and default scope while open', () => {
    renderModal()

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByLabelText('Application Key Name')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'read' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'write' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Generate Secret Token' })).toBeInTheDocument()
  })

  it('does not create a key for a whitespace-only name', () => {
    const { onCreated } = renderModal()
    fireEvent.change(screen.getByLabelText('Application Key Name'), { target: { value: '   ' } })
    const form = screen.getByRole('button', { name: 'Generate Secret Token' }).closest('form')

    fireEvent.submit(form!)

    expect(onCreated).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Generate Secret Token' })).toBeInTheDocument()
    expect(screen.queryByText('Secret Token Storage Requirement')).not.toBeInTheDocument()
  })

  it('creates a key with the trimmed name and selected scopes', () => {
    const { onCreated } = renderModal()
    fireEvent.change(screen.getByLabelText('Application Key Name'), { target: { value: '  CI worker  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'write' }))
    fireEvent.click(screen.getByRole('button', { name: 'Generate Secret Token' }))

    expect(onCreated).toHaveBeenCalledOnce()
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.stringMatching(/^key_\d+$/),
      name: 'CI worker',
      prefix: expect.stringMatching(/^vts_live_.+\.\.\.$/),
      scopes: ['read', 'write'],
      status: 'active',
    }))
    expect(screen.getByText('Secret Token Storage Requirement')).toBeInTheDocument()
    expect(document.getElementById('revealed-token')).toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: 'I Have Saved This Secret Token Safely' })).toBeDisabled()
  })

  it('keeps the last scope selected and resets configuration after closing and reopening', () => {
    const { rerender, onClose, onCreated } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'read' }))
    expect(screen.getByRole('button', { name: 'read' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(screen.getByLabelText('Application Key Name'), { target: { value: 'Old name' } })
    fireEvent.click(screen.getByRole('button', { name: 'write' }))

    rerender(<CreateKeyModal isOpen={false} onClose={onClose} onCreated={onCreated} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    rerender(<CreateKeyModal isOpen onClose={onClose} onCreated={onCreated} />)
    expect(screen.getByLabelText('Application Key Name')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'read' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'write' })).toHaveAttribute('aria-pressed', 'false')
    expect(onCreated).not.toHaveBeenCalled()
  })
})
