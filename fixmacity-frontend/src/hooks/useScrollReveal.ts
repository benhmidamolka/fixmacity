import { useEffect, useRef, type RefObject } from 'react'

interface ScrollRevealOptions {
  threshold?: number
  rootMargin?: string
  once?: boolean
}

/**
 * Returns a ref that, when attached to a DOM element, adds the class
 * `is-visible` once the element enters the viewport.
 * Pair with CSS transitions on `.reveal` → `.reveal.is-visible`.
 */
export function useScrollReveal<T extends HTMLElement = HTMLElement>(
  options: ScrollRevealOptions = {}
): RefObject<T | null> {
  const ref = useRef<T>(null)
  const { threshold = 0.05, rootMargin = '0px 0px -20px 0px', once = true } = options

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // If element is already in viewport on mount, reveal immediately
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('is-visible')
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible')
          if (once) observer.unobserve(el)
        } else if (!once) {
          el.classList.remove('is-visible')
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return ref
}
