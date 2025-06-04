# SpendViz: Personal Finance Web App

SpendViz is a modern, browser-based personal finance application for tracking accounts, importing transactions, categorizing spending, and visualizing your net worth over time.

## Features
- **Account Management:** Add, edit, and delete financial accounts.
- **CSV Import:** Import transactions from bank CSVs with flexible column mapping, date format, and debit/credit logic. Duplicate detection and mapping presets per account.
- **Transaction Management:** View, filter, sort, add, edit, and delete transactions.
- **Categories & Rules:** Organize spending with customizable categories and powerful categorization rules. Resolve rule conflicts interactively.
- **Charts & Dashboard:** Visualize your spending by category using pie charts and track spending by category over time (Recharts).
- **Data Storage:** All data is stored locally in SQLite (via better-sqlite3).
- **Backup/Restore:** App-managed database backups and restore options.

## Tech Stack
- **Frontend:** React (TypeScript), Tailwind CSS, Zustand (state), Recharts (charts)
- **Backend:** Node.js (TypeScript), Express, better-sqlite3, papaparse
- **Build Tool:** Vite
- **Testing:** Jest, Playwright

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation
```bash
npm install
```

### Running the App (Dev Mode)
```bash
# Start backend (API server)
npm run backend
# In a separate terminal, start frontend (Vite dev server)
npm run frontend
```
Or run both together:
```bash
npm run start:all
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5174

### Demo Data Setup
For new installations, you can quickly set up a demo user with pre-populated test data.

1.  **Clean Database (Optional but Recommended)**: If you have an existing database, this will remove it for a fresh start.
    ```bash
    npm run clean-db
    ```
2.  **Generate Test Data**: This creates `backend/data/generated_test_data.json` based on the static seed data.
    ```bash
    npm run generate-demo-data
    ```
3.  **Setup Demo User**: This creates a demo user (`demo@spendviz.app` / `demo1234`) and imports the generated test data into the database.
    ```bash
    npm run setup-demo-user
    ```
    Alternatively, you can run all three steps with a single command:
    ```bash
    npm run init-demo-env
    ```
    After running this, you can log in with the demo credentials.

### Build for Production
```bash
npm run build
```

## Project Structure
- `src/` — React frontend (components, store, utils)
- `backend/` — Node.js/Express backend (API, database logic, middleware, utilities)
- `backend/data/` — Static seed data and generated test data for demo setup
- `spendviz.sqlite3` — Local database file (ignored by Git)

## Linting & Formatting
- ESLint and Prettier are configured for TypeScript strict mode and React best practices.
- Run lint checks:
```bash
npm run lint
```

## Testing
- Unit tests: `npm test`
- E2E tests: `npm run e2e`

## Contributing
Pull requests and issues are welcome! Please follow the code style and add tests for new features.

## License
MIT
