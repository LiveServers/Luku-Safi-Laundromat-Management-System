'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, FileText, TrendingUp, Users, DollarSign } from 'lucide-react';

interface MonthlyReport {
  month: string;
  orders: any[];
  expenses: any[];
  revenue: number;
  totalExpenses: number;
  profit: number;
  newCustomers: number;
  returningCustomers: number;
  customerFrequency: Record<string, number>;
  totalOrders: number;
}

export default function Reports() {
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/analytics/monthly-report?month=${selectedMonth}&year=${selectedYear}`, {
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
        const value = row[header.toLowerCase().replace(' ', '_')] || '';
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${selectedYear}_${selectedMonth.toString().padStart(2, '0')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadOrdersReport = () => {
    if (!report) return;
    
    const ordersData = report.orders.map(order => ({
      date: new Date(order.created_at).toLocaleDateString(),
      customer: order.customers?.name || 'Unknown',
      service: order.service_type,
      amount: order.total_amount,
      payment_status: order.payment_status,
      status: order.status,
      items: order.items,
      weight: order.weight
    }));

    downloadCSV(ordersData, 'orders_report', [
      'Date', 'Customer', 'Service', 'Amount', 'Payment Status', 'Status', 'Items', 'Weight'
    ]);
  };

  const downloadExpensesReport = () => {
    if (!report) return;
    
    const expensesData = report.expenses.map(expense => ({
      date: expense.date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount
    }));

    downloadCSV(expensesData, 'expenses_report', [
      'Date', 'Category', 'Description', 'Amount'
    ]);
  };

  const downloadRevenueReport = () => {
    if (!report) return;
    
    const revenueData = [{
      month: report.month,
      total_revenue: report.revenue,
      total_expenses: report.totalExpenses,
      profit: report.profit,
      total_orders: report.totalOrders,
      new_customers: report.newCustomers,
      returning_customers: report.returningCustomers
    }];

    downloadCSV(revenueData, 'revenue_report', [
      'Month', 'Total Revenue', 'Total Expenses', 'Profit', 'Total Orders', 'New Customers', 'Returning Customers'
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Monthly Reports</h1>
                <p className="text-sm sm:text-base text-gray-600 hidden sm:block">Download comprehensive business reports</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Report Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-row gap-4 items-end flex-wrap sm:flex-nowrap">
              <div className="flex-1">
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
              <div className="flex-1">
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
              <Button onClick={fetchReport} disabled={loading}>
                {loading ? 'Loading...' : 'Generate Report'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {report && (
          <>
            {/* Summary Cards */}
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
                    <Users className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {report.newCustomers}
                      </div>
                      <p className="text-xs text-gray-600">New Customers</p>
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

            {/* Download Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Orders Report</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Detailed list of all orders for the month
                    </p>
                    <Button onClick={downloadOrdersReport} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Orders CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <DollarSign className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Expenses Report</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Complete breakdown of all expenses
                    </p>
                    <Button onClick={downloadExpensesReport} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Expenses CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Revenue Summary</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Monthly revenue and profit summary
                    </p>
                    <Button onClick={downloadRevenueReport} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Revenue CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Customer Analysis */}
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
                        {Object.keys(report.customerFrequency).length}
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
                    {Object.entries(report.customerFrequency)
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .slice(0, 5)
                      .map(([customerId, frequency]) => {
                        const customer = report.orders.find(o => o.customer_id === customerId)?.customers;
                        return (
                          <div key={customerId} className="flex justify-between items-center">
                            <span className="text-sm">{customer?.name || 'Unknown'}</span>
                            <Badge variant="outline">
                              {frequency} visits
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