# Laundromat Management System

A comprehensive management system for laundromat businesses built with Next.js and PostgreSQL.

## Features

- **Order Management** - Track customer orders with pricing, discounts, and status updates
- **Customer Management** - Maintain customer database with history and analytics
- **Expense Tracking** - Record and categorize business expenses
- **Service Management** - Configure services and pricing
- **User Management** - Role-based access (Owner/Attendant)
- **Analytics & Reports** - Revenue, profit, and customer insights
- **Mobile-First Design** - Responsive interface for mobile and desktop

## Tech Stack

- **Frontend**: Next.js 13, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Deployment**: Docker

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd laundromat-management
   ```

2. **Start the database**
   ```bash
   docker-compose up -d postgres
   ```

3. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Start the backend server**
   ```bash
   npm run dev
   ```

6. **Install frontend dependencies**
   ```bash
   cd ..
   npm install
   ```

7. **Start the frontend**
   ```bash
   npm run dev
   ```

8. **Access the application**
   - Frontend: http://localhost:3000
   - Database Admin (Adminer): http://localhost:8080

## Database Setup

The PostgreSQL database will be automatically initialized with:
- Complete schema with all tables
- Default services and pricing
- Proper indexes and constraints
- Audit triggers for tracking changes

### Database Access

- **Host**: localhost
- **Port**: 5432
- **Database**: laundromat
- **Username**: laundromat_user
- **Password**: secure_password_123

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── auth/              # Authentication pages
│   ├── customers/         # Customer management
│   ├── expenses/          # Expense tracking
│   ├── orders/            # Order management
│   ├── reports/           # Analytics and reports
│   ├── services/          # Service configuration
│   └── users/             # User management
├── server/                # Backend API
│   ├── config/            # Database configuration
│   ├── middleware/        # Authentication middleware
│   └── routes/            # API routes
├── database/              # Database initialization
│   └── init/              # SQL initialization scripts
├── components/            # Reusable UI components
└── docker-compose.yml     # Docker configuration
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/add-user` - Add new user (owner only)
- `GET /api/auth/users` - Get all users (owner only)

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create new customer
- `GET /api/customers/:id/history` - Get customer history and analytics

### Expenses
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Services
- `GET /api/services` - Get active services
- `GET /api/services/all` - Get all services (owner only)
- `POST /api/services` - Create new service (owner only)
- `PUT /api/services/:id` - Update service (owner only)

### Analytics
- `GET /api/analytics/dashboard` - Dashboard statistics
- `GET /api/analytics/revenue-chart` - Revenue chart data
- `GET /api/analytics/expenses-chart` - Expenses chart data
- `GET /api/analytics/monthly-report` - Monthly reports

## Features

### Order Management
- Create orders with customer selection
- Service-based pricing with weight/item calculations
- Discount functionality with reasons
- Payment status tracking
- Order status workflow
- Transaction code recording
- Custom order dates for backdating

### Customer Analytics
- Complete order history
- Spending patterns and trends
- Visit frequency analysis
- Monthly and weekly charts
- Customer loyalty insights

### Expense Tracking
- Categorized expense recording
- Transaction code tracking
- Custom dates for historical entries
- Audit trail with user tracking

### Mobile-First Design
- Responsive layouts for all screen sizes
- Touch-friendly interfaces
- Mobile-optimized forms and tables
- Card-based layouts for mobile

## Development

### Running in Development Mode

1. **Database**
   ```bash
   docker-compose up -d postgres
   ```

2. **Backend**
   ```bash
   cd server
   npm run dev
   ```

3. **Frontend**
   ```bash
   npm run dev
   ```

### Database Management

Access Adminer at http://localhost:8080 to manage the database:
- Server: postgres
- Username: laundromat_user
- Password: secure_password_123
- Database: laundromat

## Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.