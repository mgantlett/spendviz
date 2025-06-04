import React from 'react';
import SpendingByCategoryPieChart from './SpendingByCategoryPieChart';
import SpendingByCategoryBarChart from './SpendingByCategoryBarChart';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

export default function Reports() {
	const [tab, setTab] = React.useState('pie');
	return (
		<div className="max-w-6xl mx-auto p-4">
			<Tabs value={tab} onValueChange={setTab} className="mb-6">
				<TabsList>
					<TabsTrigger value="pie">Pie Chart</TabsTrigger>
					<TabsTrigger value="bar">Bar Chart</TabsTrigger>
				</TabsList>
				<TabsContent value="pie">
					<div className="p-4 flex flex-col md:flex-row gap-8 items-center justify-center border rounded bg-muted min-h-[420px] w-[604px]">
						<SpendingByCategoryPieChart />
					</div>
				</TabsContent>
				<TabsContent value="bar">
					<div className="p-4 border rounded bg-muted">
						<SpendingByCategoryBarChart />
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
