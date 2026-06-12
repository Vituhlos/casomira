import type { ReactNode } from 'react'
import { Modal as HeroModal } from '@heroui/react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}

export function Modal({ title, onClose, children, footer, width = 560 }: ModalProps): React.JSX.Element {
  return (
    <HeroModal>
      <HeroModal.Backdrop isOpen onOpenChange={(open) => { if (!open) onClose() }}>
        <HeroModal.Container>
          <HeroModal.Dialog
            className="max-w-[calc(100vw-2rem)]"
            style={{ width }}
          >
            <HeroModal.Header>
              <span className="text-base font-semibold">{title}</span>
            </HeroModal.Header>
            <HeroModal.Body>{children}</HeroModal.Body>
            {footer && (
              <HeroModal.Footer className="flex justify-end gap-2">
                {footer}
              </HeroModal.Footer>
            )}
          </HeroModal.Dialog>
        </HeroModal.Container>
      </HeroModal.Backdrop>
    </HeroModal>
  )
}
