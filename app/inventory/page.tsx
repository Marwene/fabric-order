'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { InventoryTracker } from '@/components/inventory/inventory-tracker'

export default function InventoryPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
              <p className="text-muted-foreground">
                Monitor stock levels, track inventory movements, and manage reorder points
              </p>
            </div>
            
            <InventoryTracker />
          </div>
        </main>
      </div>
    </div>
  )
}