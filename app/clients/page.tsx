'use client'

import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getClients } from '@/lib/actions/clients'
import { ClientForm } from '@/components/clients/client-form'
import { formatDistance } from 'date-fns'
import { Plus, Eye, Mail, Phone } from 'lucide-react'
import Link from 'next/link'

export default function ClientsPage() {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
  })

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
                <p className="text-muted-foreground">
                  Manage client profiles and relationships
                </p>
              </div>
              <ClientForm>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Client
                </Button>
              </ClientForm>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {clients.map((client) => {
                  const totalOrders = client.orders.length
                  const totalValue = client.orders.reduce((sum, order) => sum + order.totalAmount, 0)
                  
                  return (
                    <Card key={client.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{client.name}</CardTitle>
                            <CardDescription>{client.company || 'Individual'}</CardDescription>
                          </div>
                          <Link href={`/clients/${client.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="h-4 w-4 mr-2" />
                            {client.email}
                          </div>
                          {client.phone && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Phone className="h-4 w-4 mr-2" />
                              {client.phone}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="text-sm">
                            <div className="font-medium">{totalOrders} orders</div>
                            <div className="text-muted-foreground">
                              ${totalValue.toLocaleString()} total
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Joined {formatDistance(new Date(client.createdAt), new Date(), { addSuffix: true })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}