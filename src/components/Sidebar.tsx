import React from 'react';
import { NavLink } from 'react-router-dom';
import AIPoweredBrand from './ui/AIPoweredBrand';

const navItems = [
	{
		label: "Dashboard",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
			height="24"
				fill="currentColor"
				viewBox="0 0 256 256"
			>
				<path d="M216,40H136V24a8,8,0,0,0-16,0V40H40A16,16,0,0,0,24,56V176a16,16,0,0,0,16,16H79.36L57.75,219a8,8,0,0,0,12.5,10l29.59-37h56.32l29.59,37a8,8,0,1,0,12.5-10l-21.61-27H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,136H40V56H216V176ZM104,120v24a8,8,0,0,1-16,0V120a8,8,0,0,1,16,0Zm32-16v40a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm32-16v56a8,8,0,0,1-16,0V88a8,8,0,0,1,16,0Z" />
			</svg>
		),
		to: "/reports",
	},
	// {
	// 	label: "Dashboard",
	// 	icon: (
	// 		<svg
	// 			xmlns="http://www.w3.org/2000/svg"
	// 			width="24"
	// 			height="24"
	// 			fill="currentColor"
	// 			viewBox="0 0 256 256"
	// 		>
	// 			<path d="M218.83,103.77l-80-75.48a1.14,1.14,0,0,1-.11-.11,16,16,0,0,0-21.53,0l-.11.11L37.17,103.77A16,16,0,0,0,32,115.55V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V160h32v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V115.55A16,16,0,0,0,218.83,103.77ZM208,208H160V160a16,16,0,0,0-16-16H112a16,16,0,0,0-16,16v48H48V115.55l.11-.1L128,40l79.9,75.43.11.1Z" />
	// 		</svg>
	// 	),
	// 	to: "/reports",
	// },
	{
		label: "Accounts",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
			height="24"
				fill="currentColor"
				viewBox="0 0 256 256"
			>
				<path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,16V88H32V64Zm0,128H32V104H224v88Zm-16-24a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h32A8,8,0,0,1,208,168Zm-64,0a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h16A8,8,0,0,1,144,168Z" />
			</svg>
		),
		to: "/accounts",
	},
	{
		label: "Import Data",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
			height="24"
				fill="currentColor"
				viewBox="0 0 256 256"
			>
				<path d="M205.66,149.66l-72,72a8,8,0,0,1-11.32,0l-72-72a8,8,0,0,1,11.32-11.32L120,196.69V40a8,8,0,0,1,16,0V196.69l58.34-58.35a8,8,0,0,1,11.32,11.32Z" />
			</svg>
		),
		to: "/import",
	},
	{
		label: "Categories",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
			height="24"
				fill="currentColor"
				viewBox="0 0 256 256"
			>
				<path d="M243.31,136,144,36.69A15.86,15.86,0,0,0,132.69,32H40a8,8,0,0,0-8,8v92.69A15.86,15.86,0,0,0,36.69,144L136,243.31a16,16,0,0,0,22.63,0l84.68-84.68a16,16,0,0,0,0-22.63Zm-96,96L48,132.69V48h84.69L232,147.31ZM96,84A12,12,0,1,1,84,72,12,12,0,0,1,96,84Z" />
			</svg>
		),
		to: "/categories",
	},
	{
		label: "Transactions",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
			height="24"
				fill="currentColor"
				viewBox="0 0 256 256"
			>
				<path d="M56,128a16,16,0,1,1-16-16A16,16,0,0,1,56,128ZM40,48A16,16,0,1,0,56,64,16,16,0,0,0,40,48Zm0,128a16,16,0,1,0,16,16A16,16,0,0,0,40,176Zm176-64H88a8,8,0,0,0-8,8v16a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8V120A8,8,0,0,0,216,112Zm0-64H88a8,8,0,0,0-8,8V72a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8V56A8,8,0,0,0,216,48Zm0,128H88a8,8,0,0,0-8,8v16a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8V184A8,8,0,0,0,216,176Z" />
			</svg>
		),
		to: "/transactions",
	},
	{
		label: "Backup & Restore",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				fill="currentColor"
				viewBox="0 0 256 256"
			>
				<path d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88Zm40-88a8 8 0 0 1-8 8H136v32a8 8 0 0 1-16 0v-32H96a8 8 0 0 1 0-16h24V88a8 8 0 0 1 16 0v32h24a8 8 0 0 1 8 8Z" />
			</svg>
		),
		to: "/settings/backup",
	},
];

export default function Sidebar() {
	return (
		<aside className="w-56 flex-shrink-0 flex flex-col h-screen border-r border-border">
			{/* Brand Header */}
			<div className="p-4 border-b border-border">
				<AIPoweredBrand />
			</div>

			{/* Navigation Links */}
			<nav className="flex-1 overflow-y-auto py-4">
				<div className="space-y-2 px-2">
					{navItems.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							className={({ isActive }) =>
								`flex items-center space-x-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive 
                  ? 'bg-primary/10 text-primary shadow-sm' 
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`
							}
						>
							<span className="w-5 h-5">{item.icon}</span>
							<span>{item.label}</span>
						</NavLink>
					))}
				</div>
			</nav>

			{/* Bottom Section - App Version */}
			<div className="flex-shrink-0 p-4 border-t border-border">
				<div className="flex flex-col space-y-1">
					<div className="text-xs text-muted-foreground text-center">
						v1.0.0
					</div>
				</div>
			</div>
		</aside>
	);
}
