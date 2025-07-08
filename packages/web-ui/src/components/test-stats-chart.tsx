import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

// Mock data - replace with real data from API
const data = [
  { date: '2024-01-01', success: 85, failed: 15, total: 100 },
  { date: '2024-01-02', success: 92, failed: 8, total: 100 },
  { date: '2024-01-03', success: 78, failed: 22, total: 100 },
  { date: '2024-01-04', success: 95, failed: 5, total: 100 },
  { date: '2024-01-05', success: 88, failed: 12, total: 100 },
  { date: '2024-01-06', success: 91, failed: 9, total: 100 },
  { date: '2024-01-07', success: 87, failed: 13, total: 100 },
  { date: '2024-01-08', success: 94, failed: 6, total: 100 },
  { date: '2024-01-09', success: 89, failed: 11, total: 100 },
  { date: '2024-01-10', success: 93, failed: 7, total: 100 },
  { date: '2024-01-11', success: 86, failed: 14, total: 100 },
  { date: '2024-01-12', success: 90, failed: 10, total: 100 },
  { date: '2024-01-13', success: 96, failed: 4, total: 100 },
  { date: '2024-01-14', success: 82, failed: 18, total: 100 },
  { date: '2024-01-15', success: 88, failed: 12, total: 100 },
  { date: '2024-01-16', success: 91, failed: 9, total: 100 },
  { date: '2024-01-17', success: 85, failed: 15, total: 100 },
  { date: '2024-01-18', success: 93, failed: 7, total: 100 },
  { date: '2024-01-19', success: 89, failed: 11, total: 100 },
  { date: '2024-01-20', success: 87, failed: 13, total: 100 },
  { date: '2024-01-21', success: 92, failed: 8, total: 100 },
  { date: '2024-01-22', success: 90, failed: 10, total: 100 },
  { date: '2024-01-23', success: 94, failed: 6, total: 100 },
  { date: '2024-01-24', success: 88, failed: 12, total: 100 },
  { date: '2024-01-25', success: 91, failed: 9, total: 100 },
  { date: '2024-01-26', success: 86, failed: 14, total: 100 },
  { date: '2024-01-27', success: 93, failed: 7, total: 100 },
  { date: '2024-01-28', success: 89, failed: 11, total: 100 },
  { date: '2024-01-29', success: 95, failed: 5, total: 100 },
  { date: '2024-01-30', success: 87, failed: 13, total: 100 },
]

export function TestStatsChart() {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="failedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            stroke="#9ca3af"
            fontSize={12}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis 
            stroke="#9ca3af"
            fontSize={12}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#f9fafb'
            }}
            labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
            formatter={(value: any, name: string) => [`${value}%`, name === 'success' ? 'Success Rate' : 'Failure Rate']}
          />
          <Area 
            type="monotone" 
            dataKey="success" 
            stroke="#10b981" 
            strokeWidth={2}
            fill="url(#successGradient)"
            name="Success Rate"
          />
          <Area 
            type="monotone" 
            dataKey="failed" 
            stroke="#ef4444" 
            strokeWidth={2}
            fill="url(#failedGradient)"
            name="Failure Rate"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}