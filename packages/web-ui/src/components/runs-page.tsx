import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  MoreVertical,
  ExternalLink,
  RefreshCw,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select } from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { api } from '../lib/api';

interface Run {
  id: string;
  environment_id: string;
  status:
    | 'queued'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'error'
    | 'cancelled';
  start_time?: string;
  end_time?: string;
  duration_ms?: number;
  error_log?: string;
  trace_url?: string;
  triggered_by: 'manual' | 'schedule' | 'webhook' | 'api';
  created_at: string;
  environment: {
    name: string;
    base_url: string;
  };
}

interface Environment {
  id: string;
  name: string;
  base_url: string;
}

const statusIcons = {
  queued: Clock,
  in_progress: RefreshCw,
  success: CheckCircle,
  failed: XCircle,
  error: AlertCircle,
  cancelled: XCircle,
};

const statusColors = {
  queued: 'bg-yellow-500/10 text-yellow-500',
  in_progress: 'bg-blue-500/10 text-blue-500',
  success: 'bg-green-500/10 text-green-500',
  failed: 'bg-red-500/10 text-red-500',
  error: 'bg-red-500/10 text-red-500',
  cancelled: 'bg-gray-500/10 text-gray-500',
};

export function RunsPage() {
  const [filters, setFilters] = useState({
    environment_id: '',
    status: '',
    search: '',
    limit: 50,
    offset: 0,
  });
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: runsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['runs', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.environment_id)
        params.append('environment_id', filters.environment_id);
      if (filters.status) params.append('status', filters.status);
      params.append('limit', filters.limit.toString());
      params.append('offset', filters.offset.toString());
      params.append('sort', 'created_at');
      params.append('order', 'desc');

      return api.get(`/api/runs?${params.toString()}`);
    },
  });

  const { data: environmentsData } = useQuery({
    queryKey: ['environments'],
    queryFn: () => api.get('/api/environments'),
  });

  const createRunMutation = useMutation({
    mutationFn: (data: { environment_id: string }) =>
      api.post('/api/runs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const cancelRunMutation = useMutation({
    mutationFn: (runId: string) => api.post(`/api/runs/${runId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      setShowDetails(false);
    },
  });

  const runs = runsData?.data?.runs || [];
  const environments = environmentsData?.data?.environments || [];

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const filteredRuns = runs.filter((run: Run) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        run.id.toLowerCase().includes(searchLower) ||
        run.environment.name.toLowerCase().includes(searchLower) ||
        run.status.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Test Runs</h1>
          <p className='text-[hsl(var(--muted-foreground))]'>
            Monitor and manage your Playwright test executions
          </p>
        </div>
        <div className='flex items-center space-x-2'>
          <Button variant='outline' onClick={() => refetch()}>
            <RefreshCw className='w-4 h-4 mr-2' />
            Refresh
          </Button>
          <Select
            value={filters.environment_id}
            onChange={e =>
              setFilters({ ...filters, environment_id: e.target.value })
            }
            className='w-48'
          >
            <option value=''>All Environments</option>
            {environments.map((env: Environment) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </Select>
          <Button
            onClick={() => {
              const defaultEnv = environments[0];
              if (defaultEnv) {
                createRunMutation.mutate({ environment_id: defaultEnv.id });
              }
            }}
            disabled={createRunMutation.isPending}
          >
            <Play className='w-4 h-4 mr-2' />
            New Run
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center'>
            <Filter className='w-5 h-5 mr-2' />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex space-x-4'>
            <div className='flex-1'>
              <Input
                placeholder='Search runs...'
                value={filters.search}
                onChange={e =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className='max-w-sm'
              />
            </div>
            <Select
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
              className='w-48'
            >
              <option value=''>All Status</option>
              <option value='queued'>Queued</option>
              <option value='in_progress'>In Progress</option>
              <option value='success'>Success</option>
              <option value='failed'>Failed</option>
              <option value='error'>Error</option>
              <option value='cancelled'>Cancelled</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Runs ({filteredRuns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='flex items-center justify-center py-8'>
              <RefreshCw className='w-6 h-6 animate-spin mr-2' />
              Loading runs...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRuns.map((run: Run) => {
                  const StatusIcon = statusIcons[run.status];
                  return (
                    <TableRow key={run.id}>
                      <TableCell>
                        <Badge className={statusColors[run.status]}>
                          <StatusIcon className='w-3 h-3 mr-1' />
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className='font-medium'>
                            {run.environment.name}
                          </div>
                          <div className='text-sm text-muted-foreground'>
                            {run.environment.base_url}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {run.duration_ms
                          ? formatDuration(run.duration_ms)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>{run.triggered_by}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(run.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center space-x-2'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                              setSelectedRun(run);
                              setShowDetails(true);
                            }}
                          >
                            <MoreVertical className='w-4 h-4' />
                          </Button>
                          {run.trace_url && (
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() =>
                                window.open(run.trace_url, '_blank')
                              }
                            >
                              <ExternalLink className='w-4 h-4' />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Run Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Run Details</DialogTitle>
          </DialogHeader>
          {selectedRun && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm font-medium text-muted-foreground'>
                    Status
                  </label>
                  <div className='flex items-center space-x-2'>
                    {(() => {
                      const StatusIcon = statusIcons[selectedRun.status];
                      return <StatusIcon className='w-4 h-4' />;
                    })()}
                    <span className='capitalize'>{selectedRun.status}</span>
                  </div>
                </div>
                <div>
                  <label className='text-sm font-medium text-muted-foreground'>
                    Environment
                  </label>
                  <p>{selectedRun.environment.name}</p>
                </div>
                <div>
                  <label className='text-sm font-medium text-muted-foreground'>
                    Duration
                  </label>
                  <p>
                    {selectedRun.duration_ms
                      ? formatDuration(selectedRun.duration_ms)
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className='text-sm font-medium text-muted-foreground'>
                    Triggered By
                  </label>
                  <p className='capitalize'>{selectedRun.triggered_by}</p>
                </div>
                <div>
                  <label className='text-sm font-medium text-muted-foreground'>
                    Created
                  </label>
                  <p>
                    {format(
                      new Date(selectedRun.created_at),
                      'MMM d, yyyy HH:mm:ss'
                    )}
                  </p>
                </div>
                <div>
                  <label className='text-sm font-medium text-muted-foreground'>
                    ID
                  </label>
                  <p className='font-mono text-sm'>{selectedRun.id}</p>
                </div>
              </div>

              {selectedRun.error_log && (
                <div>
                  <label className='text-sm font-medium text-muted-foreground'>
                    Error Log
                  </label>
                  <pre className='mt-2 p-4 bg-muted rounded-md text-sm whitespace-pre-wrap'>
                    {selectedRun.error_log}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <div className='flex justify-between w-full'>
              <div>
                {selectedRun?.trace_url && (
                  <Button
                    variant='outline'
                    onClick={() => window.open(selectedRun.trace_url, '_blank')}
                  >
                    <ExternalLink className='w-4 h-4 mr-2' />
                    View Trace
                  </Button>
                )}
              </div>
              <div className='flex space-x-2'>
                {selectedRun?.status === 'queued' && (
                  <Button
                    variant='destructive'
                    onClick={() => cancelRunMutation.mutate(selectedRun.id)}
                    disabled={cancelRunMutation.isPending}
                  >
                    <Trash2 className='w-4 h-4 mr-2' />
                    Cancel
                  </Button>
                )}
                <Button variant='outline' onClick={() => setShowDetails(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
