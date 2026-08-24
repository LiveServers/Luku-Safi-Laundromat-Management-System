'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download, FileText, TrendingUp, Users, DollarSign, Scale } from 'lucide-react';

interface CustomerInsight {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  total_cash: number;
  total_weight: number;
  visits: number;
  orders: number;
  average_order_value: number;
}

interface PeriodReport {
  period: string;
  label: string;
  startDate: string;
  endDate: string;
  month: string;
  orders: any[];
  expenses: any[];
  customers: CustomerInsight[];
  topByCash: CustomerInsight[];
  topByWeight: CustomerInsight[];
  topByVisits: CustomerInsight[];
  revenue: number;
  totalExpenses: number;
  profit: number;
  newCustomers: number;
  returningCustomers: number;
  customerFrequency: Record<string, Record<string, number | string>>;
  totalOrders: number;
  totalWeight: number;
}

interface Location {
  id: string;
  name: string;
  display_name: string;
}

export default function Reports() {
  const [report, setReport] = useState<PeriodReport | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedHalf, setSelectedHalf] = useState(new Date().getMonth() < 6 ? 1 : 2);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedLocation, setSelectedLocation] = useState('all');
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

    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/locations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        period,
        year: selectedYear.toString(),
        month: selectedMonth.toString(),
        quarter: selectedQuarter.toString(),
        half: selectedHalf.toString(),
        ...(selectedLocation !== 'all' && { location_id: selectedLocation })
      });
      
      const response = await fetch(`/api/analytics/period-report?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReport(data);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const key = header.toLowerCase().replace(/ /g, '_');
        const value = row[key] ?? '';
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const locationSuffix = selectedLocation !== 'all' ? `_${locations.find(l => l.id === selectedLocation)?.name || 'location'}` : '_all_locations';
    const periodSuffix = report?.label?.replace(/\s+/g, '_') || `${selectedYear}_${selectedMonth}`;
    a.download = `${filename}_${periodSuffix}${locationSuffix}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadOrdersReport = () => {
    if (!report) return;
    const ordersData = report.orders.map(order => ({
      date: new Date(order.created_at).toLocaleDateString(),
      customer: order.customer_name || 'Unknown',
      location: order.location_name || 'Unknown',
      service: order.service_type,
      amount: order.total_amount,
      payment_status: order.payment_status,
      status: order.status,
      items: order.items,
      weight: order.weight
    }));

    downloadCSV(ordersData, 'orders_report', [
      'Date', 'Customer', 'Location', 'Service', 'Amount', 'Payment Status', 'Status', 'Items', 'Weight'
    ]);
  };

  const downloadExpensesReport = () => {
    if (!report) return;
    const expensesData = report.expenses.map(expense => ({
      date: new Date(expense.date).toLocaleDateString(),
      location: expense.location?.name || 'Unknown',
      category: expense.category,
      description: expense.description,
      amount: expense.amount
    }));

    downloadCSV(expensesData, 'expenses_report', [
      'Date', 'Location', 'Category', 'Description', 'Amount'
    ]);
  };

  const downloadRevenueReport = () => {
    if (!report) return;
    
    const revenueData = [{
      period: report.label,
      location: selectedLocation !== 'all' ? locations.find(l => l.id === selectedLocation)?.display_name || 'Unknown' : 'All Locations',
      total_revenue: report.revenue,
      total_expenses: report.totalExpenses,
      profit: report.profit,
      total_orders: report.totalOrders,
      total_weight: report.totalWeight,
      new_customers: report.newCustomers,
      returning_customers: report.returningCustomers
    }];

    downloadCSV(revenueData, 'revenue_report', [
      'Period', 'Location', 'Total Revenue', 'Total Expenses', 'Profit', 'Total Orders', 'Total Weight', 'New Customers', 'Returning Customers'
    ]);
  };

  const downloadCustomersReport = () => {
    if (!report) return;
    const customersData = [...report.customers]
      .sort((a, b) => b.total_cash - a.total_cash)
      .map(customer => ({
        customer: customer.name,
        phone: customer.phone,
        email: customer.email,
        location: customer.location,
        total_cash: customer.total_cash.toFixed(2),
        total_weight: customer.total_weight.toFixed(2),
        visits: customer.visits,
        orders: customer.orders,
        average_order_value: customer.average_order_value.toFixed(2)
      }));

    downloadCSV(customersData, 'customers_report', [
      'Customer', 'Phone', 'Email', 'Location', 'Total Cash', 'Total Weight', 'Visits', 'Orders', 'Average Order Value'
    ]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const renderLeaderboard = (title: string, rows: CustomerInsight[], metric: keyof CustomerInsight, format: (value: number) => string) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">No customer activity in this period.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((customer, index) => (
              <div key={customer.id} className="flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{index + 1}. {customer.name}</p>
                  {customer.phone && <p className="text-xs text-gray-500">{customer.phone}</p>}
                </div>
                <Badge variant="outline">{format(Number(customer[metric]))}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-4">
            <div className="flex items-center">
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
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Business Reports</h1>
                <p className="text-sm sm:text-base text-gray-600 hidden sm:block">Revenue, customers, and exportable insights</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Period</label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi_annual">Semi-annually</SelectItem>
                    <SelectItem value="annual">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {period === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Month</label>
                  <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {period === 'quarterly' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Quarter</label>
                  <Select value={selectedQuarter.toString()} onValueChange={(value) => setSelectedQuarter(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
                      <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
                      <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                      <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {period === 'semi_annual' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Half</label>
                  <Select value={selectedHalf.toString()} onValueChange={(value) => setSelectedHalf(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">H1 (Jan-Jun)</SelectItem>
                      <SelectItem value="2">H2 (Jul-Dec)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={fetchReport} disabled={loading} className="w-full">
                {loading ? 'Loading...' : 'Generate Report'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {report && (
          <>
            <Card className="mb-6">
              <CardContent className="pt-6 text-center">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {report.label}
                  {selectedLocation !== 'all' ? ` · ${locations.find(l => l.id === selectedLocation)?.display_name}` : ' · All Locations'}
                </Badge>
                <p className="text-sm text-gray-600 mt-2">{report.startDate} to {report.endDate}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(report.revenue)}
                      </div>
                      <p className="text-xs text-gray-600">Total Revenue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <div className={`text-2xl font-bold ${report.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatCurrency(report.profit)}
                      </div>
                      <p className="text-xs text-gray-600">Net Profit</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <Scale className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {report.totalWeight.toFixed(1)} kg
                      </div>
                      <p className="text-xs text-gray-600">Total Weight</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-orange-600" />
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-orange-600">
                        {report.totalOrders}
                      </div>
                      <p className="text-xs text-gray-600">Total Orders</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6 text-center">
                  <FileText className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Orders Report</h3>
                  <Button onClick={downloadOrdersReport} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <DollarSign className="h-10 w-10 text-red-600 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Expenses Report</h3>
                  <Button onClick={downloadExpensesReport} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <TrendingUp className="h-10 w-10 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Revenue Summary</h3>
                  <Button onClick={downloadRevenueReport} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="h-10 w-10 text-purple-600 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Customers Report</h3>
                  <Button onClick={downloadCustomersReport} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {renderLeaderboard('Highest Grossing (Cash)', report.topByCash, 'total_cash', formatCurrency)}
              {renderLeaderboard('Highest Grossing (Weight)', report.topByWeight, 'total_weight', (value) => `${value.toFixed(1)} kg`)}
              {renderLeaderboard('Most Visits', report.topByVisits, 'visits', (value) => `${value} visits`)}
            </div>

            <Card className="mb-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Customer Activity</CardTitle>
                <Badge variant="outline">{report.customers.length} customers</Badge>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Cash</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Visits</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Avg Order</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...report.customers].sort((a, b) => b.total_cash - a.total_cash).map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>{customer.phone || '-'}</TableCell>
                          <TableCell>{formatCurrency(customer.total_cash)}</TableCell>
                          <TableCell>{customer.total_weight.toFixed(1)} kg</TableCell>
                          <TableCell>{customer.visits}</TableCell>
                          <TableCell>{customer.orders}</TableCell>
                          <TableCell>{formatCurrency(customer.average_order_value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>New Customers</span>
                      <Badge className="bg-green-100 text-green-800">
                        {report.newCustomers}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Returning Customers</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {report.returningCustomers}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Total Unique Customers</span>
                      <Badge className="bg-purple-100 text-purple-800">
                        {report.customers.length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Customer Frequency</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(report.customerFrequency || {})
                      .sort(([,a], [,b]) => (b.customerFrequency as number) - (a.customerFrequency as number))
                      .slice(0, 5)
                      .map(([customerId, {customerFrequency, customerName}]) => {
                        return (
                          <div key={customerId} className="flex justify-between items-center">
                            <span className="text-sm">{customerName || 'Unknown'}</span>
                            <Badge variant="outline">
                              {customerFrequency} visits
                            </Badge>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
