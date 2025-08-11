'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { DollarSign, Package, Users, Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface DashboardData {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  totalOrders: number;
  totalCustomers: number;
  pendingOrders: number;
  recentOrders: any[];
}

interface ChartData {
  month?: string;
  revenue?: number;
  category?: string;
  amount?: number;
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [revenueChart, setRevenueChart] = useState<ChartData[]>([]);
  const [expensesChart, setExpensesChart] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    setUserRole(user.role || '');
    fetchDashboardData();
    if (user.role === 'owner') {
      fetchChartData();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/analytics/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchChartData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [revenueResponse, expensesResponse] = await Promise.all([
        fetch('/api/analytics/revenue-chart', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/analytics/expenses-chart', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (revenueResponse.ok) {
        const revenueData = await revenueResponse.json();
        setRevenueChart(revenueData);
      }

      if (expensesResponse.ok) {
        const expensesData = await expensesResponse.json();
        setExpensesChart(expensesData);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Laundromat Management</h1>
              <p className="text-sm sm:text-base text-gray-600 hidden sm:block">Dashboard Overview</p>
            </div>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-2 lg:space-x-4">
              <Button onClick={() => router.push('/orders')} size="sm" className="text-xs lg:text-sm">Orders</Button>
              <Button onClick={() => router.push('/customers')} variant="outline" size="sm" className="text-xs lg:text-sm">Customers</Button>
              {userRole === 'owner' && (
                <>
                  <Button onClick={() => router.push('/expenses')} variant="outline" size="sm" className="text-xs lg:text-sm">Expenses</Button>
                  <Button onClick={() => router.push('/services')} variant="outline" size="sm" className="text-xs lg:text-sm">Services</Button>
                  <Button onClick={() => router.push('/users')} variant="outline" size="sm" className="text-xs lg:text-sm">Users</Button>
                  <Button onClick={() => router.push('/reports')} variant="outline" size="sm" className="text-xs lg:text-sm">Reports</Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t bg-white py-4">
              <div className="flex flex-col space-y-2">
                <Button onClick={() => { router.push('/orders'); setIsMobileMenuOpen(false); }} variant="ghost" className="justify-start">Orders</Button>
                <Button onClick={() => { router.push('/customers'); setIsMobileMenuOpen(false); }} variant="ghost" className="justify-start">Customers</Button>
                {userRole === 'owner' && (
                  <>
                    <Button onClick={() => { router.push('/expenses'); setIsMobileMenuOpen(false); }} variant="ghost" className="justify-start">Expenses</Button>
                    <Button onClick={() => { router.push('/services'); setIsMobileMenuOpen(false); }} variant="ghost" className="justify-start">Services</Button>
                    <Button onClick={() => { router.push('/users'); setIsMobileMenuOpen(false); }} variant="ghost" className="justify-start">Users</Button>
                    <Button onClick={() => { router.push('/reports'); setIsMobileMenuOpen(false); }} variant="ghost" className="justify-start">Reports</Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {userRole === 'owner' && (
            <>
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold text-green-600">
                    {formatCurrency(dashboardData?.totalRevenue || 0)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 hidden sm:block">From paid orders</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Expenses</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold text-red-600">
                    {formatCurrency(dashboardData?.totalExpenses || 0)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 hidden sm:block">Operational costs</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Net Profit</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className={`text-lg sm:text-2xl font-bold ${(dashboardData?.profit || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(dashboardData?.profit || 0)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 hidden sm:block">Revenue - Expenses</p>
                </CardContent>
              </Card>
            </>
          )}

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Pending Orders</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-orange-600">
                {dashboardData?.pendingOrders || 0}
              </div>
              <p className="text-xs text-gray-600 mt-1 hidden sm:block">Awaiting completion</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Charts */}
          {userRole === 'owner' ? (
            <div className="lg:col-span-2">
              <Tabs defaultValue="revenue" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="revenue">Revenue Trend</TabsTrigger>
                  <TabsTrigger value="expenses">Expenses by Category</TabsTrigger>
                </TabsList>
                
                <TabsContent value="revenue">
                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={revenueChart}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#3B82F6" 
                            strokeWidth={3}
                            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="expenses">
                  <Card>
                    <CardHeader>
                      <CardTitle>Expenses by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={expensesChart}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="amount"
                          >
                            {expensesChart.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}

          {/* Recent Orders */}
          <div className={userRole === 'owner' ? '' : 'lg:col-span-3'}>
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData?.recentOrders?.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{order.customers?.name || 'Unknown Customer'}</p>
                        <p className="text-xs text-gray-600 truncate">{order.service_type}</p>
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="text-xs mt-1">
                          {order.status}
                        </Badge>
                      </div>
                      <div className="text-right ml-2 flex-shrink-0">
                        <p className="font-medium text-sm">{formatCurrency(order.total_amount)}</p>
                        <p className="text-xs text-gray-600 hidden sm:block">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!dashboardData?.recentOrders || dashboardData.recentOrders.length === 0) && (
                    <p className="text-gray-500 text-center py-4">No recent orders</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            {userRole === 'owner' && (
              <Card className="mt-4 sm:mt-6">
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm">Total Orders</span>
                      </div>
                      <span className="font-medium">{dashboardData?.totalOrders || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-sm">Total Customers</span>
                      </div>
                      <span className="font-medium">{dashboardData?.totalCustomers || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}