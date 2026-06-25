import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

interface ScrollShadowState {
  left: boolean
  right: boolean
}

type ScrollShadowValue = 'none' | 'left' | 'right' | 'both'

export function useHorizontalScrollShadow(
  dependencies: ReadonlyArray<unknown> = []
): {
  scrollRef: RefObject<HTMLDivElement | null>
  scrollShadow: ScrollShadowState
  scrollShadowValue: ScrollShadowValue
  updateScrollShadow: () => void
  scrollChildIntoView: (element: Element) => void
} {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [scrollShadow, setScrollShadow] = useState<ScrollShadowState>({
    left: false,
    right: false
  })

  const updateScrollShadow = useCallback(() => {
    const element = scrollRef.current
    if (!element) {
      setScrollShadow({ left: false, right: false })
      return
    }

    const maxScrollLeft = element.scrollWidth - element.clientWidth
    const next = {
      left: element.scrollLeft > 1,
      right: maxScrollLeft - element.scrollLeft > 1
    }

    setScrollShadow((current) =>
      current.left === next.left && current.right === next.right ? current : next
    )
  }, [])

  const scrollChildIntoView = useCallback(
    (element: Element) => {
      element.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'auto'
      })
      window.requestAnimationFrame(updateScrollShadow)
    },
    [updateScrollShadow]
  )

  useEffect(() => {
    const element = scrollRef.current
    const frame = window.requestAnimationFrame(updateScrollShadow)
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateScrollShadow)

    if (element) {
      resizeObserver?.observe(element)
      for (const child of Array.from(element.children)) {
        resizeObserver?.observe(child)
      }
    }

    window.addEventListener('resize', updateScrollShadow)
    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateScrollShadow)
    }
  }, [updateScrollShadow, ...dependencies])

  const scrollShadowValue: ScrollShadowValue =
    scrollShadow.left && scrollShadow.right
      ? 'both'
      : scrollShadow.left
        ? 'left'
        : scrollShadow.right
          ? 'right'
          : 'none'

  return { scrollRef, scrollShadow, scrollShadowValue, updateScrollShadow, scrollChildIntoView }
}
