import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RoomPage } from './Room'
import { I18nProvider } from '@/i18n'

function at() {
  return render(
    <MemoryRouter initialEntries={['/room']}>
      <I18nProvider>
        <RoomPage />
      </I18nProvider>
    </MemoryRouter>,
  )
}

const writeText = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
})
afterEach(() => vi.unstubAllGlobals())

describe('RoomPage', () => {
  it('renders heading and empty state with quick-start presets', () => {
    at()
    expect(screen.getByText('Multi-Robot Room')).toBeTruthy()
    expect(screen.getByText(/Cat & Dog friends demo/)).toBeTruthy()
  })

  it('quick-start adds members and enables copy-room-link', async () => {
    at()
    fireEvent.click(screen.getByText(/Add Puppy/))
    await waitFor(() => expect(screen.queryByText(/Copy room link/)).toBeTruthy())
    fireEvent.click(screen.getByText(/Copy room link/))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(writeText.mock.calls[0][0]).toContain('?a=puppy')
  })
})
