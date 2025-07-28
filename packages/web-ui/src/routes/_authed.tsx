import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '@/lib/auth'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    return await requireAuth()
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  return <Outlet />
}

