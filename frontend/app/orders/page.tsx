'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SmartPagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, ArrowLeft, CreditCard as Edit, Trash2, Check, ChevronsUpDown } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface Service {
  id: string;
  name: string;
  display_name: string;
  base_price: number;
  price_per_item?: number;
  price_per_kg?: number;
  requires_weight: boolean;
  requires_items: boolean;
}

interface Order {
  id: string;
  customer_id: string;
  service_type: string;
  weight: number;
  items: number;
  subtotal: number;
  discount_amount: number;
  discount_reason?: string;
  total_amount: number;
  payment_status: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  customers: Customer;
  updated_by_user?: {
    id: string;
    name: string;
  };
  order_date?: string;
  transaction_code?: string;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false
  });
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [serviceSearchOpen, setServiceSearchOpen] = useState(false);
  const [customerSearchValue, setCustomerSearchValue] = useState('');
  const [serviceSearchValue, setServiceSearchValue] = useState('');
  const [newOrder, setNewOrder] = useState({
    customer_id: '',
    service_type: '',
    order_date: new Date().toISOString().split('T')[0],
    weight: '',
    items: '',
    subtotal: '',
    discount_amount: '',
    discount_reason: '',
    total_amount: '',
    payment_status: 'pending',
    transaction_code: '',
    notes: '',
    status: 'received'
  });
  const router = useRouter();

  const orderStatuses = [
    'received', 'processing', 'washing', 'drying', 'folding', 'ready', 'completed', 'cancelled'
  ];

  const paymentStatuses = [
    'pending', 'paid', 'partial', 'cancelled'
  ];

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

  const fetchOrders = async (page = 1, limit = 10, search = '', status = '', paymentStatus = '') => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(status && status !== 'all' ? { status }: { status:'' }),
        ...(paymentStatus && paymentStatus !== 'all' ? { paymentStatus } : { paymentStatus: '' })
      });
      
      const response = await fetch(`/api/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // const handleSearch = () => {
  //   fetchOrders(1, pagination.limit, searchTerm, statusFilter, paymentStatusFilter);
  // };

  const handlePageChange = (page: number) => {
    fetchOrders(page, pagination.limit, searchTerm, statusFilter, paymentStatusFilter);
  };

  const handleLimitChange = (limit: number) => {
    fetchOrders(1, limit, searchTerm, statusFilter, paymentStatusFilter);
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
        setCustomers(data.customers || data);
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

  const calculatePricing = (serviceId: string, weight: number, items: number) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return 0;

    let total = service.base_price || 0;
    
    if (service.price_per_kg && weight > 0) {
      total += service.price_per_kg * weight;
    }
    
    if (service.price_per_item && items > 0) {
      total += service.price_per_item * items;
    }

    return total;
  };

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      const weight = parseFloat(newOrder.weight) || 0;
      const items = parseInt(newOrder.items) || 0;
      const subtotal = calculatePricing(serviceId, weight, items);
      const discountAmount = parseFloat(newOrder.discount_amount) || 0;
      const totalAmount = subtotal - discountAmount;

      setNewOrder({
        ...newOrder,
        service_type: service.display_name,
        subtotal: subtotal.toString(),
        total_amount: Math.max(0, totalAmount).toString()
      });
    }
  };

  const handleWeightOrItemsChange = (field: string, value: string) => {
    const updatedOrder = { ...newOrder, [field]: value };
    
    if (newOrder.service_type) {
      const service = services.find(s => s.display_name === newOrder.service_type);
      if (service) {
        const weight = parseFloat(field === 'weight' ? value : updatedOrder.weight) || 0;
        const items = parseInt(field === 'items' ? value : updatedOrder.items) || 0;
        const subtotal = calculatePricing(service.id, weight, items);
        const discountAmount = parseFloat(updatedOrder.discount_amount) || 0;
        const totalAmount = subtotal - discountAmount;

        updatedOrder.subtotal = subtotal.toString();
        updatedOrder.total_amount = Math.max(0, totalAmount).toString();
      }
    }
    
    setNewOrder(updatedOrder);
  };

  const handleDiscountChange = (value: string) => {
    const discountAmount = parseFloat(value) || 0;
    const subtotal = parseFloat(newOrder.subtotal) || 0;
    const totalAmount = subtotal - discountAmount;

    setNewOrder({
      ...newOrder,
      discount_amount: value,
      total_amount: Math.max(0, totalAmount).toString()
    });
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newOrder,
          weight: parseFloat(newOrder.weight) || 0,
          items: parseInt(newOrder.items) || 0,
          subtotal: parseFloat(newOrder.subtotal) || 0,
          discount_amount: parseFloat(newOrder.discount_amount) || 0,
          total_amount: parseFloat(newOrder.total_amount) || 0
        }),
      });

      if (response.ok) {
        fetchOrders(pagination.page, pagination.limit, searchTerm, statusFilter, paymentStatusFilter);
        setIsCreateDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error creating order:', error);
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
        body: JSON.stringify({
          ...newOrder,
          weight: parseFloat(newOrder.weight) || 0,
          items: parseInt(newOrder.items) || 0,
          subtotal: parseFloat(newOrder.subtotal) || 0,
          discount_amount: parseFloat(newOrder.discount_amount) || 0,
          total_amount: parseFloat(newOrder.total_amount) || 0
        }),
      });

      if (response.ok) {
        fetchOrders(pagination.page, pagination.limit, searchTerm, statusFilter, paymentStatusFilter);
        setEditingOrder(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const startEdit = (order: Order) => {
    setEditingOrder(order);
    setNewOrder({
      customer_id: order.customer_id,
      service_type: order.service_type,
      order_date: order.order_date ? new Date(order.order_date).toISOString().split('T')[0] : new Date(order.created_at).toISOString().split('T')[0],
      weight: order.weight.toString(),
      items: order.items.toString(),
      subtotal: order.subtotal.toString(),
      discount_amount: order.discount_amount.toString(),
      discount_reason: order.discount_reason || '',
      total_amount: order.total_amount.toString(),
      payment_status: order.payment_status,
      status: order.status,
      transaction_code: order.transaction_code || '',
      notes: order.notes || ''
    });
    setCustomerSearchValue('');
    setServiceSearchValue('');
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchOrders(pagination.page, pagination.limit, searchTerm, statusFilter, paymentStatusFilter);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const resetForm = () => {
    setNewOrder({
      customer_id: '',
      service_type: '',
      order_date: new Date().toISOString().split('T')[0],
      weight: '',
      items: '',
      subtotal: '',
      discount_amount: '',
      discount_reason: '',
      total_amount: '',
      payment_status: 'pending',
      status: 'received',
      transaction_code: '',
      notes: ''
    });
    setCustomerSearchValue('');
    setServiceSearchValue('');
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.service_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || order.payment_status === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'received': 'bg-blue-100 text-blue-800',
      'processing': 'bg-yellow-100 text-yellow-800',
      'washing': 'bg-purple-100 text-purple-800',
      'drying': 'bg-orange-100 text-orange-800',
      'folding': 'bg-indigo-100 text-indigo-800',
      'ready': 'bg-green-100 text-green-800',
      'completed': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'paid': 'bg-green-100 text-green-800',
      'partial': 'bg-orange-100 text-orange-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

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
                <p className="text-sm sm:text-base text-gray-600 hidden sm:block">Manage customer orders and services</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-4">
                <DialogHeader>
                  <DialogTitle>Create New Order</DialogTitle>
                </DialogHeader>
                <div className="max-h-[80vh] overflow-y-auto">
                  <form onSubmit={handleCreateOrder} className="space-y-4">
                    {/* Customer Selection */}
                    <div className="space-y-2">
                      <Label>Customer</Label>
                      <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={customerSearchOpen}
                            className="w-full justify-between"
                          >
                            {newOrder.customer_id
                              ? customers.find(customer => customer.id === newOrder.customer_id)?.name
                              : "Select customer..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput 
                              placeholder="Search customers..." 
                              value={customerSearchValue}
                              onValueChange={setCustomerSearchValue}
                            />
                            <CommandEmpty>No customer found.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-y-auto">
                              {customers
                                .map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  value={customer.name}
                                  onSelect={() => {
                                    setNewOrder({...newOrder, customer_id: customer.id});
                                    setCustomerSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      newOrder.customer_id === customer.id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div>
                                    <div className="font-medium">{customer.name}</div>
                                    {customer.phone && (
                                      <div className="text-xs text-gray-500">{customer.phone}</div>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Service Selection */}
                    <div className="space-y-2">
                      <Label>Service Type</Label>
                      <Popover open={serviceSearchOpen} onOpenChange={setServiceSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={serviceSearchOpen}
                            className="w-full justify-between"
                          >
                            {newOrder.service_type || "Select service..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" 
                            avoidCollisions={false}
                            collisionPadding={100}
                            side="bottom"
                            style={{ overflow: 'visible' }}
                          >
                          <Command>
                            <CommandInput 
                              placeholder="Search services..." 
                              value={serviceSearchValue}
                              onValueChange={setServiceSearchValue}
                            />
                            <CommandEmpty>No service found.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-y-auto">
                              {services
                                .map((service) => (
                                <CommandItem
                                  key={service.id}
                                  value={service.display_name}
                                  onSelect={() => {
                                    handleServiceChange(service.id);
                                    setServiceSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      newOrder.service_type === service.display_name ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div>
                                    <div className="font-medium">{service.display_name}</div>
                                    <div className="text-xs text-gray-500">
                                      Base: {formatCurrency(service.base_price)}
                                      {service.price_per_kg && ` | Per KG: ${formatCurrency(service.price_per_kg)}`}
                                      {service.price_per_item && ` | Per Item: ${formatCurrency(service.price_per_item)}`}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Order Date */}
                    <div className="space-y-2">
                      <Label htmlFor="order_date">Order Date</Label>
                      <Input
                        id="order_date"
                        type="date"
                        value={newOrder.order_date}
                        onChange={(e) => setNewOrder({...newOrder, order_date: e.target.value})}
                        required
                      />
                    </div>

                    {/* Weight and Items */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="weight">Weight (KG)</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          value={newOrder.weight}
                          onChange={(e) => handleWeightOrItemsChange('weight', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="items">Items</Label>
                        <Input
                          id="items"
                          type="number"
                          value={newOrder.items}
                          onChange={(e) => handleWeightOrItemsChange('items', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="space-y-2">
                      <Label htmlFor="subtotal">Subtotal (KSH)</Label>
                      <Input
                        id="subtotal"
                        type="number"
                        step="0.01"
                        value={newOrder.subtotal}
                        onChange={(e) => setNewOrder({...newOrder, subtotal: e.target.value})}
                        className="bg-gray-50"
                        readOnly
                      />
                    </div>

                    {/* Discount */}
                    <div className="space-y-2">
                      <Label htmlFor="discount_amount">Discount Amount (KSH)</Label>
                      <Input
                        id="discount_amount"
                        type="number"
                        step="0.01"
                        value={newOrder.discount_amount}
                        onChange={(e) => handleDiscountChange(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discount_reason">Discount Reason (Optional)</Label>
                      <Input
                        id="discount_reason"
                        value={newOrder.discount_reason}
                        onChange={(e) => setNewOrder({...newOrder, discount_reason: e.target.value})}
                        placeholder="e.g., Loyal customer, First time discount"
                      />
                    </div>

                    {/* Total Amount */}
                    <div className="space-y-2">
                      <Label htmlFor="total_amount">Total Amount (KSH)</Label>
                      <Input
                        id="total_amount"
                        type="number"
                        step="0.01"
                        value={newOrder.total_amount}
                        onChange={(e) => setNewOrder({...newOrder, total_amount: e.target.value})}
                        className="bg-green-50 font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Order Status</Label>
                      <Select value={newOrder.status || 'received'} onValueChange={(value) => setNewOrder({...newOrder, status: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {orderStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Payment Status */}
                    <div className="space-y-2">
                      <Label htmlFor="payment_status">Payment Status</Label>
                      <Select value={newOrder.payment_status} onValueChange={(value) => setNewOrder({...newOrder, payment_status: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Transaction Code */}
                    <div className="space-y-2">
                      <Label htmlFor="transaction_code">Transaction Code (Optional)</Label>
                      <Input
                        id="transaction_code"
                        value={newOrder.transaction_code}
                        onChange={(e) => setNewOrder({...newOrder, transaction_code: e.target.value})}
                        placeholder="e.g., TXN123456, MPESA-ABC123"
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={newOrder.notes}
                        onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                        placeholder="Any special instructions or notes..."
                      />
                    </div>

                    <Button type="submit" className="w-full">Create Order</Button>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Results Summary */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-sm text-gray-600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Show:</label>
                <Select value={pagination.limit.toString()} onValueChange={(value) => handleLimitChange(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search orders by customer, service, or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {orderStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Filter by payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    {paymentStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
              </div>
          </CardContent>
        </Card>


        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Orders ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-base truncate">{order.customers?.name || 'Unknown Customer'}</p>
                      <p className="text-sm text-gray-600 truncate">{order.service_type}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusColor(order.status)} variant="secondary">
                          {order.status}
                        </Badge>
                        <Badge className={getPaymentStatusColor(order.payment_status)} variant="secondary">
                          {order.payment_status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <div className="font-medium text-green-600">
                        {formatCurrency(order.total_amount)}
                      </div>
                      {order.discount_amount > 0 && (
                        <div className="text-xs text-red-600">
                          -{formatCurrency(order.discount_amount)} discount
                        </div>
                      )}
                      <div className="text-xs text-gray-600 mt-1">
                        {new Date(order.order_date || order.created_at).toLocaleDateString()}
                      </div>
                      {order.transaction_code && (
                        <div className="text-xs text-blue-600 mt-1">
                          {order.transaction_code}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-600">
                      {order.weight > 0 && <span>{order.weight}kg </span>}
                      {order.items > 0 && <span>{order.items} items</span>}
                    </div>
                    
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => startEdit(order)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteOrder(order.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {order.updated_at && (
                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                      Updated {new Date(order.updated_at).toLocaleDateString()}
                      {order.updated_by_user && (
                        <span> by {order.updated_by_user.name}</span>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium">{order.customers?.name || 'Unknown'}</div>
                        {order.customers?.phone && (
                          <div className="text-xs text-gray-500">{order.customers.phone}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{order.service_type}</div>
                        {order.notes && (
                          <div className="text-xs text-gray-500 truncate max-w-32">{order.notes}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {order.weight > 0 && <div>{order.weight}kg</div>}
                          {order.items > 0 && <div>{order.items} items</div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        <div>{new Date(order.order_date || order.created_at).toLocaleDateString()}</div>
                        {order.transaction_code && (
                          <div className="text-xs text-blue-600">{order.transaction_code}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          {formatCurrency(order.total_amount)}
                        </div>
                        {order.discount_amount > 0 && (
                          <div className="text-xs text-red-600">
                            -{formatCurrency(order.discount_amount)}
                            {order.discount_reason && (
                              <div className="text-gray-500">({order.discount_reason})</div>
                            )}
                          </div>
                        )}
                        {order.subtotal !== order.total_amount && (
                          <div className="text-xs text-gray-500 line-through">
                            {formatCurrency(order.subtotal)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)} variant="secondary">
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPaymentStatusColor(order.payment_status)} variant="secondary">
                          {order.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(order.order_date || order.created_at).toLocaleDateString()}
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
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => startEdit(order)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteOrder(order.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredOrders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No orders found matching your criteria.
              </div>
            )}
          </CardContent>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t">
              <SmartPagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                hasNext={pagination.hasNext}
                hasPrev={pagination.hasPrev}
              />
            </div>
          )}
        </Card>
      </div>

      {/* Edit Order Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto">
            <form onSubmit={handleEditOrder} className="space-y-4">
              {/* Customer Selection */}
              <div className="space-y-2">
                <Label>Customer</Label>
                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerSearchOpen}
                      className="w-full justify-between"
                    >
                      {newOrder.customer_id
                        ? customers.find(customer => customer.id === newOrder.customer_id)?.name
                        : "Select customer..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search customers..." 
                        value={customerSearchValue}
                        onValueChange={setCustomerSearchValue}
                      />
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-y-auto">
                        {customers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.name}
                            onSelect={() => {
                              setNewOrder({...newOrder, customer_id: customer.id});
                              setCustomerSearchOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                newOrder.customer_id === customer.id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              {customer.phone && (
                                <div className="text-xs text-gray-500">{customer.phone}</div>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Service Selection */}
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Popover open={serviceSearchOpen} onOpenChange={setServiceSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={serviceSearchOpen}
                      className="w-full justify-between"
                    >
                      {newOrder.service_type || "Select service..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search services..." 
                        value={serviceSearchValue}
                        onValueChange={setServiceSearchValue}
                      />
                      <CommandEmpty>No service found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-y-auto">
                        {services.map((service) => (
                          <CommandItem
                            key={service.id}
                            value={service.display_name}
                            onSelect={() => {
                              handleServiceChange(service.id);
                              setServiceSearchOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                newOrder.service_type === service.display_name ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <div>
                              <div className="font-medium">{service.display_name}</div>
                              <div className="text-xs text-gray-500">
                                Base: {formatCurrency(service.base_price)}
                                {service.price_per_kg && ` | Per KG: ${formatCurrency(service.price_per_kg)}`}
                                {service.price_per_item && ` | Per Item: ${formatCurrency(service.price_per_item)}`}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Order Date */}
              <div className="space-y-2">
                <Label htmlFor="edit_order_date">Order Date</Label>
                <Input
                  id="edit_order_date"
                  type="date"
                  value={newOrder.order_date}
                  onChange={(e) => setNewOrder({...newOrder, order_date: e.target.value})}
                  required
                />
              </div>

              {/* Weight and Items */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_weight">Weight (KG)</Label>
                  <Input
                    id="edit_weight"
                    type="number"
                    step="0.1"
                    value={newOrder.weight}
                    onChange={(e) => handleWeightOrItemsChange('weight', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_items">Items</Label>
                  <Input
                    id="edit_items"
                    type="number"
                    value={newOrder.items}
                    onChange={(e) => handleWeightOrItemsChange('items', e.target.value)}
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-2">
                <Label htmlFor="edit_subtotal">Subtotal (KSH)</Label>
                <Input
                  id="edit_subtotal"
                  type="number"
                  step="0.01"
                  value={newOrder.subtotal}
                  onChange={(e) => setNewOrder({...newOrder, subtotal: e.target.value})}
                  className="bg-gray-50"
                />
              </div>

              {/* Discount */}
              <div className="space-y-2">
                <Label htmlFor="edit_discount_amount">Discount Amount (KSH)</Label>
                <Input
                  id="edit_discount_amount"
                  type="number"
                  step="0.01"
                  value={newOrder.discount_amount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_discount_reason">Discount Reason</Label>
                <Input
                  id="edit_discount_reason"
                  value={newOrder.discount_reason}
                  onChange={(e) => setNewOrder({...newOrder, discount_reason: e.target.value})}
                  placeholder="e.g., Loyal customer, First time discount"
                />
              </div>

              {/* Total Amount */}
              <div className="space-y-2">
                <Label htmlFor="edit_total_amount">Total Amount (KSH)</Label>
                <Input
                  id="edit_total_amount"
                  type="number"
                  step="0.01"
                  value={newOrder.total_amount}
                  onChange={(e) => setNewOrder({...newOrder, total_amount: e.target.value})}
                  className="bg-green-50 font-medium"
                />
              </div>

              {/* Order Status */}
              <div className="space-y-2">
                <Label>Order Status</Label>
                <Select value={newOrder.status || 'received'} onValueChange={(value) => setNewOrder({...newOrder, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {orderStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Status */}
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={newOrder.payment_status} onValueChange={(value) => setNewOrder({...newOrder, payment_status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction Code */}
              <div className="space-y-2">
                <Label htmlFor="edit_transaction_code">Transaction Code</Label>
                <Input
                  id="edit_transaction_code"
                  value={newOrder.transaction_code}
                  onChange={(e) => setNewOrder({...newOrder, transaction_code: e.target.value})}
                  placeholder="e.g., TXN123456, MPESA-ABC123"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="edit_notes">Notes</Label>
                <Textarea
                  id="edit_notes"
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                  placeholder="Any special instructions or notes..."
                />
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button type="submit" className="flex-1">Update Order</Button>
                <Button type="button" variant="outline" onClick={() => setEditingOrder(null)} className="flex-1">
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