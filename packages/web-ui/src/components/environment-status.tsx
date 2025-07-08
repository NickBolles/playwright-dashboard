import { CheckCircle, XCircle, Clock, Activity } from 'lucide-react'
import { Badge } from './ui/badge'
import { cn } from '../lib/utils'

interface Environment {
  id: string
  name: string
  base_url: string
  concurrency_limit: number
  status?: 'healthy' | 'degraded' | 'down'
}

interface EnvironmentStatusProps {
  environments: Environment[]
}

export function EnvironmentStatus({ environments }: EnvironmentStatusProps) {
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'degraded':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'down':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status?: string) => {
    const variants = {
      healthy: 'bg-green-500/20 text-green-400 border-green-500/30',
      degraded: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      down: 'bg-red-500/20 text-red-400 border-red-500/30',
    }
    
    return (
      <Badge 
        variant="outline" 
        className={cn('border', variants[status as keyof typeof variants] || 'bg-gray-500/20 text-gray-400 border-gray-500/30')}
      >
        {status || 'unknown'}
      </Badge>
    )
  }

  if (!environments.length) {
    return (
      <div className="text-center py-8">
        <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No environments configured</p>
        <p className="text-sm text-muted-foreground">Add environments to start testing</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {environments.map((env) => (
        <div
          key={env.id}
          className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50"
        >
          <div className="flex items-center space-x-3">
            {getStatusIcon(env.status)}
            <div>
              <div className="font-medium">{env.name}</div>
              <div className="text-sm text-muted-foreground">
                {env.base_url}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {env.concurrency_limit} concurrent
            </Badge>
            {getStatusBadge(env.status)}
          </div>
        </div>
      ))}
      
      <div className="pt-2">
        <div className="text-xs text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}