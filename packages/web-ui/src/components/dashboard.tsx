import { useQuery } from '@tanstack/react-query'
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  Activity,
  Zap,
  GitBranch
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { RecentRuns } from './recent-runs'
import { TestStatsChart } from './test-stats-chart'
import { EnvironmentStatus } from './environment-status'
import { api } from '../lib/api'

export function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/api/runs/stats'),
  })

  const { data: recentRuns } = useQuery({
    queryKey: ['recent-runs'],
    queryFn: () => api.get('/api/runs?limit=10'),
  })

  const { data: environments } = useQuery({
    queryKey: ['environments'],
    queryFn: () => api.get('/api/environments'),
  })

  const statCards = [
    {
      title: 'Total Runs',
      value: stats?.data?.total || 0,
      icon: Play,
      description: 'All time test runs',
      trend: '+12% from last week',
      color: 'text-blue-500',
    },
    {
      title: 'Success Rate',
      value: `${stats?.data?.success_rate || 0}%`,
      icon: CheckCircle,
      description: 'Passing tests',
      trend: '+5% from last week',
      color: 'text-green-500',
    },
    {
      title: 'Failed Runs',
      value: stats?.data?.failed || 0,
      icon: XCircle,
      description: 'Failed test runs',
      trend: '-8% from last week',
      color: 'text-red-500',
    },
    {
      title: 'Avg Duration',
      value: `${Math.round((stats?.data?.avg_duration || 0) / 1000 / 60)}m`,
      icon: Clock,
      description: 'Average test duration',
      trend: '-2m from last week',
      color: 'text-purple-500',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your Playwright test orchestration
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Activity className="w-4 h-4 mr-2" />
            View All Runs
          </Button>
          <Button>
            <Play className="w-4 h-4 mr-2" />
            New Test Run
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="futuristic-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-xs text-green-500">{stat.trend}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Test Stats Chart */}
        <Card className="futuristic-card md:col-span-2">
          <CardHeader>
            <CardTitle>Test Execution Trends</CardTitle>
            <CardDescription>
              Success and failure rates over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TestStatsChart />
          </CardContent>
        </Card>

        {/* Environment Status */}
        <Card className="futuristic-card">
          <CardHeader>
            <CardTitle>Environment Status</CardTitle>
            <CardDescription>
              Current status of test environments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnvironmentStatus environments={environments?.data || []} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Test Runs */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle>Recent Test Runs</CardTitle>
          <CardDescription>
            Latest test executions and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecentRuns runs={recentRuns?.data?.runs || []} />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="futuristic-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Play className="w-4 h-4 mr-2" />
              Run Smoke Tests
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <GitBranch className="w-4 h-4 mr-2" />
              Deploy to Staging
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Activity className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </CardContent>
        </Card>

        <Card className="futuristic-card">
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">API Status</span>
                <Badge variant="default" className="bg-green-500">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <Badge variant="default" className="bg-green-500">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Job Runners</span>
                <Badge variant="default" className="bg-blue-500">3 Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Storage</span>
                <Badge variant="default" className="bg-green-500">Available</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="futuristic-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Test run completed successfully</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">New environment added</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Schedule updated</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm">Webhook received</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}