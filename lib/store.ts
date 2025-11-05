'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { PrinterConfig, DashboardStats } from './types'

interface AppState {
  // Theme
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  
  // Printer
  selectedPrinter: PrinterConfig | null
  availablePrinters: PrinterConfig[]
  setSelectedPrinter: (printer: PrinterConfig | null) => void
  setAvailablePrinters: (printers: PrinterConfig[]) => void
  
  // Dashboard
  dashboardStats: DashboardStats | null
  setDashboardStats: (stats: DashboardStats) => void
  
  // UI State
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // Current selections
  selectedOrderId: string | null
  setSelectedOrderId: (id: string | null) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      // Theme
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      
      // Printer
      selectedPrinter: null,
      availablePrinters: [],
      setSelectedPrinter: (printer) => set({ selectedPrinter: printer }),
      setAvailablePrinters: (printers) => set({ availablePrinters: printers }),
      
      // Dashboard
      dashboardStats: null,
      setDashboardStats: (stats) => set({ dashboardStats: stats }),
      
      // UI State
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      // Current selections
      selectedOrderId: null,
      setSelectedOrderId: (id) => set({ selectedOrderId: id }),
    }),
    { name: 'app-store' }
  )
)