'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowLeft, Edit, ToggleLeft, ToggleRight } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  display_name: string;
  base_price: number;
  price_per_item?: number;
  price_per_kg?: number;
  requires_weight: boolean;
  requires_items: boolean;
  is_active: boolean;
  created_at: string;
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newService, setNewService] = useState({
    display_name: '',
    base_price: '',
    price_per_item: '',
    price_per_kg: '',
    requires_weight: false,
    requires_items: true,
    name: '',
  });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) {
      router.push('/auth/login');
      return;
    }

    if (user.role !== 'owner') {
      router.push('/');
      return;
    }

    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/services/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newService),
      });

      if (response.ok) {
        fetchServices();
        setIsCreateDialogOpen(false);
        setNewService({
          display_name: '',
          base_price: '',
          price_per_item: '',
          price_per_kg: '',
          requires_weight: false,
          requires_items: true,
          name: ''
        });
      }
    } catch (error) {
      console.error('Error creating service:', error);
    }
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/services/${editingService.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newService),
      });

      if (response.ok) {
        fetchServices();
        setEditingService(null);
        setNewService({
          display_name: '',
          base_price: '',
          price_per_item: '',
          price_per_kg: '',
          requires_weight: false,
          requires_items: true,
          name: ''
        });
      }
    } catch (error) {
      console.error('Error updating service:', error);
    }
  };

  const toggleServiceStatus = async (serviceId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/services/${serviceId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchServices();
      }
    } catch (error) {
      console.error('Error toggling service status:', error);
    }
  };

  const startEdit = (service: Service) => {
    setEditingService(service);
    setNewService({
      display_name: service.display_name,
      base_price: service.base_price.toString(),
      price_per_item: service.price_per_item?.toString() || '',
      price_per_kg: service.price_per_kg?.toString() || '',
      requires_weight: service.requires_weight,
      requires_items: service.requires_items,
      name: service.display_name.replace(/[()]/g, '').replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-')
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-4">
            <div className="flex items-center min-w-0">
              <Button 
                variant="ghost" 
                onClick={() => router.push('/')}
                className="mr-2 sm:mr-4 flex-shrink-0"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Services & Pricing</h1>
                <p className="text-sm sm:text-base text-gray-600 hidden sm:block">Manage your laundromat services and pricing</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  New Service
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Service</DialogTitle>
                </DialogHeader>
                <div className="max-h-[80vh] overflow-y-auto">
                  <form onSubmit={handleCreateService} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="display_name">Service Name</Label>
                    <Input
                      id="display_name"
                      value={newService.display_name}
                      onChange={(e) => setNewService({...newService, display_name: e.target.value, name: e.target.value.replace(/[()]/g, '').replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase()})}
                      placeholder="e.g., Single Shirt Ironing"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="base_price">Base Price (KSH)</Label>
                    <Input
                      id="base_price"
                      type="number"
                      step="0.01"
                      value={newService.base_price}
                      onChange={(e) => setNewService({...newService, base_price: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price_per_item">Price Per Item (KSH)</Label>
                    <Input
                      id="price_per_item"
                      type="number"
                      step="0.01"
                      value={newService.price_per_item}
                      onChange={(e) => setNewService({...newService, price_per_item: e.target.value})}
                      placeholder="Optional - for per-item pricing"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price_per_kg">Price Per KG (KSH)</Label>
                    <Input
                      id="price_per_kg"
                      type="number"
                      step="0.01"
                      value={newService.price_per_kg}
                      onChange={(e) => setNewService({...newService, price_per_kg: e.target.value})}
                      placeholder="Optional - for weight-based pricing"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires_weight"
                      checked={newService.requires_weight}
                      onCheckedChange={(checked) => setNewService({...newService, requires_weight: checked})}
                    />
                    <Label htmlFor="requires_weight">Requires Weight Input</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires_items"
                      checked={newService.requires_items}
                      onCheckedChange={(checked) => setNewService({...newService, requires_items: checked})}
                    />
                    <Label htmlFor="requires_items">Requires Item Count</Label>
                  </div>

                  <Button type="submit" className="w-full">Add Service</Button>
                </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Services Table */}
        <Card>
          <CardHeader>
            <CardTitle>Services ({services.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Name</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Requirements</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div className="font-medium">{service.display_name}</div>
                        <div className="text-xs text-gray-500">{service.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {service.base_price > 0 && (
                            <div className="text-sm">Base: {formatCurrency(service.base_price)}</div>
                          )}
                          {service.price_per_item && (
                            <div className="text-sm">Per Item: {formatCurrency(service.price_per_item)}</div>
                          )}
                          {service.price_per_kg && (
                            <div className="text-sm">Per KG: {formatCurrency(service.price_per_kg)}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {service.requires_weight && (
                            <Badge variant="outline" className="text-xs">Weight Required</Badge>
                          )}
                          {service.requires_items && (
                            <Badge variant="outline" className="text-xs">Items Required</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={service.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {service.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => startEdit(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toggleServiceStatus(service.id)}
                          >
                            {service.is_active ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingService} onOpenChange={() => setEditingService(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto">
            <form onSubmit={handleUpdateService} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_display_name">Service Name</Label>
              <Input
                id="edit_display_name"
                value={newService.display_name}
                onChange={(e) => setNewService({...newService, display_name: e.target.value, name: e.target.value.replace(/[()]/g, '').replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase()})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_base_price">Base Price (KSH)</Label>
              <Input
                id="edit_base_price"
                type="number"
                step="0.01"
                value={newService.base_price}
                onChange={(e) => setNewService({...newService, base_price: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_price_per_item">Price Per Item (KSH)</Label>
              <Input
                id="edit_price_per_item"
                type="number"
                step="0.01"
                value={newService.price_per_item}
                onChange={(e) => setNewService({...newService, price_per_item: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_price_per_kg">Price Per KG (KSH)</Label>
              <Input
                id="edit_price_per_kg"
                type="number"
                step="0.01"
                value={newService.price_per_kg}
                onChange={(e) => setNewService({...newService, price_per_kg: e.target.value})}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit_requires_weight"
                checked={newService.requires_weight}
                onCheckedChange={(checked) => setNewService({...newService, requires_weight: checked})}
              />
              <Label htmlFor="edit_requires_weight">Requires Weight Input</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit_requires_items"
                checked={newService.requires_items}
                onCheckedChange={(checked) => setNewService({...newService, requires_items: checked})}
              />
              <Label htmlFor="edit_requires_items">Requires Item Count</Label>
            </div>

            <div className="flex space-x-2">
              <Button type="submit" className="flex-1">Update Service</Button>
              <Button type="button" variant="outline" onClick={() => setEditingService(null)}>
                Cancel
              </Button>
            </div>
          </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}