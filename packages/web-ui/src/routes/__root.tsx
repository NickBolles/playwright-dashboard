import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { Sidebar } from '../components/sidebar'
import { ThemeToggle } from '../components/theme-toggle'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center justify-between px-6">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold">Playwright Orchestrator</h1>
              </div>
              <div className="flex items-center space-x-4">
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}