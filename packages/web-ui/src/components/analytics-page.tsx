import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Activity, Clock, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TestStatsChart } from './test-stats-chart';
import { api } from '../lib/api';

export function AnalyticsPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/api/runs/stats'),
  });

  const { data: recentRuns } = useQuery({
    queryKey: ['recent-runs'],
    queryFn: () => api.get('/api/runs?limit=100'),
  });

  const { data: environments } = useQuery({
    queryKey: ['environments'],
    queryFn: () => api.get('/api/environments'),
  });

  const runs = recentRuns?.data?.runs || [];
  const environmentsList = environments?.data?.environments || [];

  const getEnvironmentStats = () => {
    const envStats = environmentsList.map((env: any) => {
      const envRuns = runs.filter((run: any) => run.environment_id === env.id);
      const successRate =
        envRuns.length > 0
          ? (envRuns.filter((run: any) => run.status === 'success').length /
              envRuns.length) *
            100
          : 0;

      return {
        name: env.name,
        totalRuns: envRuns.length,
        successRate: Math.round(successRate),
        avgDuration:
          envRuns.reduce(
            (sum: number, run: any) => sum + (run.duration_ms || 0),
            0
          ) / envRuns.length,
      };
    });

    return envStats;
  };

  const getTimeSeriesData = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last30Days.map(date => {
      const dayRuns = runs.filter((run: any) =>
        run.created_at?.startsWith(date)
      );

      return {
        date,
        total: dayRuns.length,
        success: dayRuns.filter((run: any) => run.status === 'success').length,
        failed: dayRuns.filter((run: any) => run.status === 'failed').length,
      };
    });
  };

  const environmentStats = getEnvironmentStats();
  const timeSeriesData = getTimeSeriesData();

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Analytics</h1>
          <p className='text-[hsl(var(--muted-foreground))]'>
            Test execution insights and performance metrics
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Runs</CardTitle>
            <Activity className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats?.data?.total || 0}</div>
            <p className='text-xs text-muted-foreground'>Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Success Rate</CardTitle>
            <TrendingUp className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {stats?.data?.success_rate || 0}%
            </div>
            <p className='text-xs text-muted-foreground'>
              Overall success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Avg Duration</CardTitle>
            <Clock className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {Math.round((stats?.data?.avg_duration || 0) / 1000 / 60)}m
            </div>
            <p className='text-xs text-muted-foreground'>
              Average test duration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Environments</CardTitle>
            <Calendar className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{environmentsList.length}</div>
            <p className='text-xs text-muted-foreground'>Active environments</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className='grid gap-6 md:grid-cols-1 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Test Execution Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <TestStatsChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {environmentStats.map((env: any) => (
                <div
                  key={env.name}
                  className='flex items-center justify-between p-3 border rounded-lg'
                >
                  <div>
                    <div className='font-medium'>{env.name}</div>
                    <div className='text-sm text-muted-foreground'>
                      {env.totalRuns} runs
                    </div>
                  </div>
                  <div className='text-right'>
                    <div className='text-sm font-medium'>
                      {env.successRate}%
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      {Math.round(env.avgDuration / 1000 / 60)}m avg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Test Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            {timeSeriesData.slice(-7).map((day: any) => (
              <div
                key={day.date}
                className='flex items-center justify-between p-2 hover:bg-muted/50 rounded'
              >
                <div className='font-medium'>{day.date}</div>
                <div className='flex items-center space-x-4'>
                  <div className='text-sm'>
                    <span className='text-green-600'>{day.success}</span>
                    <span className='text-muted-foreground mx-1'>/</span>
                    <span className='text-red-600'>{day.failed}</span>
                    <span className='text-muted-foreground mx-1'>/</span>
                    <span>{day.total}</span>
                  </div>
                  <div className='w-16 bg-gray-200 rounded-full h-2'>
                    <div
                      className='bg-green-500 h-2 rounded-full'
                      style={{
                        width: `${day.total > 0 ? (day.success / day.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
