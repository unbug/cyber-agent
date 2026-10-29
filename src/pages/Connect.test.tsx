import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConnectPage } from './Connect'
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

  it('shows bridge command hint for hardware platforms', () => {
    renderAt()
    fireEvent.click(screen.getByText('CyberBrick Mini T'))
    expect(screen.getByText(/robot_bridge\.py --platform cyberbrick/)).toBeTruthy()
  })
})
