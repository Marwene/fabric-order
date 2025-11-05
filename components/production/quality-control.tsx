'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { getQualityChecks, addQualityCheck } from '@/lib/actions/quality'
import { formatDistance } from 'date-fns'
import { CircleCheck as CheckCircle, Circle as XCircle, TriangleAlert as AlertTriangle, Plus, Eye } from 'lucide-react'

interface QualityControlProps {
  orderId: string
}

export function QualityControl({ orderId }: QualityControlProps) {
  const { data: qualityChecks = [], isLoading } = useQuery({
    queryKey: ['quality-checks', orderId],
    queryFn: () => getQualityChecks(orderId),
  })

  if (isLoading) {
    return <div>Loading quality control data...</div>
  }

  const passedChecks = qualityChecks.filter((check: any) => check.status === 'PASSED').length
  const failedChecks = qualityChecks.filter((check: any) => check.status === 'FAILED').length
  const pendingChecks = qualityChecks.filter((check: any) => check.status === 'PENDING').length

  return (
    <div className="space-y-6">
      {/* Quality Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{passedChecks}</div>
                <div className="text-xs text-muted-foreground">Passed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{failedChecks}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">{pendingChecks}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{qualityChecks.length}</div>
                <div className="text-xs text-muted-foreground">Total Checks</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Checks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quality Checks</CardTitle>
              <CardDescription>
                Quality control inspections and results
              </CardDescription>
            </div>
            <QualityCheckForm orderId={orderId}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Quality Check
              </Button>
            </QualityCheckForm>
          </div>
        </CardHeader>
        <CardContent>
          {qualityChecks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No quality checks yet</h3>
              <p className="text-muted-foreground">
                Add quality control checks to track production quality.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {qualityChecks.map((check: any) => (
                <QualityCheckCard key={check.id} check={check} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function QualityCheckCard({ check }: { check: any }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'PENDING':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <Eye className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASSED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'FAILED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  return (
    <div className="flex items-start justify-between p-4 border rounded-lg">
      <div className="flex items-start gap-3">
        {getStatusIcon(check.status)}
        <div>
          <div className="font-medium">{check.checkType.replace('_', ' ')}</div>
          <div className="text-sm text-muted-foreground">
            {check.inspector} • {formatDistance(new Date(check.createdAt), new Date(), { addSuffix: true })}
          </div>
          {check.notes && (
            <div className="text-sm mt-2 p-2 bg-muted rounded">
              {check.notes}
            </div>
          )}
        </div>
      </div>
      <Badge className={getStatusColor(check.status)}>
        {check.status}
      </Badge>
    </div>
  )
}

function QualityCheckForm({ orderId, children }: { orderId: string, children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    checkType: '',
    status: '',
    inspector: '',
    notes: '',
  })
  const queryClient = useQueryClient()

  const addCheckMutation = useMutation({
    mutationFn: addQualityCheck,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Quality check added successfully')
        queryClient.invalidateQueries({ queryKey: ['quality-checks', orderId] })
        setOpen(false)
        setFormData({ checkType: '', status: '', inspector: '', notes: '' })
      } else {
        toast.error(result.error || 'Failed to add quality check')
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addCheckMutation.mutate({
      orderId,
      ...formData,
    })
  }

  const checkTypes = [
    'FABRIC_INSPECTION',
    'CUTTING_QUALITY',
    'STITCHING_QUALITY',
    'FINISHING_QUALITY',
    'FINAL_INSPECTION',
    'PACKAGING_CHECK'
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Quality Check</DialogTitle>
          <DialogDescription>
            Record a quality control inspection for this order.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="checkType">Check Type</Label>
            <Select value={formData.checkType} onValueChange={(value) => setFormData({ ...formData, checkType: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select check type" />
              </SelectTrigger>
              <SelectContent>
                {checkTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PASSED">Passed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="inspector">Inspector</Label>
            <input
              id="inspector"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.inspector}
              onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
              placeholder="Inspector name"
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Quality check notes..."
              className="min-h-20"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addCheckMutation.isPending}>
              {addCheckMutation.isPending ? 'Adding...' : 'Add Check'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}