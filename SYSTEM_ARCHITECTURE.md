# LTO Website System Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           LTO WEBSITE SYSTEM ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐                    ┌─────────────┐
│   ADMIN     │                    │  EMPLOYEE   │
│ (Superadmin │                    │             │
│    Admin)   │                    │             │
└──────┬──────┘                    └──────┬──────┘
       │                                   │
       │  Manage Vehicles                  │  View Dashboard
       │  Manage Drivers                   │  View Reports
       │  Manage Violations                │  View Analytics
       │  Manage Accidents                 │  View Predictions
       │  View Analytics                   │
       │  Manage Users                     │
       │                                   │
       └──────────────┬────────────────────┘
                      │
                      ▼
            ┌─────────────────┐
            │    BROWSER      │
            │  (Chrome, Edge, │
            │   Firefox, etc) │
            └────────┬────────┘
                     │
                     │ HTTP/HTTPS
                     │
                     ▼
            ┌─────────────────┐
            │    INTERNET     │
            │      (Cloud)    │
            └────────┬────────┘
                     │
                     │ HTTP/HTTPS Requests
                     │
                     ▼
        ┌────────────────────────────┐
        │      NGINX WEB SERVER      │
        │   (Reverse Proxy Server)   │
        │   Port 80 (HTTP)           │
        └────────┬───────────────────┘
                 │
                 ├─────────────────────────────┬─────────────────────────────┐
                 │                             │                             │
                 ▼                             ▼                             ▼
    ┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
    │   REACT FRONTEND     │    │  NODE.JS/EXPRESS API  │    │  FLASK ML SERVICES   │
    │   (Vite Build)       │    │  (Backend Server)     │    │                      │
    │                      │    │  Port 5000            │    │  • MV Prediction API│
    │  • Dashboard         │    │                       │    │    (Port 5002)       │
    │  • Vehicle Mgmt      │    │  Routes:              │    │                      │
    │  • Driver Mgmt       │    │  • /api/auth          │    │  • Accident Pred API │
    │  • Violation Mgmt    │    │  • /api/vehicle       │    │    (Port 5004)       │
    │  • Accident Mgmt     │    │  • /api/owner         │    │                      │
    │  • Analytics         │    │  • /api/violations    │    │  • SARIMA Models     │
    │  • Predictions       │    │  • /api/accident      │    │  • Random Forest     │
    │  • User Management   │    │  • /api/dashboard     │    │    Models            │
    │                      │    │  • /api/user          │    │                      │
    │  Static Files:       │    │  • /api/logs          │    │  Endpoints:          │
    │  /index.html         │    │  • /api/account       │    │  • /mv-prediction-api│
    │  /assets/*           │    │                       │    │  • /accident-        │
    │                      │    │  Middleware:          │    │    prediction-api    │
    │  Response:           │    │  • Authentication     │    │                      │
    │  Web Content         │    │  • Authorization      │    │  Response:           │
    │  (HTML/CSS/JS)       │    │  • Validation         │    │  Predictions         │
    │                      │    │                       │    │  Analytics Data     │
    │                      │    │  Controllers:          │    │                      │
    │                      │    │  • VehicleController   │    │                      │
    │                      │    │  • OwnerController     │    │                      │
    │                      │    │  • ViolationController │    │                      │
    │                      │    │  • AccidentController  │    │                      │
    │                      │    │  • UserController      │    │                      │
    │                      │    │  • DashboardController │    │                      │
    │                      │    │                       │    │                      │
    │                      │    │  Services:            │    │                      │
    │                      │    │  • Email Service      │    │                      │
    │                      │    │  • OTP Service        │    │                      │
    │                      │    │  • Logger Service     │    │                      │
    │                      │    │  • Scheduler Service  │    │                      │
    │                      │    │                       │    │                      │
    │                      │    │  Response:            │    │                      │
    │                      │    │  JSON Data            │    │                      │
    │                      │    │  File Uploads         │    │                      │
    │                      │    │  Avatar Images        │    │                      │
    │                      │    │                       │    │                      │
    │                      │    │                       │    │                      │
    │                      │    └───────────┬───────────┘    │                      │
    │                      │                │                 │                      │
    │                      │                │                 │                      │
    │                      │                │ Request for Data│                      │
    │                      │                │                 │                      │
    │                      │                ▼                 │                      │
    │                      │    ┌───────────────────────────┐│                      │
    │                      │    │      MONGODB DATABASE      ││                      │
    │                      │    │                           ││                      │
    │                      │    │  Collections:             ││                      │
    │                      │    │  • users                  ││                      │
    │                      │    │  • vehicles               ││                      │
    │                      │    │  • owners                 ││                      │
    │                      │    │  • violations             ││                      │
    │                      │    │  • accidents              ││                      │
    │                      │    │  • userlogs               ││                      │
    │                      │    │  • driverlogs             ││                      │
    │                      │    │  • predictions            ││                      │
    │                      │    │                           ││                      │
    │                      │    │  Response:                ││                      │
    │                      │    │  Data (JSON Documents)    ││                      │
    │                      │    │                           ││                      │
    │                      │    └───────────────────────────┘│                      │
    │                      │                                 │                      │
    │                      │                                 │                      │
    │                      └─────────────────────────────────┴──────────────────────┘
    │                                                          │
    │                                                          │
    │                                                          │ (Optional: ML Services
    │                                                          │  may also query MongoDB
    │                                                          │  for training data)
    │                                                          │
    │                                                          ▼
    │                                              ┌───────────────────────────┐
    │                                              │      MONGODB DATABASE     │
    │                                              │    (Shared with Backend)  │
    │                                              └───────────────────────────┘
```

## Component Descriptions

### 1. Users
- **ADMIN (Superadmin/Admin)**: Full system access including user management, vehicle/driver management, violations, accidents, analytics, and predictions
- **EMPLOYEE**: Limited access to view dashboard, reports, analytics, and predictions

### 2. Browser
- Web browsers (Chrome, Edge, Firefox, etc.) used to access the LTO Website
- Sends HTTP/HTTPS requests to the web server
- Receives and renders web content (HTML, CSS, JavaScript)

### 3. Internet
- Network infrastructure connecting users to the web server
- Handles HTTP/HTTPS traffic between client and server

### 4. NGINX Web Server
- **Role**: Reverse proxy server that routes requests to appropriate backend services
- **Port**: 80 (HTTP)
- **Functions**:
  - Serves static frontend files (React build)
  - Proxies API requests to Node.js backend (port 5000)
  - Proxies ML API requests to Flask services (ports 5002, 5004)
  - Serves uploaded files (avatars, documents)
  - Handles SSL/TLS termination (in production)

### 5. React Frontend (Vite Build)
- **Technology**: React with Vite build tool
- **Location**: `/frontend/dist` (production build)
- **Features**:
  - Dashboard with KPIs and charts
  - Vehicle management interface
  - Driver/Owner management
  - Violation management
  - Accident management
  - Analytics and visualization
  - Predictive analytics views
  - User account management
- **Response**: Serves HTML, CSS, JavaScript files

### 6. Node.js/Express API (Backend Server)
- **Technology**: Node.js with Express framework
- **Port**: 5000
- **API Routes**:
  - `/api/auth` - Authentication (login, register, OTP)
  - `/api/vehicle` - Vehicle CRUD operations
  - `/api/owner` - Driver/Owner management
  - `/api/violations` - Violation management
  - `/api/accident` - Accident records
  - `/api/dashboard` - Dashboard statistics
  - `/api/user` - User management
  - `/api/logs` - Activity logs
  - `/api/account` - Account management
- **Middleware**:
  - Authentication (JWT tokens)
  - Authorization (role-based access)
  - Validation (request validation)
- **Controllers**: Handle business logic for each route
- **Services**:
  - Email service (Nodemailer)
  - OTP service (password reset, verification)
  - Logger service (user activity tracking)
  - Scheduler service (automated tasks)
- **Response**: JSON data, file uploads, avatar images

### 7. Flask ML Services
- **Technology**: Python Flask applications
- **Services**:
  - **MV Prediction API** (Port 5002)
    - SARIMA models for vehicle registration predictions
    - Time series forecasting
    - Endpoint: `/mv-prediction-api`
  - **Accident Prediction API** (Port 5004)
    - Random Forest regression models
    - Accident count predictions per barangay
    - Endpoint: `/accident-prediction-api`
- **Response**: Predictions, analytics data

### 8. MongoDB Database
- **Technology**: MongoDB (NoSQL database)
- **Collections**:
  - `users` - User accounts (Superadmin, Admin, Employee)
  - `vehicles` - Vehicle registration data
  - `owners` - Driver/Owner information
  - `violations` - Traffic violation records
  - `accidents` - Accident records
  - `userlogs` - User activity logs
  - `driverlogs` - Driver activity logs
  - `predictions` - ML prediction results
- **Response**: JSON documents (data)

## Data Flow

### 1. User Authentication Flow
```
ADMIN/EMPLOYEE → Browser → Internet → NGINX → Node.js API → MongoDB
                                                      ↓
                                              JWT Token Response
                                                      ↓
Browser ← Internet ← NGINX ← Node.js API
```

### 2. Dashboard Data Flow
```
ADMIN/EMPLOYEE → Browser → Internet → NGINX → Node.js API → MongoDB
                                                      ↓
                                              Statistics Data
                                                      ↓
Browser ← Internet ← NGINX ← Node.js API (JSON)
```

### 3. Prediction Request Flow
```
ADMIN/EMPLOYEE → Browser → Internet → NGINX → Flask ML API → MongoDB (optional)
                                                      ↓
                                              Prediction Results
                                                      ↓
Browser ← Internet ← NGINX ← Flask ML API (JSON)
```

### 4. File Upload Flow (Avatars)
```
ADMIN/EMPLOYEE → Browser → Internet → NGINX → Node.js API → File System (/uploads)
                                                      ↓
                                              File URL Response
                                                      ↓
Browser ← Internet ← NGINX ← Node.js API
```

## Security Features

1. **Authentication**: JWT token-based authentication
2. **Authorization**: Role-based access control (Superadmin, Admin, Employee)
3. **Validation**: Input validation on all API endpoints
4. **HTTPS**: SSL/TLS encryption in production
5. **CORS**: Cross-origin resource sharing configuration
6. **Rate Limiting**: Protection against abuse
7. **File Upload Security**: Size limits and type validation

## Deployment Architecture

- **Web Server**: NGINX (reverse proxy)
- **Process Manager**: PM2 (for Node.js backend)
- **Backend**: Node.js/Express (port 5000)
- **ML Services**: Flask (ports 5002, 5004)
- **Database**: MongoDB (remote or local)
- **Static Files**: Served by NGINX from `/frontend/dist`
- **Uploads**: Served by NGINX from `/backend/uploads`

## Technology Stack

### Frontend
- React
- Vite
- Tailwind CSS
- Recharts (for charts)
- Axios (HTTP client)

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT (authentication)
- Bcrypt (password hashing)
- Nodemailer (email service)

### ML Services
- Python
- Flask
- Scikit-learn
- Pandas
- NumPy
- Statsmodels (SARIMA)

### Infrastructure
- NGINX (web server)
- PM2 (process manager)
- MongoDB (database)





