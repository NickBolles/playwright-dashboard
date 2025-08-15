import * as React from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { UserButton, useUser } from '@clerk/tanstack-react-start';
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
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Test Runs', href: '/dashboard/runs', icon: Play },
  { name: 'Schedules', href: '/dashboard/schedules', icon: Clock },
  { name: 'Environments', href: '/dashboard/environments', icon: Settings },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Webhooks', href: '/dashboard/webhooks', icon: Zap },
  { name: 'Integrations', href: '/dashboard/integrations', icon: GitBranch },
  { name: 'System', href: '/dashboard/system', icon: Activity },
];

export function Sidebar() {
  const router = useRouter();
  const currentPath = router.state.location.pathname;
  const { user } = useUser();

  return (
    <div className='flex h-full w-64 flex-col bg-card border-r border-border'>
      <div className='flex h-16 items-center px-6 border-b border-border'>
        <div className='flex items-center space-x-2'>
          <div className='w-8 h-8 bg-primary rounded-lg flex items-center justify-center'>
            <Play className='w-5 h-5 text-primary-foreground' />
          </div>
          <span className='font-semibold text-lg text-foreground'>Orchestrator</span>
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
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              {item.name}
              {isActive && (
                <div className='ml-auto w-2 h-2 bg-primary rounded-full' />
              )}
            </Link>
          );
        })}
      </nav>

      <div className='border-t border-border p-4 space-y-4'>
        {user && (
          <div className='flex items-center space-x-3 p-3 rounded-lg bg-muted/50'>
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                }
              }}
            />
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium text-foreground truncate'>
                {user.firstName} {user.lastName}
              </p>
              <p className='text-xs text-muted-foreground truncate'>
                {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        )}
        
        <div className='rounded-lg bg-muted/50 p-3'>
          <div className='flex items-center space-x-2'>
            <div className='w-2 h-2 bg-green-500 rounded-full' />
            <span className='text-xs text-muted-foreground'>
              System Online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
