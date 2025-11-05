import { StatsCards } from '@/components/dashboard/stats-cards'
import { DashboardCharts } from '@/components/analytics/dashboard-charts'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome to your fabric order management system
              </p>
            </div>
            
            <StatsCards />
            
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Analytics Overview</h2>
              <DashboardCharts />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}