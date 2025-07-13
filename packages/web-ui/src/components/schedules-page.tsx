import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  Play,
  Pause,
  RefreshCw,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { api } from '../lib/api';

interface Schedule {
  id: string;
  name: string;
  cron_string: string;
  environment_id: string;
  is_enabled: boolean;
  test_command: string;
  custom_config: Record<string, any>;
  created_at: string;
  updated_at: string;
  environment: {
    id: string;
    name: string;
    base_url: string;
  };
}

interface Environment {
  id: string;
  name: string;
  base_url: string;
}

const cronPresets = [
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Daily at 9 AM', value: '0 9 * * *' },
  { label: 'Daily at 6 PM', value: '0 18 * * *' },
  { label: 'Weekly (Monday 9 AM)', value: '0 9 * * 1' },
  { label: 'Custom', value: '' },
];

export function SchedulesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteSchedule, setDeleteSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cron_string: '',
    environment_id: '',
    is_enabled: true,
    test_command: 'npx playwright test',
    custom_config: '',
  });
  const [cronPreset, setCronPreset] = useState('');
  const queryClient = useQueryClient();

  const { data: schedulesData, isLoading, refetch } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => api.get('/api/schedules'),
  });

  const { data: environmentsData } = useQuery({
    queryKey: ['environments'],
    queryFn: () => api.get('/api/environments'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/schedules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      api.patch(`/api/schedules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setEditingSchedule(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setDeleteSchedule(null);
    },
  });

  const schedules = schedulesData?.data?.schedules || [];
  const environments = environmentsData?.data?.environments || [];

  const resetForm = () => {
    setFormData({
      name: '',
      cron_string: '',
      environment_id: '',
      is_enabled: true,
      test_command: 'npx playwright test',
      custom_config: '',
    });
    setCronPreset('');
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      cron_string: schedule.cron_string,
      environment_id: schedule.environment_id,
      is_enabled: schedule.is_enabled,
      test_command: schedule.test_command,
      custom_config: JSON.stringify(schedule.custom_config, null, 2),
    });
    
    const preset = cronPresets.find(p => p.value === schedule.cron_string);
    setCronPreset(preset ? preset.value : '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let customConfig = {};
    if (formData.custom_config.trim()) {
      try {
        customConfig = JSON.parse(formData.custom_config);
      } catch (error) {
        alert('Invalid JSON in custom config');
        return;
      }
    }

    const submitData = {
      name: formData.name,
      cron_string: formData.cron_string,
      environment_id: formData.environment_id,
      is_enabled: formData.is_enabled,
      test_command: formData.test_command,
      custom_config: customConfig,
    };

    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handlePresetChange = (value: string) => {
    setCronPreset(value);
    if (value && value !== '') {
      setFormData({...formData, cron_string: value});
    }
  };

  const parseCronExpression = (cron: string) => {
    // Simple cron parser for display purposes
    const parts = cron.split(' ');
    if (parts.length !== 5) return 'Invalid cron expression';
    
    const [minute, hour, day, month, dayOfWeek] = parts;
    
    if (cron === '*/5 * * * *') return 'Every 5 minutes';
    if (cron === '*/15 * * * *') return 'Every 15 minutes';
    if (cron === '*/30 * * * *') return 'Every 30 minutes';
    if (cron === '0 * * * *') return 'Every hour';
    if (cron === '0 */6 * * *') return 'Every 6 hours';
    if (cron === '0 */12 * * *') return 'Every 12 hours';
    if (cron === '0 9 * * *') return 'Daily at 9:00 AM';
    if (cron === '0 18 * * *') return 'Daily at 6:00 PM';
    if (cron === '0 9 * * 1') return 'Weekly on Monday at 9:00 AM';
    
    return `${minute} ${hour} ${day} ${month} ${dayOfWeek}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedules</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Manage automated test schedules and their configurations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Schedule
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schedules</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedules.length}</div>
            <p className="text-xs text-muted-foreground">
              Configured schedules
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Schedules</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedules.filter((s: Schedule) => s.is_enabled).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently enabled
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disabled Schedules</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedules.filter((s: Schedule) => !s.is_enabled).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently disabled
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Environments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(schedules.map((s: Schedule) => s.environment_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              With schedules
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Schedules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Schedules ({schedules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading schedules...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Command</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule: Schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <div className="font-medium">{schedule.name}</div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{schedule.environment.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {schedule.environment.base_url}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-mono text-sm">{schedule.cron_string}</div>
                        <div className="text-xs text-muted-foreground">
                          {parseCronExpression(schedule.cron_string)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={schedule.is_enabled ? 
                        'bg-green-500/10 text-green-500' : 
                        'bg-gray-500/10 text-gray-500'
                      }>
                        {schedule.is_enabled ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {schedule.is_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {schedule.test_command}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(schedule)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteSchedule(schedule)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={showCreateDialog || editingSchedule !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingSchedule(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Daily smoke tests"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Environment</label>
                <Select
                  value={formData.environment_id}
                  onChange={(e) => setFormData({...formData, environment_id: e.target.value})}
                  required
                >
                  <option value="">Select environment</option>
                  {environments.map((env: Environment) => (
                    <option key={env.id} value={env.id}>{env.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Schedule Preset</label>
              <Select
                value={cronPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
              >
                <option value="">Select a preset</option>
                {cronPresets.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Cron Expression
                <span className="text-xs text-muted-foreground ml-2">
                  (minute hour day month day-of-week)
                </span>
              </label>
              <Input
                value={formData.cron_string}
                onChange={(e) => setFormData({...formData, cron_string: e.target.value})}
                placeholder="0 9 * * *"
                className="font-mono"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Test Command</label>
              <Input
                value={formData.test_command}
                onChange={(e) => setFormData({...formData, test_command: e.target.value})}
                placeholder="npx playwright test"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Custom Config (JSON)
                <span className="text-xs text-muted-foreground ml-2">
                  Optional environment variables and settings
                </span>
              </label>
              <Textarea
                value={formData.custom_config}
                onChange={(e) => setFormData({...formData, custom_config: e.target.value})}
                placeholder='{"BASE_URL": "https://example.com", "TIMEOUT": 30000}'
                className="font-mono text-sm"
                rows={4}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_enabled"
                checked={formData.is_enabled}
                onChange={(e) => setFormData({...formData, is_enabled: e.target.checked})}
              />
              <label htmlFor="is_enabled" className="text-sm font-medium">
                Enable schedule
              </label>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingSchedule(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingSchedule ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog 
        open={deleteSchedule !== null} 
        onOpenChange={(open) => !open && setDeleteSchedule(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete the schedule "{deleteSchedule?.name}"?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteSchedule(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteSchedule && deleteMutation.mutate(deleteSchedule.id)}
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