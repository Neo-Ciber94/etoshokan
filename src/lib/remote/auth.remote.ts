import { query, getRequestEvent } from '$app/server'

export const getSession = query(async () => {
  const event = getRequestEvent()
  return event.locals.auth()
})
