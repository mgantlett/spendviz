import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import AccountsList from './components/AccountsList'
import CsvImport from './components/CsvImport'
import TransactionsList from './components/TransactionsList'
import CategoriesManager from './components/CategoriesManager'
import Reports from './components/Reports'
import { ThemeToggleButton } from './components/ui/ThemeToggleButton'
import Sidebar from './components/Sidebar'
import BackupRestorePanel from './components/BackupRestorePanel'
import { DarkModeDebug } from './components/debug/DarkModeDebug'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AuthPage } from './components/auth/AuthPage'
import { UserMenu } from './components/auth/UserMenu'

function AuthenticatedApp() {
	return (
		<div className="flex h-screen bg-background text-foreground font-sans">
			{/* Sidebar */}
			<Sidebar />
			
			{/* Main Content */}
			<div className="flex-1 flex flex-col h-screen">
				<div className="flex-none flex flex-wrap justify-between gap-3 p-4">
					{/* Page Title */}
					<Routes>
						<Route path="/" element={<Navigate to="/reports" replace />} />
						<Route path="/accounts" element={<h1 className="tracking-light text-[32px] font-bold leading-tight min-w-72 text-foreground">Accounts</h1>} />
						<Route path="/transactions" element={<h1 className="tracking-light text-[32px] font-bold leading-tight min-w-72 text-foreground">Transactions</h1>} />
						<Route path="/import" element={<h1 className="tracking-light text-[32px] font-bold leading-tight min-w-72 text-foreground">Import Data</h1>} />
						<Route path="/categories" element={<h1 className="tracking-light text-[32px] font-bold leading-tight min-w-72 text-foreground">Categories</h1>} />
						<Route path="/reports" element={<h1 className="tracking-light text-[32px] font-bold leading-tight min-w-72 text-foreground">Dashboard</h1>} />
						<Route path="/settings/backup" element={<h1 className="tracking-light text-[32px] font-bold leading-tight min-w-72 text-foreground">Backup and Restore</h1>} />
						<Route path="*" element={<Navigate to="/reports" replace />} />
					</Routes>
					
					{/* Controls */}
					<div className="flex items-center gap-2">
						<UserMenu />
						<ThemeToggleButton />
						<DarkModeDebug />
					</div>
				</div>
				
				<div className="flex-1 overflow-y-auto px-4 pb-3">
					<div className="min-h-full flex rounded border border-border bg-background">
						<div className="flex-1 p-4">
							<Routes>
								<Route path="/" element={<Navigate to="/reports" replace />} />
								<Route path="/accounts" element={<AccountsList />} />
								<Route path="/transactions" element={<TransactionsList />} />
								<Route path="/import" element={<CsvImport />} />
								<Route path="/categories" element={<CategoriesManager />} />
								<Route path="/reports" element={<Reports />} />
								<Route path="/settings/backup" element={<BackupRestorePanel />} />
								<Route path="*" element={<Navigate to="/reports" replace />} />
							</Routes>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function AppContent() {
	const { isAuthenticated, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
					<p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <AuthPage />;
	}

	return <AuthenticatedApp />;
}

function App() {
  // Initialize theme from localStorage or system preference
  React.useEffect(() => {
    // This effect runs once when the app mounts
    const theme = localStorage.getItem("theme") ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);

	return (
		<AuthProvider>
			<Router>
				<AppContent />
			</Router>
		</AuthProvider>
	);
}

export default App
