import ReactGA from "react-ga4"

export const initAnalytics = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID
  if (!measurementId) return
  ReactGA.initialize(measurementId)
}

export const trackEvent = (action, category, params = {}) => {
  ReactGA.event({ action, category, ...params })
}
