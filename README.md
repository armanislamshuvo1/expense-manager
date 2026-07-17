# NexusWealth 💼📈

NexusWealth is a highly polished, modern MERN-stack wealth and expense manager designed to streamline personal finance tracking. Built with visual excellence, responsive custom elements, and real-time state synchronization, NexusWealth helps users gain complete control of their financial accounts, transaction categories, and wealth distribution.

## ✨ Key Features

- **📊 Comprehensive Financial Dashboard:** Dynamic charts powered by `recharts` visualizing monthly income vs. expenses, category breakdown, and total balance.
- **🤖 AI-Powered Assistant (WealthBuddy):** Chat with an AI advisor powered by Google Gemini SDK for personalized budgeting tips, receipt scanning/OCR processing, and weekly digests.
- **🔌 Local-First Caching & Offline Sync:** Keep working offline with a local-first queueing mechanism ([syncManager.js](file:///g:/project/expense%20manager/frontend/src/utils/syncManager.js)) that caches transaction operations and auto-syncs when online.
- **🔗 Shared Dashboards (Multiplayer View):** Share dashboard configurations and views with partners or family members using secure shared links.
- **🔢 Custom Virtual Keypad:** Optimized for mobile-first entries, ensuring super fast expense/income logging across all devices.
- **🏦 Account & Category Management:** Create and manage multiple accounts (Cash, Bank, Credit Card, etc.) and customize income/expense categories.
- **🔍 Advanced Transaction Ledger:** Sort, filter, and paginate transactions with inline state management.
- **🛡️ Advanced Security & Rate Limiting:** IP-based rate limiting on sensitive auth, AI, and sync endpoints using `express-rate-limit` with proper proxy trust setup.
- **🌗 Responsive Dark/Light Modes:** Fluid, accessible CSS variables providing full theme customizability (powered by Tailwind CSS v4, DaisyUI v5, and a custom React Theme Context).

---

## 🛠️ Technology Stack

### Frontend
- **React 19** & **Vite** (Next-gen bundling and HMR)
- **Tailwind CSS v4** & **DaisyUI v5** (Premium glassmorphic, modern aesthetics)
- **React Router DOM v7** (Declarative client-side routing)
- **TanStack React Query (v5)** (Optimized server-state management & cache invalidation)
- **Recharts** (Interactive data visualization)
- **SweetAlert2** (Polished notifications and confirm dialogs)

### Backend
- **Node.js** & **Express**
- **Google Gemini SDK** (AI capabilities & OCR receipt processing)
- **Express Rate Limit** (API security and request throttling)
- **MongoDB** & **Mongoose** (Robust object data modeling & multi-document transactions)
- **JSON Web Tokens (JWT)** & **BcryptJS** (Secure local auth)

---

## 📂 Repository Structure

```
├── backend/            # Express.js REST API
│   ├── config/         # Database connections & environment setup
│   ├── controllers/    # Request handlers & logic
│   ├── middleware/     # Rate limiter, auth filters, and error handlers
│   ├── models/         # Mongoose Schemas (User, Account, Category, Transaction)
│   ├── routes/         # Express Router mapping (Auth, Accounts, Transactions, etc.)
│   └── index.js        # Entry point
│
└── frontend/           # React 19 client application
    ├── src/
    │   ├── components/ # Reusable UI (CustomKeypad, DateTimePickerModal, BottomNav)
    │   ├── context/    # Global State Contexts (AuthContext, ThemeContext)
    │   ├── hooks/      # Custom hooks for state queries
    │   ├── pages/      # Router Pages (Dashboard, SharedDashboard, Transactions, Profile)
    │   ├── utils/      # SyncManager, apiConfig, and helpers
    │   └── main.jsx    # Entry point
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas URI or local MongoDB instance
- Gemini API Key (for WealthBuddy AI functionality)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/nexuswealth.git
   cd nexuswealth
   ```

2. **Backend Setup**
   ```bash
   cd backend
   # Create a .env file and configure the variables:
   # PORT=5000
   # MONGO_URI=mongodb://localhost:27017/nexuswealth
   # JWT_SECRET=your_jwt_secret_here
   # GEMINI_API_KEY=your_gemini_api_key_here
   # TRUST_PROXY=true (if deploying behind a proxy like Render)
   
   npm install
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   # Create a .env file and configure the variables:
   # VITE_API_URL=http://localhost:5000/api
   
   npm install
   npm run dev
   ```

---

## ⚙️ Core Database Seeding & Workflows

To facilitate smooth user onboarding, the backend includes an automated checking and seeding workflow in [seedExisting.js](file:///g:/project/expense%20manager/backend/seedExisting.js):
- **Default Accounts:** Instantly provisions three customizable accounts (`Cash`, `Bank Account`, `Card`) for every registered user.
- **Dynamic Categories:** Auto-generates structured categories populated with distinctive emojis (e.g., Salary 💰, Shopping 🛍️, Travel ✈️) for localized income and expense sorting.

---

## ⚡ API Endpoints Quick Reference

| Endpoint Prefix | Description | Key Controller Operations |
|---|---|---|
| `/api/auth` | User Security | Local signup/login, Google authentication integration |
| `/api/accounts` | Balance Ledger | Create, update, view, and delete payment channels |
| `/api/categories` | Custom Budget Items | Manage custom category types, colors, and emojis |
| `/api/transactions` | Core Bookkeeping | Advanced query filters, date-time selection, custom numeric inputs |
| `/api/sync` | Offline Bookkeeping Sync | Batch sync transaction queue with backend integrity protection |
| `/api/ai` | AI Financial Advisors | OCR receipt scan, dynamic chat advisory, and weekly digests |
| `/api/share` | Collaborative Views | Generates cryptographically secure links for sharing real-time dashboards |

---

## 🌐 Deployment & CI/CD Configuration

### Continuous Deployment (Render Auto-Deploy)
The project includes a GitHub Actions CI/CD workflow at [.github/workflows/deploy.yml](file:///g:/project/expense%20manager/.github/workflows/deploy.yml) that triggers automated deployments to Render on every push to the `master` branch.

### Backend Deployment (Render)
NexusWealth is designed for zero-config deployment on Render. The configuration is specified in the root [render.yaml](file:///g:/project/expense%20manager/render.yaml):
- **Service Name:** `nexuswealth-backend`
- **Build Command:** `npm install`
- **Start Command:** `node index.js`
- **Environment Variables:** `PORT`, `MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `NODE_ENV=production`

### Frontend Deployment (Vercel)
The React client is fully compatible with Vercel routing structures. The [vercel.json](file:///g:/project/expense%20manager/frontend/vercel.json) at the frontend root enables seamless SPA history routing:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 🔒 License
This project is licensed under the ISC License.
