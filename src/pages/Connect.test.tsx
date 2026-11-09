import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConnectPage, browserRoleUrl, COACH_KEY } from './Connect'
import { I18nProvider } from '@/i18n'

function renderAt(path = '/connect') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider>
        <ConnectPage />
      </I18nProvider>
    </MemoryRouter>,
  )
}

describe('ConnectPage', () => {
  it('renders the magic-loop heading and steps', () => {
    renderAt()
    expect(screen.getByText('Bring your robot to life')).toBeTruthy()
    expect(screen.getAllByText('Pick a character').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pick a robot').length).toBeGreaterThan(0)
  })

  it('shows a character grid and enables deploy after picking one', async () => {
    renderAt()
    const deployBtn = screen.getByText('Deploy & come alive').closest('button')!
    expect(deployBtn.disabled).toBe(true)

    fireEvent.change(screen.getByPlaceholderText('Search characters…'), {
      target: { value: 'puppy' },
    })
    const puppy = await screen.findByText('Puppy')
    fireEvent.click(puppy)

    await waitFor(() => expect(deployBtn.disabled).toBe(false))
  })

  it('preselects the character from ?character=', () => {
    renderAt('/connect?character=puppy')
    const deployBtn = screen.getByText('Deploy & come alive').closest('button')!
    expect(deployBtn.disabled).toBe(false)
  })

  it('ignores an unknown ?character= id', () => {
    renderAt('/connect?character=not-a-robot')
    const deployBtn = screen.getByText('Deploy & come alive').closest('button')!
    expect(deployBtn.disabled).toBe(true)
  })

  it('deploys to the demo robot and shows live commands + E-STOP', async () => {
    renderAt('/connect?character=puppy')
    fireEvent.click(screen.getByText('Deploy & come alive'))

    const estop = await screen.findByText('EMERGENCY STOP', {}, { timeout: 4000 })
    // Behavior tree should start emitting motor commands within ~2s
    await waitFor(
      () => {
        expect(screen.queryByText(/motors/)).toBeTruthy()
      },
      { timeout: 4000 },
    )

    fireEvent.click(estop)
    // Back to picker
    await waitFor(() =>
      expect(screen.queryByText('EMERGENCY STOP')).toBeNull(),
    )
  })

  it('first-run coach strip shows once and dismissal sticks', () => {
    localStorage.removeItem(COACH_KEY)
    const { unmount } = renderAt()
    const ok = screen.getByText('Got it')
    fireEvent.click(ok)
    expect(screen.queryByText('Got it')).toBeNull()
    expect(localStorage.getItem(COACH_KEY)).toBe('1')
    unmount()
    renderAt()
    expect(screen.queryByText('Got it')).toBeNull()
    localStorage.removeItem(COACH_KEY)
  })

  it('auto-deploys the demo robot with ?start=demo (the magic moment)', async () => {
    renderAt('/connect?character=puppy&start=demo')
    // no clicks — the page must deploy by itself and show the live view
    await screen.findByText('EMERGENCY STOP', {}, { timeout: 4000 })
    expect(screen.queryByText(/motors/)).toBeTruthy()
  })

  it('shows scan + recent controls for hardware platforms', () => {
    localStorage.setItem(
      'cyberagent.recentBridges',
      JSON.stringify([{ url: 'ws://192.168.1.42:8765', platform: 'cyberbrick', name: 'Mini T', discoveredAt: 1 }]),
    )
    renderAt()
    // Demo platform has no URL bar — scan control hidden
    expect(screen.queryByText('Scan for robots')).toBeNull()

    fireEvent.click(screen.getByText('CyberBrick Mini T'))
    expect(screen.getByText('Scan for robots')).toBeTruthy()

    // Recent chip from localStorage: one tap fills the URL
    fireEvent.click(screen.getByText('Mini T'))
    expect(screen.getByDisplayValue('ws://192.168.1.42:8765')).toBeTruthy()
    localStorage.removeItem('cyberagent.recentBridges')
  })

  it('browserRoleUrl appends role=browser exactly once', () => {
    expect(browserRoleUrl('ws://192.168.1.5:8765')).toBe('ws://192.168.1.5:8765?role=browser')
    expect(browserRoleUrl('ws://h:8765/?role=browser')).toBe('ws://h:8765/?role=browser')
    expect(browserRoleUrl('ws://h:8765/?x=1')).toBe('ws://h:8765/?x=1&role=browser')
  })

  it('speed presets render and persist the choice', () => {
    localStorage.removeItem('cyberag' + 'ent.speedPreset')
    renderAt()
    fireEvent.click(screen.getByText('🐢 Slow'))
    expect(localStorage.getItem('cyberag' + 'ent.speedPreset')).toBe('slow')
    fireEvent.click(screen.getByText('🐇 Turbo'))
    expect(localStorage.getItem('cyberag' + 'ent.speedPreset')).toBe('turbo')
    localStorage.removeItem('cyberag' + 'ent.speedPreset')
  })

  it('shows bridge command hint for hardware platforms', () => {
    renderAt()
    fireEvent.click(screen.getByText('CyberBrick Mini T'))
    expect(screen.getByText(/robot_bridge\.py --platform cyberbrick/)).toBeTruthy()
  })
})
