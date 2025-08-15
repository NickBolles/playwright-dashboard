import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '@/lib/auth'
import { Sidebar } from '@/components/sidebar'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    return await requireAuth()
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <div className='flex h-screen bg-background'>
      <Sidebar />
      <main className='flex-1 overflow-y-auto p-8'>
        <Outlet />
      </main>
    </div>
  )
}
