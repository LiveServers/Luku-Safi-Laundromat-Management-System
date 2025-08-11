'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Order {
  id: string;
  customer_id: string;
  service_type: string;
  weight: number;
  items: number;
  total_amount: number;
  payment_status: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  updated_by_user?: {
    id: string;
    name: string;
  };
  customers: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface ServiceType {
  id: string;
  name: string;
  display_name: string;
  base_price: number;
  price_per_item?: number;
  price_per_kg?: number;
  requires_weight: boolean;
  requires_items: boolean;
  is_active: boolean;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [newOrder, setNewOrder] = useState({
    customer_id: '',
    service_type: '',
    weight: '',
    items: '',
    total_amount: '',
    payment_status: 'pending',
    notes: ''
  });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    fetchOrders();
    fetchCustomers();
    fetchServices();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/customers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/services', {
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
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newOrder.customer_id || !newOrder.service_type) {
      alert('Please select a customer and service type');
      return;
    }

    const selectedService = services.find(s => s.name === newOrder.service_type);
    if (!selectedService) {
      alert('Invalid service type selected');
      return;
    }

    // Validate service-specific requirements
    if (selectedService.requires_items && (!newOrder.items || parseInt(newOrder.items) <= 0)) {
      alert('Please enter the number of items');
      return;
    }

    if (selectedService.requires_weight && (!newOrder.weight || parseFloat(newOrder.weight) <= 0)) {
      alert('Please enter the weight');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newOrder),
      });

      if (response.ok) {
        fetchOrders();
        setIsCreateDialogOpen(false);
        setNewOrder({
          customer_id: '',
          service_type: '',
          weight: '',
          items: '',
          total_amount: '',
          payment_status: 'pending',
          notes: ''
        });
      } else {
        const errorData = await response.json();
        alert(`Error creating order: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${editingOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newOrder),
      });

      if (response.ok) {
        fetchOrders();
        setEditingOrder(null);
        setNewOrder({
          customer_id: '',
          service_type: '',
          weight: '',
          items: '',
          total_amount: '',
          payment_status: 'pending',
          notes: ''
        });
      } else {
        const errorData = await response.json();
        alert(`Error updating order: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Network error. Please try again.');
    }
  };

  const startEdit = (order: Order) => {
    setEditingOrder(order);
    setNewOrder({
      customer_id: order.customer_id,
      service_type: order.service_type,
      weight: order?.weight?.toString(),
      items: order.items.toString(),
      total_amount: order.total_amount.toString(),
      payment_status: order.payment_status,
      notes: order.notes || ''
    });
  };

  const calculateOrderTotal = () => {
    const selectedService = services.find(s => s.name === newOrder.service_type);
    if (!selectedService) return 0;

    let total = selectedService.base_price;

    if (selectedService.price_per_item && newOrder.items) {
      const items = parseInt(newOrder.items);
      total = selectedService.price_per_item * items;
    }

    if (selectedService.price_per_kg && newOrder.weight) {
      const weight = parseFloat(newOrder.weight);
      total = selectedService.base_price + (selectedService.price_per_kg * weight);
    }

    return total;
  };

  const handleServiceTypeChange = (serviceType: string) => {
    const calculatedTotal = calculateOrderTotal();
    setNewOrder({
      ...newOrder,
      service_type: serviceType,
      total_amount: calculatedTotal.toFixed(2)
    });
  };

  const handleQuantityChange = (field: 'weight' | 'items', value: string) => {
    const updatedOrder = { ...newOrder, [field]: value };
    setNewOrder(updatedOrder);
    
    // Recalculate total
    const selectedService = services.find(s => s.name === updatedOrder.service_type);
    if (selectedService) {
      let total = selectedService.base_price;

      if (selectedService.price_per_item && updatedOrder.items) {
        const items = parseInt(updatedOrder.items);
        total = selectedService.price_per_item * items;
      }

      if (selectedService.price_per_kg && updatedOrder.weight) {
        const weight = parseFloat(updatedOrder.weight);
        total = selectedService.base_price + (selectedService.price_per_kg * weight);
      }

      setNewOrder(prev => ({ ...prev, total_amount: total.toFixed(2) }));
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      received: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      washing: 'bg-purple-100 text-purple-800',
      drying: 'bg-orange-100 text-orange-800',
      folding: 'bg-pink-100 text-pink-800',
      ready: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-orange-100 text-orange-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.service_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
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
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Orders Management</h1>
                <p className="text-sm sm:text-base text-gray-600 hidden sm:block">Manage your laundry orders</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Order</DialogTitle>
                </DialogHeader>
                <div className="max-h-[80vh] overflow-y-auto">
                  <form onSubmit={handleCreateOrder} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Search customers..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="mb-2"
                      />
                      <Select value={newOrder.customer_id} onValueChange={(value) => setNewOrder({...newOrder, customer_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        {customers
                          .filter(customer => 
                            customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                            customer.phone?.includes(customerSearch) ||
                            customer.email?.toLowerCase().includes(customerSearch.toLowerCase())
                          )
                          .map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              {customer.phone && (
                                <div className="text-xs text-gray-500">{customer.phone}</div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                      </Select>
                    </div>
                    {customers.length === 0 && (
                      <p className="text-xs text-gray-500">
                        No customers found. <Button variant="link" className="p-0 h-auto text-xs" onClick={() => router.push('/customers')}>Add a customer first</Button>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service_type">Service Type *</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Search services..."
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        className="mb-2"
                      />
                      <Select value={newOrder.service_type} onValueChange={handleServiceTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        {services
                          .filter(service => 
                            service.display_name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                            service.name.toLowerCase().includes(serviceSearch.toLowerCase())
                          )
                          .map((service) => (
                          <SelectItem key={service.id} value={service.name}>
                            <div>
                              <div className="font-medium">{service.display_name}</div>
                              <div className="text-xs text-gray-500">
                                {service.base_price > 0 && `Base: KSH ${service.base_price.toFixed(2)}`}
                                {service.price_per_item && ` • KSH ${service.price_per_item.toFixed(2)}/item`}
                                {service.price_per_kg && ` • KSH ${service.price_per_kg.toFixed(2)}/kg`}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {newOrder.service_type && (
                    <>
                      {services.find(s => s.name === newOrder.service_type)?.requires_weight && (
                        <div className="space-y-2">
                          <Label htmlFor="weight">Weight (kg) *</Label>
                          <Input
                            id="weight"
                            type="number"
                            step="0.1"
                            min="0"
                            value={newOrder.weight}
                            onChange={(e) => handleQuantityChange('weight', e.target.value)}
                            placeholder="Enter weight in kg"
                            required
                          />
                        </div>
                      )}

                      {services.find(s => s.name === newOrder.service_type)?.requires_items && (
                        <div className="space-y-2">
                          <Label htmlFor="items">Number of Items *</Label>
                          <Input
                            id="items"
                            type="number"
                            min="1"
                            value={newOrder.items}
                            onChange={(e) => handleQuantityChange('items', e.target.value)}
                            placeholder="Enter number of items"
                            required
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="total_amount">Total Amount (KSH)</Label>
                    <div className="relative">
                      <Input
                        id="total_amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newOrder.total_amount}
                        onChange={(e) => setNewOrder({...newOrder, total_amount: e.target.value})}
                        placeholder="0.00"
                        required
                      />
                      {newOrder.service_type && (
                        <div className="text-xs text-gray-500 mt-1">
                          Auto-calculated based on service and quantity
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment_status">Payment Status</Label>
                    <Select value={newOrder.payment_status} onValueChange={(value) => setNewOrder({...newOrder, payment_status: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="partial">Partial Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Special Instructions</Label>
                    <Textarea
                      id="notes"
                      value={newOrder.notes}
                      onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                      placeholder="Any special instructions or notes..."
                      rows={3}
                    />
                  </div>

                  {newOrder.service_type && newOrder.total_amount && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-blue-900">Order Summary</div>
                      <div className="text-xs text-blue-700 mt-1">
                        Service: {services.find(s => s.name === newOrder.service_type)?.display_name}
                        {newOrder.items && <span> • {newOrder.items} items</span>}
                        {newOrder.weight && <span> • {newOrder.weight} kg</span>}
                      </div>
                      <div className="text-lg font-bold text-blue-900 mt-2">
                        Total: KSH {parseFloat(newOrder.total_amount || '0').toFixed(2)}
                      </div>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={!newOrder.customer_id || !newOrder.service_type || !newOrder.total_amount}
                  >
                    Create Order
                  </Button>
                </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{orders.length}</div>
              <p className="text-xs text-gray-600">Total Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">
                {orders.filter(o => ['received', 'processing', 'washing', 'drying', 'folding'].includes(o.status)).length}
              </div>
              <p className="text-xs text-gray-600">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {orders.filter(o => o.status === 'ready').length}
              </div>
              <p className="text-xs text-gray-600">Ready for Pickup</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + o.total_amount, 0))}
              </div>
              <p className="text-xs text-gray-600">Revenue (Paid)</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search orders by customer or service..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="washing">Washing</SelectItem>
                  <SelectItem value="drying">Drying</SelectItem>
                  <SelectItem value="folding">Folding</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customers?.name || 'Unknown'}</p>
                          {order.customers?.phone && (
                            <p className="text-xs text-gray-600">{order.customers.phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {services.find(s => s.name === order.service_type)?.display_name || 
                             order.service_type.replace('-', ' ').toUpperCase()}
                          </p>
                          {order.notes && (
                            <p className="text-xs text-gray-600 truncate max-w-32">{order.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {order.weight > 0 && <p>{order.weight} kg</p>}
                          {order.items > 0 && <p className="text-gray-600">{order.items} items</p>}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(order.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPaymentColor(order.payment_status)}>
                          {order.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(value) => updateOrderStatus(order.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="washing">Washing</SelectItem>
                            <SelectItem value="drying">Drying</SelectItem>
                            <SelectItem value="folding">Folding</SelectItem>
                            <SelectItem value="ready">Ready</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {order.updated_at ? (
                          <div>
                            <div>{new Date(order.updated_at).toLocaleDateString()}</div>
                            {order.updated_by_user && (
                              <div className="text-xs text-gray-500">by {order.updated_by_user.name}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => startEdit(order)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredOrders.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No orders found matching your criteria.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Order Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto">
            <form onSubmit={handleEditOrder} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_customer">Customer</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="mb-2"
                />
                <Select value={newOrder.customer_id} onValueChange={(value) => setNewOrder({...newOrder, customer_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {customers
                    .filter(customer => 
                      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                      customer.phone?.includes(customerSearch) ||
                      customer.email?.toLowerCase().includes(customerSearch.toLowerCase())
                    )
                    .map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        {customer.phone && (
                          <div className="text-xs text-gray-500">{customer.phone}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_service_type">Service Type *</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Search services..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="mb-2"
                />
                <Select value={newOrder.service_type} onValueChange={handleServiceTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {services
                    .filter(service => 
                      service.display_name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                      service.name.toLowerCase().includes(serviceSearch.toLowerCase())
                    )
                    .map((service) => (
                    <SelectItem key={service.id} value={service.name}>
                      <div>
                        <div className="font-medium">{service.display_name}</div>
                        <div className="text-xs text-gray-500">
                          {service.base_price > 0 && `Base: KSH ${service.base_price.toFixed(2)}`}
                          {service.price_per_item && ` • KSH ${service.price_per_item.toFixed(2)}/item`}
                          {service.price_per_kg && ` • KSH ${service.price_per_kg.toFixed(2)}/kg`}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
                </Select>
              </div>
            </div>

            {newOrder.service_type && (
              <>
                {services.find(s => s.name === newOrder.service_type)?.requires_weight && (
                  <div className="space-y-2">
                    <Label htmlFor="edit_weight">Weight (kg) *</Label>
                    <Input
                      id="edit_weight"
                      type="number"
                      step="0.1"
                      min="0"
                      value={newOrder.weight}
                      onChange={(e) => handleQuantityChange('weight', e.target.value)}
                      placeholder="Enter weight in kg"
                      required
                    />
                  </div>
                )}

                {services.find(s => s.name === newOrder.service_type)?.requires_items && (
                  <div className="space-y-2">
                    <Label htmlFor="edit_items">Number of Items *</Label>
                    <Input
                      id="edit_items"
                      type="number"
                      min="1"
                      value={newOrder.items}
                      onChange={(e) => handleQuantityChange('items', e.target.value)}
                      placeholder="Enter number of items"
                      required
                    />
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit_total_amount">Total Amount (KSH)</Label>
              <Input
                id="edit_total_amount"
                type="number"
                step="0.01"
                min="0"
                value={newOrder.total_amount}
                onChange={(e) => setNewOrder({...newOrder, total_amount: e.target.value})}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_payment_status">Payment Status</Label>
              <Select value={newOrder.payment_status} onValueChange={(value) => setNewOrder({...newOrder, payment_status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_notes">Special Instructions</Label>
              <Textarea
                id="edit_notes"
                value={newOrder.notes}
                onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                placeholder="Any special instructions or notes..."
                rows={3}
              />
            </div>

            <div className="flex space-x-2">
              <Button type="submit" className="flex-1">Update Order</Button>
              <Button type="button" variant="outline" onClick={() => setEditingOrder(null)}>
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