import { useEffect, useRef, useState } from 'react'

export function useScrollAnimation(options = {}) {
  // Defensive check for Lovable build issues - check if hooks are actually functions
  if (typeof useRef !== 'function' || typeof useState !== 'function' || typeof useEffect !== 'function') {
    console.warn('React hooks not available, using fallback');
    return { 
      ref: { current: null }, 
      isVisible: true // Show immediately if hooks unavailable
    };
  }
  
  try {
    // Try to use hooks - if React is null/undefined, this will throw
    const ref = useRef(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
      const element = ref.current
      if (!element) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.unobserve(element)
          }
        },
        {
          threshold: options.threshold || 0.1,
          rootMargin: options.rootMargin || '0px 0px -50px 0px',
        }
      )

      observer.observe(element)

      return () => observer.disconnect()
    }, [options.threshold, options.rootMargin])

    return { ref, isVisible }
  } catch (error) {
    // Fallback if React hooks are not available (Lovable build issue)
    console.warn('React hooks not available, using fallback:', error);
    return { 
      ref: { current: null }, 
      isVisible: true // Show immediately if hooks unavailable
    };
  }
}

export function useStaggeredAnimation(itemCount, baseDelay = 100) {
  // Defensive check for Lovable build issues
  try {
    const { ref, isVisible } = useScrollAnimation()
    
    const getDelay = (index) => ({
      transitionDelay: `${index * baseDelay}ms`,
    })

    return { ref, isVisible, getDelay }
  } catch (error) {
    // Fallback if React hooks are not available (Lovable build issue)
    console.warn('React hooks not available in useStaggeredAnimation, using fallback:', error);
    return { 
      ref: { current: null }, 
      isVisible: true,
      getDelay: (index) => ({ transitionDelay: `${index * baseDelay}ms` })
    };
  }
}
