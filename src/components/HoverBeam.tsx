import { useState } from 'react'
import type { ComponentProps } from 'react'
import { BorderBeam } from 'border-beam'

type HoverBeamProps = Omit<ComponentProps<typeof BorderBeam>, 'active'>

export function HoverBeam({ children, ...props }: HoverBeamProps) {
  const [active, setActive] = useState(false)

  return (
    <BorderBeam
      {...props}
      active={active}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocusCapture={() => setActive(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setActive(false)
        }
      }}
    >
      {children}
    </BorderBeam>
  )
}