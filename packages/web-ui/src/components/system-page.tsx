import { useState } from 'react';
import {
  Activity,
  Database,
  Server,
  Cpu,
  HardDrive,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Monitor,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

interface SystemMetric {
  name: string;
  value: string;
  status: 'healthy' | 'warning' | 'error';
  description: string;
}

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  port?: number;
  description: string;
  uptime?: string;
}

export function SystemPage() {
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const systemMetrics: SystemMetric[] = [
    {
      name: 'CPU Usage',
      value: '23%',
      status: 'healthy',
      description: 'System CPU utilization',
    },
    {
      name: 'Memory Usage',
      value: '45%',
      status: 'healthy',
      description: 'System memory utilization',
    },
    {
      name: 'Disk Usage',
      value: '67%',
      status: 'warning',
      description: 'Primary disk utilization',
    },
    {
      name: 'Network',
      value: '12 Mbps',
      status: 'healthy',
      description: 'Network throughput',
    },
  ];

  const serviceStatus: ServiceStatus[] = [
    {
      name: 'Orchestrator API',
      status: 'running',
      port: 3001,
      description: 'Main API service',
      uptime: '5d 12h 30m',
    },
    {
      name: 'Web UI',
      status: 'running',
      port: 3000,
      description: 'Frontend application',
      uptime: '5d 12h 30m',
    },
    {
      name: 'Job Runner',
      status: 'running',
      description: 'Test execution service',
      uptime: '5d 12h 29m',
    },
    {
      name: 'Database',
      status: 'running',
      port: 5432,
      description: 'PostgreSQL database',
      uptime: '5d 12h 30m',
    },
    {
      name: 'Redis Cache',
      status: 'running',
      port: 6379,
      description: 'Redis cache service',
      uptime: '5d 12h 30m',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
        return CheckCircle;
      case 'warning':
        return AlertTriangle;
      case 'error':
      case 'stopped':
        return XCircle;
      default:
        return Activity;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
        return 'bg-green-500/10 text-green-500';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'error':
      case 'stopped':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const handleRefresh = () => {
    setLastRefresh(new Date());
    // In a real app, this would trigger a refresh of system metrics
  };

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>System</h1>
          <p className='text-[hsl(var(--muted-foreground))]'>
            Monitor system health and configuration
          </p>
        </div>
        <div className='flex items-center space-x-2'>
          <Button variant='outline' onClick={handleRefresh}>
            <RefreshCw className='w-4 h-4 mr-2' />
            Refresh
          </Button>
          <span className='text-sm text-muted-foreground'>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* System Overview */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>System Status</CardTitle>
            <Activity className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='flex items-center space-x-2'>
              <div className='w-3 h-3 bg-green-500 rounded-full'></div>
              <div className='text-2xl font-bold'>Healthy</div>
            </div>
            <p className='text-xs text-muted-foreground'>
              All services running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Active Services
            </CardTitle>
            <Server className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {serviceStatus.filter(s => s.status === 'running').length}
            </div>
            <p className='text-xs text-muted-foreground'>
              Out of {serviceStatus.length} services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Uptime</CardTitle>
            <Monitor className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>5d 12h</div>
            <p className='text-xs text-muted-foreground'>System uptime</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Load Average</CardTitle>
            <Cpu className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>0.65</div>
            <p className='text-xs text-muted-foreground'>1 minute average</p>
          </CardContent>
        </Card>
      </div>

      {/* System Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>System Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 md:grid-cols-2'>
            {systemMetrics.map(metric => {
              const StatusIcon = getStatusIcon(metric.status);
              return (
                <div
                  key={metric.name}
                  className='flex items-center justify-between p-4 border rounded-lg'
                >
                  <div className='flex items-center space-x-3'>
                    <StatusIcon className='w-5 h-5' />
                    <div>
                      <div className='font-medium'>{metric.name}</div>
                      <div className='text-sm text-muted-foreground'>
                        {metric.description}
                      </div>
                    </div>
                  </div>
                  <div className='text-right'>
                    <div className='text-lg font-bold'>{metric.value}</div>
                    <Badge className={getStatusColor(metric.status)}>
                      {metric.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceStatus.map(service => {
                const StatusIcon = getStatusIcon(service.status);
                return (
                  <TableRow key={service.name}>
                    <TableCell>
                      <div className='font-medium'>{service.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(service.status)}>
                        <StatusIcon className='w-3 h-3 mr-1' />
                        {service.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {service.port ? (
                        <code className='text-sm bg-muted px-2 py-1 rounded'>
                          :{service.port}
                        </code>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <span className='text-sm text-muted-foreground'>
                        {service.uptime || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className='text-sm text-muted-foreground'>
                        {service.description}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <h3 className='font-semibold mb-2'>Environment</h3>
                <div className='space-y-1 text-sm'>
                  <div className='flex justify-between'>
                    <span>Node.js Version:</span>
                    <span className='font-mono'>v18.18.0</span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Platform:</span>
                    <span className='font-mono'>linux-x64</span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Environment:</span>
                    <span className='font-mono'>production</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className='font-semibold mb-2'>Database</h3>
                <div className='space-y-1 text-sm'>
                  <div className='flex justify-between'>
                    <span>Type:</span>
                    <span className='font-mono'>PostgreSQL</span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Version:</span>
                    <span className='font-mono'>15.3</span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Connections:</span>
                    <span className='font-mono'>5/100</span>
                  </div>
                </div>
              </div>
            </div>

            <div className='pt-4 border-t'>
              <h3 className='font-semibold mb-2'>System Paths</h3>
              <div className='space-y-1 text-sm'>
                <div className='flex justify-between'>
                  <span>Config Path:</span>
                  <span className='font-mono text-xs'>/app/config</span>
                </div>
                <div className='flex justify-between'>
                  <span>Logs Path:</span>
                  <span className='font-mono text-xs'>/app/logs</span>
                </div>
                <div className='flex justify-between'>
                  <span>Data Path:</span>
                  <span className='font-mono text-xs'>/app/data</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
