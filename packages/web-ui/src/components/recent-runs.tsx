import { formatDistanceToNow } from 'date-fns';
import { Play, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface Run {
  id: string;
  status: string;
  start_time?: string;
  end_time?: string;
  duration_ms?: number;
  environment: {
    name: string;
  };
  created_at: string;
}

interface RecentRunsProps {
  runs: Run[];
}

export function RecentRuns({ runs }: RecentRunsProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className='w-4 h-4 text-green-500' />;
      case 'failed':
        return <XCircle className='w-4 h-4 text-red-500' />;
      case 'in_progress':
        return <Clock className='w-4 h-4 text-blue-500 animate-spin' />;
      case 'queued':
        return <Clock className='w-4 h-4 text-yellow-500' />;
      default:
        return <Play className='w-4 h-4 text-gray-500' />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'bg-green-500/20 text-green-400 border-green-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
      in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      queued: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };

    return (
      <Badge
        variant='outline'
        className={cn(
          'border',
          variants[status as keyof typeof variants] || variants.cancelled
        )}
      >
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const minutes = Math.floor(ms / 1000 / 60);
    const seconds = Math.floor((ms / 1000) % 60);
    return `${minutes}m ${seconds}s`;
  };

  if (!runs.length) {
    return (
      <div className='text-center py-8'>
        <Play className='w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4' />
        <p className='text-[hsl(var(--muted-foreground))]'>No test runs yet</p>
        <p className='text-sm text-[hsl(var(--muted-foreground))]'>
          Start your first test run to see results here
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {runs.map(run => (
        <div
          key={run.id}
          className='flex items-center justify-between p-4 rounded-lg border-[hsl(var(--border)/0.5)] bg-[hsl(var(--card)/0.5)] hover:bg-[hsl(var(--card)/0.8)] transition-colors'
        >
          <div className='flex items-center space-x-4'>
            {getStatusIcon(run.status)}
            <div>
              <div className='flex items-center space-x-2'>
                <span className='font-medium'>Run {run.id.slice(0, 8)}</span>
                {getStatusBadge(run.status)}
              </div>
              <div className='text-sm text-muted-foreground'>
                {run.environment.name} •{' '}
                {formatDistanceToNow(new Date(run.created_at), {
                  addSuffix: true,
                })}
              </div>
            </div>
          </div>

          <div className='flex items-center space-x-4'>
            <div className='text-right'>
              <div className='text-sm font-medium'>
                {formatDuration(run.duration_ms)}
              </div>
              <div className='text-xs text-muted-foreground'>Duration</div>
            </div>

            <Button variant='ghost' size='sm'>
              <ExternalLink className='w-4 h-4' />
            </Button>
          </div>
        </div>
      ))}

      <div className='text-center pt-4'>
        <Button variant='outline' size='sm'>
          View All Runs
        </Button>
      </div>
    </div>
  );
}
