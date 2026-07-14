# NexusWealth 💼📈

NexusWealth is a highly polished, modern MERN-stack wealth and expense manager designed to streamline personal finance tracking. Built with visual excellence, responsive custom elements, and real-time state synchronization, NexusWealth helps users gain complete control of their financial accounts, transaction categories, and wealth distribution.

## ✨ Key Features

- **📊 Comprehensive Financial Dashboard:** Dynamic charts powered by `recharts` visualizing monthly income vs. expenses, category breakdown, and total balance.
- **🔗 Shared Dashboards (Multiplayer View):** Share dashboard configurations and views with partners or family members using secure shared links.
- **🔢 Custom Virtual Keypad:** Optimized for mobile-first entries, ensuring super fast expense/income logging across all devices.
- **🏦 Account & Category Management:** Create and manage multiple accounts (Cash, Bank, Credit Card, etc.) and customize income/expense categories.
- **🔍 Advanced Transaction Ledger:** Sort, filter, and paginate transactions with inline state management.
- **🌗 Responsive Dark/Light Modes:** Fluid, accessible CSS variables providing full theme customizability (powered by Tailwind CSS v4, DaisyUI v5, and a custom React Theme Context).
- **⚡ Performance-Driven Architecture:** Minimal refetching delays using state cache optimization through `@tanstack/react-query`.

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
- **MongoDB** & **Mongoose** (Robust object data modeling)
- **JSON Web Tokens (JWT)** & **BcryptJS** (Secure local auth)
- **Google Auth Library** (Third-party SSO integration support)

---

## 📂 Repository Structure

```
├── backend/            # Express.js REST API
│   ├── config/         # Database connections & environment setup
│   ├── controllers/    # Request handlers & logic
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
    │   └── main.jsx    # Entry point
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas URI or local MongoDB instance

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

## 🔒 License
This project is licensed under the ISC License.
