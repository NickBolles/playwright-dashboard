import { Link, useRouter } from '@tanstack/react-router'
import { 
  LayoutDashboard, 
  Play, 
  Settings, 
  Clock, 
  BarChart3,
  Zap,
  GitBranch,
  Activity
} from 'lucide-react'
import { cn } from '../lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Test Runs', href: '/runs', icon: Play },
  { name: 'Schedules', href: '/schedules', icon: Clock },
  { name: 'Environments', href: '/environments', icon: Settings },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Webhooks', href: '/webhooks', icon: Zap },
  { name: 'Integrations', href: '/integrations', icon: GitBranch },
  { name: 'System', href: '/system', icon: Activity },
]

export function Sidebar() {
  const router = useRouter()
  const currentPath = router.state.location.pathname

  return (
    <div className="flex h-full w-64 flex-col bg-card/50 border-r border-border/50 backdrop-blur-sm">
      <div className="flex h-16 items-center px-6 border-b border-border/50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Play className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg">Orchestrator</span>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = currentPath === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              {item.name}
              {isActive && (
                <div className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
            </Link>
          )
        })}
      </nav>
      
      <div className="border-t border-border/50 p-4">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">System Online</span>
          </div>
        </div>
      </div>
    </div>
  )
}