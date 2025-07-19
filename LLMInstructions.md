# LLM Instructions: Playwright Orchestrator Repository

## 🏗️ Repository Overview

This is a **Playwright Orchestrator & Test Hub** - a robust, scalable, and self-hosted test orchestration platform that provides centralized scheduling, execution, and analysis of end-to-end tests. It's built as a **monorepo** using pnpm workspaces with four main packages.

## 🛠️ Technology Stack

### Core Technologies
- **Node.js 18+** with TypeScript
- **pnpm** for package management and workspace orchestration
- **PostgreSQL 15+** for metadata storage
- **S3-compatible storage** (AWS S3, MinIO) for test artifacts
- **Docker & Docker Compose** for containerized deployment
- **Playwright** for end-to-end test execution

### Frontend Technologies
- **React 18** with TypeScript
- **TanStack Router** for client-side routing
- **TanStack Query** for data fetching and caching
- **shadcn/ui** for component library (refer to [shadcn/ui docs](https://ui.shadcn.com/) for patterns)
- **Tailwind CSS** for styling
- **Recharts** for data visualizations
- **Lucide React** for icons
- **Vite** for build tooling

### Backend Technologies
- **Express.js** for REST API
- **node-cron** for scheduling
- **AWS SDK** for S3 integration
- **Winston** for logging
- **Zod** for validation
- **Helmet** for security headers

### Testing & Development
- **Vitest** for unit testing
- **Playwright** for E2E testing
- **Testcontainers** for integration testing
- **ESLint & Prettier** for code quality

## 📦 Monorepo Structure

### Packages Overview

#### 1. **@playwright-orchestrator/shared** (`packages/shared/`)
**Purpose**: Shared utilities, types, and database models
**Key Features**:
- Database models and migrations
- Shared TypeScript types and interfaces
- Utility functions and constants
- Zod validation schemas
- Winston logging configuration

**Dependencies**: `pg`, `zod`, `winston`, `uuid`

#### 2. **@playwright-orchestrator/orchestrator** (`packages/orchestrator/`)
**Purpose**: REST API server and job scheduler
**Key Features**:
- REST API endpoints for test management
- Job scheduling with cron expressions
- Rate limiting and security middleware
- Webhook handling (GitHub PR, etc.)
- Health checks and monitoring

**Dependencies**: `express`, `cors`, `helmet`, `node-cron`, `@playwright-orchestrator/shared`

#### 3. **@playwright-orchestrator/job-runner** (`packages/job-runner/`)
**Purpose**: Scalable test execution workers
**Key Features**:
- Playwright test execution
- S3 trace upload and storage
- Concurrent job processing
- Environment-specific test runs
- Test timeout and error handling

**Dependencies**: `@playwright/test`, `@aws-sdk/client-s3`, `@playwright-orchestrator/shared`

#### 4. **@playwright-orchestrator/web-ui** (`packages/web-ui/`)
**Purpose**: React-based web dashboard
**Key Features**:
- Modern dashboard with real-time updates
- Test run management and monitoring
- Environment and schedule configuration
- Analytics and reporting
- Responsive design with dark/light themes

**Dependencies**: `@tanstack/react-router`, `@tanstack/react-query`, `shadcn/ui`, `recharts`

## 🎨 UI Architecture & Patterns

### Design System
- **Futuristic aesthetic** inspired by Linear and Axiom
- **Glass morphism effects** with backdrop blur
- **Gradient borders** and hover animations
- **Dark/light mode** support
- **Responsive design** for all screen sizes

### shadcn/ui Integration
**IMPORTANT**: Always refer to the [shadcn/ui documentation](https://ui.shadcn.com/) for component patterns and best practices.

**Key Patterns**:
1. **React.forwardRef** for all components
2. **Class Variance Authority (cva)** for variant management
3. **CSS variables** with `hsl(var(--css-variable))` format
4. **Proper TypeScript interfaces** extending HTML attributes
5. **Utility class merging** with `cn()` function

**Available Components**:
- `Button` - With variants (default, secondary, destructive, outline, ghost, link)
- `Card` - With CardHeader, CardContent, CardTitle, CardDescription
- `Badge` - Status indicators with color variants
- `Table` - Full-featured table with sorting and pagination
- `Dialog` - Modal dialogs with backdrop blur
- `Input`, `Select`, `Textarea` - Form components
- `Label` - Form labels with peer states
- `Separator` - Horizontal/vertical dividers
- `Avatar` - User avatars with fallback

### TanStack Router Patterns
- **File-based routing** in `src/routes/`
- **Route guards** and authentication
- **Search params** for filtering and pagination
- **Nested layouts** with `__root.tsx`
- **Type-safe navigation** with generated route types

### TanStack Query Patterns
- **Server state management** for API data
- **Automatic caching** and background updates
- **Optimistic updates** for better UX
- **Error handling** and retry logic
- **Infinite queries** for pagination

## 🏠 Main UI Areas

### 1. **Dashboard** (`/`)
- **Statistics Cards**: Total runs, success rate, failed runs, average duration
- **Test Execution Trends Chart**: Area chart with Recharts
- **Environment Status**: Real-time health indicators
- **Recent Test Runs**: List with status badges
- **Quick Actions**: Run tests, deploy, view analytics

### 2. **Test Runs** (`/runs`)
- **Runs Table**: Comprehensive table with filtering, sorting, pagination
- **Status Management**: Create, cancel, and monitor runs
- **Run Details Dialog**: Error logs, trace URLs, custom config
- **Real-time Updates**: Live status changes

### 3. **Environments** (`/environments`)
- **Environment CRUD**: Create, edit, delete environments
- **Capacity Monitoring**: Real-time utilization tracking
- **Status Indicators**: Active, full, idle states
- **Statistics Dashboard**: Total capacity and usage metrics

### 4. **Schedules** (`/schedules`)
- **Schedule Management**: Cron-based scheduling
- **Preset Templates**: Every 5 minutes, hourly, daily, weekly
- **Visual Cron Parser**: Easy-to-understand expressions
- **Custom Configuration**: JSON editor for advanced settings

### 5. **Analytics** (`/analytics`)
- **Test Execution Trends**: Time series analysis
- **Environment Performance**: Comparison charts
- **Success Rate Metrics**: KPIs and insights
- **Daily Activity**: Breakdown by time periods

### 6. **Webhooks** (`/webhooks`)
- **Endpoint Documentation**: API reference and examples
- **Integration Support**: GitHub PR, Generic, Deployment
- **Setup Instructions**: Step-by-step configuration
- **Health Monitoring**: Webhook status tracking

### 7. **Integrations** (`/integrations`)
- **Third-party Connections**: GitHub, Slack, Jenkins
- **Configuration Management**: Connection settings
- **Status Tracking**: Integration health
- **Best Practices**: Guidelines and recommendations

### 8. **System** (`/system`)
- **Health Monitoring**: Service status dashboard
- **Resource Metrics**: CPU, Memory, Disk utilization
- **Configuration Display**: System settings
- **Performance Monitoring**: Uptime and metrics

## 🔧 Common Development Tasks

### Adding New Features

#### 1. **Backend API Endpoints**
```typescript
// Add to packages/orchestrator/src/routes/
// Follow existing patterns for validation, error handling, and logging
```

#### 2. **Frontend Pages**
```typescript
// Add to packages/web-ui/src/components/
// Use existing page patterns with shadcn/ui components
// Follow TanStack Router file-based routing
```

#### 3. **Database Models**
```typescript
// Add to packages/shared/src/database/
// Include migrations and Zod schemas
```

#### 4. **UI Components**
```typescript
// Add to packages/web-ui/src/components/ui/
// Follow shadcn/ui patterns with forwardRef and cva
```

### Testing Patterns

#### 1. **Unit Tests**
```bash
# Run with Vitest
pnpm test:unit
```

#### 2. **E2E Tests**
```bash
# Run with Playwright
pnpm test:e2e
pnpm test:e2e:ui  # With UI mode
```

#### 3. **Dashboard Tests**
```bash
# Specific dashboard testing
pnpm test:e2e:dashboard
./scripts/test-dashboard.sh
```

### Development Commands

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev                    # All packages
pnpm run dev -w orchestrator
pnpm run dev -w job-runner
pnpm run dev -w web-ui

# Building
pnpm run build             # All packages
pnpm run build -w web-ui   # Specific package

# Testing
pnpm test                  # All tests
pnpm test:unit            # Unit tests only
pnpm test:e2e             # E2E tests only

# Code Quality
pnpm run lint             # ESLint
pnpm run format           # Prettier
pnpm run type-check       # TypeScript
```

## 🐳 Deployment

### Docker Compose (Recommended)
```bash
# Quick start
cp config.example.json config.json
# Edit config.json
docker-compose up -d
```

### Local Development
```bash
# Database setup
docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15-alpine
pnpm run db:migrate

# MinIO setup
docker run -d --name minio -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# Start services
pnpm run start:orchestrator
pnpm run start:job-runner
pnpm run dev -w web-ui
```

## 📊 Configuration

### Key Configuration Areas
- **Database**: PostgreSQL connection settings
- **S3 Storage**: MinIO/AWS S3 for test artifacts
- **Environments**: Test environment definitions
- **Schedules**: Cron-based test scheduling
- **Rate Limiting**: API and job execution limits

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db
DB_HOST=localhost
DB_PORT=5432

# S3 Storage
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=playwright-traces

# Services
ORCHESTRATOR_PORT=3001
WEB_UI_PORT=3000
```

## 🧪 Testing Strategy

### Test Architecture
- **Unit Tests**: Vitest for individual functions and components
- **Integration Tests**: Testcontainers for database and service testing
- **E2E Tests**: Playwright for full user workflow testing
- **Dashboard Tests**: Comprehensive UI testing with real data

### Test Data
- **Realistic scenarios** with multiple environments and test runs
- **Database seeding** with test data
- **Service orchestration** for complete system testing

## 🚀 Key Features & Capabilities

### Core Functionality
- ✅ **Test Orchestration**: Schedule and execute Playwright tests
- ✅ **Rate Limiting**: Prevent environment overload
- ✅ **Trace Storage**: Automatic S3 upload and storage
- ✅ **Web Dashboard**: Modern React-based UI
- ✅ **API & Webhooks**: REST API and CI/CD integration
- ✅ **Scalable Architecture**: Horizontal scaling with Docker
- ✅ **Real-time Monitoring**: Live status updates

### Advanced Features
- ✅ **Environment Management**: Multi-environment support
- ✅ **Schedule Management**: Cron-based test scheduling
- ✅ **Analytics & Reporting**: Test performance insights
- ✅ **Integration Support**: Webhooks and third-party tools
- ✅ **System Monitoring**: Health checks and metrics

### Planned Features (from todo.md)
- 🔄 **Issue Tracker Integration**: Jira, GitHub, Linear
- 🔄 **Advanced Analytics**: Flakiness analysis, performance trends
- 🔄 **Notifications**: Email, Slack, Discord alerts
- 🔄 **User Management**: Authentication and RBAC
- 🔄 **Advanced Visualizations**: Dependency graphs, timelines

## 📚 Additional Resources

### Documentation Files
- `README.md` - Main project documentation
- `UI_COMPONENTS_SUMMARY.md` - shadcn/ui component details
- `DASHBOARD_SUMMARY.md` - Dashboard implementation details
- `FRONTEND_SUMMARY.md` - Frontend development summary
- `todo.md` - Feature roadmap and planned enhancements

### External References
- [shadcn/ui Documentation](https://ui.shadcn.com/) - Component library patterns
- [TanStack Router Docs](https://tanstack.com/router) - Routing patterns
- [TanStack Query Docs](https://tanstack.com/query) - Data fetching patterns
- [Playwright Docs](https://playwright.dev/) - Test automation
- [Tailwind CSS Docs](https://tailwindcss.com/) - Styling patterns

## 🎯 Best Practices

### Code Organization
1. **Follow monorepo structure** with clear package boundaries
2. **Use shared types** from `@playwright-orchestrator/shared`
3. **Implement proper error handling** with Winston logging
4. **Follow shadcn/ui patterns** for all UI components
5. **Use TanStack Router** for type-safe navigation
6. **Implement comprehensive testing** at all levels

### UI Development
1. **Always refer to shadcn/ui docs** for component patterns
2. **Use CSS variables** for theming and consistency
3. **Implement responsive design** for all screen sizes
4. **Follow accessibility guidelines** with proper ARIA labels
5. **Use React Query** for efficient data fetching
6. **Implement optimistic updates** for better UX

### Backend Development
1. **Use Zod validation** for all API inputs
2. **Implement proper error handling** with structured logging
3. **Follow REST API conventions** for endpoints
4. **Use database migrations** for schema changes
5. **Implement health checks** for monitoring
6. **Use environment-specific configuration**

This repository represents a comprehensive, production-ready test orchestration platform with modern web technologies and best practices throughout.
