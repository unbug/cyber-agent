import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RemoteQrPanel } from './Connect'
import { I18nProvider } from '@/i18n'

function at(url?: string) {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <RemoteQrPanel remoteUrl={url} />
      </I18nProvider>
    </MemoryRouter>,
  )
}

describe('RemoteQrPanel', () => {
  it('renders nothing without a remote URL', () => {
    const { container } = at(undefined)
    expect(container.innerHTML).toBe('')
  })

  it('shows QR + link when the bridge advertises remote_url', () => {
    const { container } = at('http://192.168.1.5:9765/remote')
    expect(container.querySelector('svg')).toBeTruthy()
    expect(screen.getByText('Scan to control from your phone')).toBeTruthy()
    expect(screen.getByText('http://192.168.1.5:9765/remote')).toBeTruthy()
  })
})
