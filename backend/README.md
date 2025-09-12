# Ticketing System Backend API

A robust backend API for a help desk ticketing system built with Node.js, Express, TypeScript, Prisma, and PostgreSQL.

## 🚀 Features

- **User Management**: Authentication, authorization, and role-based access control
- **Ticket Management**: Create, read, update, and delete support tickets
- **Comment System**: Add comments to tickets with internal/external visibility
- **File Attachments**: Upload and manage file attachments for tickets and comments
- **Knowledge Base**: Create and manage help articles
- **Search**: Global search across tickets, knowledge base, and users
- **Real-time Ready**: Designed for easy WebSocket integration later

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Security**: Helmet, CORS, bcryptjs

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

## 🚀 Quick Start

### 1. Clone and Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/ticketing_db"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database with sample data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `GET /api/users/agents/list` - Get support agents

### Tickets
- `GET /api/tickets` - Get all tickets with filtering
- `GET /api/tickets/:id` - Get ticket by ID
- `POST /api/tickets` - Create new ticket
- `PUT /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket (admin only)
- `GET /api/tickets/stats/overview` - Get ticket statistics

### Comments
- `GET /api/comments/ticket/:ticketId` - Get comments for a ticket
- `POST /api/comments` - Create new comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Attachments
- `POST /api/attachments/upload` - Upload file attachment
- `GET /api/attachments/:id` - Get attachment info
- `GET /api/attachments/:id/download` - Download attachment
- `DELETE /api/attachments/:id` - Delete attachment

### Knowledge Base
- `GET /api/knowledge` - Get all articles
- `GET /api/knowledge/:id` - Get article by ID
- `POST /api/knowledge` - Create new article (agents only)
- `PUT /api/knowledge/:id` - Update article
- `DELETE /api/knowledge/:id` - Delete article
- `POST /api/knowledge/:id/helpful` - Mark article as helpful
- `GET /api/knowledge/categories/list` - Get article categories

### Search
- `GET /api/search` - Global search
- `GET /api/search/suggestions` - Search suggestions (autocomplete)
- `GET /api/search/stats` - Search statistics

## 🔐 Authentication & Authorization

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles

- **admin**: Full access to all endpoints
- **support_agent**: Can manage tickets, comments, and knowledge base
- **user**: Can create tickets and view assigned tickets

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/     # Route handlers
│   ├── services/        # Business logic
│   ├── models/          # Data models
│   ├── middleware/      # Auth, validation, etc.
│   ├── routes/          # API routes
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Helper functions
│   └── scripts/         # Database scripts
├── prisma/              # Database schema & migrations
├── uploads/             # File upload directory
├── package.json
├── tsconfig.json
└── README.md
```

## 🗄️ Database Schema

The system includes the following main entities:

- **Users**: System users with roles and permissions
- **Tickets**: Support tickets with status, priority, and assignment
- **Comments**: Ticket comments with internal/external visibility
- **Attachments**: File attachments for tickets and comments
- **Knowledge Base**: Help articles organized by category
- **Tasks**: Subtasks associated with tickets
- **Events**: Ticket lifecycle events and reminders

## 🚀 Development

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes to database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database with sample data
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | `30d` |
| `SESSION_IDLE_TIMEOUT` | User idle timeout before session expires | `30m` |
| `SESSION_ABSOLUTE_TIMEOUT` | Maximum session duration | `8h` |
| `MAX_FILE_SIZE` | Maximum file upload size | `10485760` (10MB) |
| `UPLOAD_PATH` | File upload directory | `./uploads` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Session Management**: Automatic session expiry with idle timeout detection
- **Password Hashing**: Bcrypt password hashing
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet**: Security headers middleware
- **Input Validation**: Request validation and sanitization
- **Role-based Access Control**: Granular permission system

## ⏰ Session Management

The system includes comprehensive session management with automatic expiry:

### Session Timeouts
- **Idle Timeout**: Users are logged out after 30 minutes of inactivity (configurable)
- **Absolute Timeout**: Maximum session duration of 8 hours (configurable)
- **Warning System**: Users receive a warning 5 minutes before idle timeout

### Features
- **Activity Detection**: Tracks mouse, keyboard, scroll, and touch events
- **Automatic Refresh**: Sessions are refreshed every 5 minutes during activity
- **Warning Dialog**: Interactive dialog allows users to extend their session
- **Graceful Logout**: Automatic logout with user notification

### Configuration
Set these environment variables to customize session behavior:
```bash
SESSION_IDLE_TIMEOUT=30m    # Time before idle timeout (30m, 1h, 2h, etc.)
SESSION_ABSOLUTE_TIMEOUT=8h # Maximum session duration (8h, 1d, etc.)
```

## 📊 Sample Data

The seed script creates:

- **Admin user**: `admin@company.com` / `admin123`
- **Support agents**: `john.support@company.com` / `agent123`
- **Regular users**: `alice.user@company.com` / `user123`
- **Sample tickets**: Hardware, software, and network issues
- **Knowledge base articles**: Common help topics

## 🔮 Future Enhancements

- **Real-time Chat**: WebSocket integration for live support
- **Email Notifications**: Automated email alerts
- **SLA Management**: Service level agreement tracking
- **Reporting**: Advanced analytics and reporting
- **Mobile API**: Mobile-optimized endpoints
- **Redis Integration**: Caching and session management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions, please create an issue in the repository or contact the development team.
