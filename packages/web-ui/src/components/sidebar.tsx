import * as React from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Play,
  Settings,
  Clock,
  BarChart3,
  Zap,
  GitBranch,
  Activity,
} from 'lucide-react';
import { cn } from '../lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Test Runs', href: '/runs', icon: Play },
  { name: 'Schedules', href: '/schedules', icon: Clock },
  { name: 'Environments', href: '/environments', icon: Settings },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Webhooks', href: '/webhooks', icon: Zap },
  { name: 'Integrations', href: '/integrations', icon: GitBranch },
  { name: 'System', href: '/system', icon: Activity },
];

export function Sidebar() {
  const router = useRouter();
  const currentPath = router.state.location.pathname;

  return (
    <div
      className='flex h-full w-64 flex-col bg-[hsl(var(--card)/0.4)] border-r border-transparent backdrop-blur-xl shadow-xl relative overflow-hidden'
      style={{
        borderImage:
          'linear-gradient(120deg, rgba(120,119,198,0.25), rgba(255,255,255,0.08), rgba(120,119,198,0.15)) 1',
        borderWidth: 1,
      }}
    >
      <div className='flex h-16 items-center px-6 border-b-[hsl(var(--border)/0.5)]'>
        <div className='flex items-center space-x-2'>
          <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center'>
            <Play className='w-5 h-5 text-white' />
          </div>
          <span className='font-semibold text-lg'>Orchestrator</span>
        </div>
      </div>

      <nav className='flex-1 space-y-1 px-3 py-4'>
        {navigation.map(item => {
          const isActive = currentPath === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200',
                isActive
                  ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.5)]'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                  isActive
                    ? 'text-[hsl(var(--primary))]'
                    : 'text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]'
                )}
              />
              {item.name}
              {isActive && (
                <div className='ml-auto w-2 h-2 bg-[hsl(var(--primary))] rounded-full animate-pulse' />
              )}
            </Link>
          );
        })}
      </nav>

      <div className='border-t-[hsl(var(--border)/0.5)] p-4'>
        <div className='rounded-lg bg-[hsl(var(--muted)/0.5)] p-3'>
          <div className='flex items-center space-x-2'>
            <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse' />
            <span className='text-xs text-[hsl(var(--muted-foreground))]'>
              System Online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
