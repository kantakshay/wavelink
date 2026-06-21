const gtag = (...args) => {
  if (typeof window.gtag === "function") window.gtag(...args)
}

export const trackEvent = (action, category, params = {}) => {
  gtag("event", action, { event_category: category, ...params })
}
