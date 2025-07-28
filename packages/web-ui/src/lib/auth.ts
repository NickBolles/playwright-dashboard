import { getAuth } from '@clerk/tanstack-react-start/server'
import { redirect } from '@tanstack/react-router'

export async function requireAuth() {
  const { userId } = await getAuth()
  
  if (!userId) {
    throw redirect({
      to: '/sign-in',
      search: {
        redirect: window.location.pathname,
      },
    })
  }
  
  return { userId }
}

export async function getAuthUser() {
  const { userId } = await getAuth()
  return { userId }
}

