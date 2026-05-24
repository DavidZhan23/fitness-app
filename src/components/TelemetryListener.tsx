import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  flushTelemetry,
  trackInitialPageLoad,
  trackRouteChange,
} from '../lib/telemetry'

export function TelemetryListener() {
  const location = useLocation()
  const prevPath = useRef(location.pathname)
  const routeStartedAt = useRef(0)

  useEffect(() => {
    routeStartedAt.current = performance.now()
    trackInitialPageLoad(prevPath.current)
  }, [])

  useEffect(() => {
    const now = performance.now()
    if (prevPath.current !== location.pathname) {
      trackRouteChange(
        prevPath.current,
        location.pathname,
        now - routeStartedAt.current,
      )
      prevPath.current = location.pathname
      routeStartedAt.current = now
    }
  }, [location.pathname])

  useEffect(() => {
    return () => {
      void flushTelemetry(true)
    }
  }, [])

  return null
}
