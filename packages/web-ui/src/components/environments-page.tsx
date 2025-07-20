import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Globe,
  Activity,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Server,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
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

interface Environment {
  id: string;
  name: string;
  base_url: string;
  concurrency_limit: number;
  created_at: string;
  updated_at: string;
}

interface EnvironmentInfo extends Environment {
  current_runs: number;
  total_runs: number;
  success_rate: number;
  last_run_at?: string;
}

export function EnvironmentsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEnvironment, setEditingEnvironment] =
    useState<Environment | null>(null);
  const [deleteEnvironment, setDeleteEnvironment] =
    useState<Environment | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    base_url: '',
    concurrency_limit: 1,
  });
  const queryClient = useQueryClient();

  const {
    data: environmentsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['environments'],
    queryFn: () => api.get('/api/environments'),
  });

  const { data: statsData } = useQuery({
    queryKey: ['environment-stats'],
    queryFn: () => api.get('/api/environments/stats'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/api/environments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      queryClient.invalidateQueries({ queryKey: ['environment-stats'] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) =>
      api.patch(`/api/environments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      queryClient.invalidateQueries({ queryKey: ['environment-stats'] });
      setEditingEnvironment(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/environments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      queryClient.invalidateQueries({ queryKey: ['environment-stats'] });
      setDeleteEnvironment(null);
    },
  });

  const environments = environmentsData?.data?.environments || [];
  const stats = statsData?.data?.environments || [];

  const resetForm = () => {
    setFormData({
      name: '',
      base_url: '',
      concurrency_limit: 1,
    });
  };

  const handleEdit = (env: Environment) => {
    setEditingEnvironment(env);
    setFormData({
      name: env.name,
      base_url: env.base_url,
      concurrency_limit: env.concurrency_limit,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEnvironment) {
      updateMutation.mutate({ id: editingEnvironment.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getEnvironmentStatus = (env: Environment) => {
    const stat = stats.find((s: any) => s.environment_id === env.id);
    if (!stat)
      return { status: 'unknown', current: 0, limit: env.concurrency_limit };

    const current = stat.current_runs || 0;
    const limit = env.concurrency_limit;

    if (current >= limit) return { status: 'full', current, limit };
    if (current > 0) return { status: 'active', current, limit };
    return { status: 'idle', current, limit };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500';
      case 'full':
        return 'bg-red-500/10 text-red-500';
      case 'idle':
        return 'bg-gray-500/10 text-gray-500';
      default:
        return 'bg-yellow-500/10 text-yellow-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return CheckCircle;
      case 'full':
        return AlertCircle;
      case 'idle':
        return Activity;
      default:
        return RefreshCw;
    }
  };

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Environments</h1>
          <p className='text-[hsl(var(--muted-foreground))]'>
            Manage test environments and their configurations
          </p>
        </div>
        <div className='flex items-center space-x-2'>
          <Button variant='outline' onClick={() => refetch()}>
            <RefreshCw className='w-4 h-4 mr-2' />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className='w-4 h-4 mr-2' />
            New Environment
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Environments
            </CardTitle>
            <Server className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{environments.length}</div>
            <p className='text-xs text-muted-foreground'>
              Configured environments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Active Runs</CardTitle>
            <Activity className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {stats.reduce(
                (sum: number, stat: any) => sum + (stat.current_runs || 0),
                0
              )}
            </div>
            <p className='text-xs text-muted-foreground'>Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Capacity
            </CardTitle>
            <Settings className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {environments.reduce(
                (sum: number, env: Environment) => sum + env.concurrency_limit,
                0
              )}
            </div>
            <p className='text-xs text-muted-foreground'>Max concurrent runs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Utilization</CardTitle>
            <Globe className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {environments.length > 0
                ? Math.round(
                    (stats.reduce(
                      (sum: number, stat: any) =>
                        sum + (stat.current_runs || 0),
                      0
                    ) /
                      environments.reduce(
                        (sum: number, env: Environment) =>
                          sum + env.concurrency_limit,
                        0
                      )) *
                      100
                  )
                : 0}
              %
            </div>
            <p className='text-xs text-muted-foreground'>Capacity in use</p>
          </CardContent>
        </Card>
      </div>

      {/* Environments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Environments ({environments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='flex items-center justify-center py-8'>
              <RefreshCw className='w-6 h-6 animate-spin mr-2' />
              Loading environments...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Base URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Concurrency</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {environments.map((env: Environment) => {
                  const { status, current, limit } = getEnvironmentStatus(env);
                  const StatusIcon = getStatusIcon(status);

                  return (
                    <TableRow key={env.id}>
                      <TableCell>
                        <div className='font-medium'>{env.name}</div>
                      </TableCell>
                      <TableCell>
                        <a
                          href={env.base_url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-blue-500 hover:underline'
                        >
                          {env.base_url}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(status)}>
                          <StatusIcon className='w-3 h-3 mr-1' />
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className='font-mono text-sm'>{limit}</span>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center space-x-2'>
                          <div className='flex-1 bg-gray-200 rounded-full h-2'>
                            <div
                              className='bg-blue-500 h-2 rounded-full'
                              style={{ width: `${(current / limit) * 100}%` }}
                            />
                          </div>
                          <span className='text-sm text-muted-foreground'>
                            {current}/{limit}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center space-x-2'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleEdit(env)}
                          >
                            <Edit className='w-4 h-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => setDeleteEnvironment(env)}
                          >
                            <Trash2 className='w-4 h-4' />
                          </Button>
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

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog || editingEnvironment !== null}
        onOpenChange={open => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingEnvironment(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEnvironment ? 'Edit Environment' : 'Create Environment'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className='text-sm font-medium mb-2 block'>Name</label>
              <Input
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder='Production, Staging, etc.'
                required
              />
            </div>
            <div>
              <label className='text-sm font-medium mb-2 block'>Base URL</label>
              <Input
                type='url'
                value={formData.base_url}
                onChange={e =>
                  setFormData({ ...formData, base_url: e.target.value })
                }
                placeholder='https://example.com'
                required
              />
            </div>
            <div>
              <label className='text-sm font-medium mb-2 block'>
                Concurrency Limit
              </label>
              <Input
                type='number'
                min='1'
                max='50'
                value={formData.concurrency_limit}
                onChange={e =>
                  setFormData({
                    ...formData,
                    concurrency_limit: parseInt(e.target.value),
                  })
                }
                required
              />
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingEnvironment(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingEnvironment ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteEnvironment !== null}
        onOpenChange={open => !open && setDeleteEnvironment(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Environment</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete the environment "
            {deleteEnvironment?.name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setDeleteEnvironment(null)}
            >
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() =>
                deleteEnvironment && deleteMutation.mutate(deleteEnvironment.id)
              }
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
