import { useState, useEffect } from 'react'

export default function useBreakpoint() {
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    let t
    const handler = () => {
      clearTimeout(t)
      t = setTimeout(() => setWidth(window.innerWidth), 100)
    }
    window.addEventListener('resize', handler)
    return () => { clearTimeout(t); window.removeEventListener('resize', handler) }
  }, [])

  return {
    isMobile:  width < 768,
    isTablet:  width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    width,
  }
}
