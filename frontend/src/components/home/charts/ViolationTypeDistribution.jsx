"use client";

import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from "recharts";

/**
 * Violation Type Distribution - Pie/Donut Chart
 * Props:
 * - data: { type: string; count: number }[]
 * - colors?: string[]
 */
const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981", "#06b6d4"];

const ViolationTypeDistribution = ({ data = [], colors = COLORS }) => {
	// Expect data as [{ type: 'Alarm'|'Confiscated'|'Impounded', value: number }, ...]
	const [isDarkMode, setIsDarkMode] = useState(false);

	useEffect(() => {
		const checkTheme = () => {
			if (typeof document === "undefined") return;
			const root = document.documentElement;
			const prefersDark =
				window.matchMedia &&
				window.matchMedia("(prefers-color-scheme: dark)").matches;
			setIsDarkMode(root.classList.contains("dark") || prefersDark);
		};

		checkTheme();

		if (typeof MutationObserver !== "undefined") {
			const observer = new MutationObserver(checkTheme);
			observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["class"],
			});
			return () => observer.disconnect();
		}
	}, []);

	const tooltipBg = isDarkMode ? "#111827" : "#ffffff";
	const tooltipBorder = isDarkMode ? "#374151" : "#e5e7eb";
	const tooltipColor = isDarkMode ? "#f9fafb" : "#111827";
	const centerLabelTop = isDarkMode ? "#9ca3af" : "#6b7280";
	const centerLabelBottom = isDarkMode ? "#f9fafb" : "#111827";

	return (
		<div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 flex flex-col h-full">
			<h2 className="text-sm font-semibold text-slate-800 mb-2">
				Violation Type Distribution
			</h2>
			<div className="w-full h-60 flex flex-col items-center flex-1">
				{/* Donut */}
				<div className="w-full h-36 flex-1">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Tooltip
								formatter={(value) => [value, ""]}
								contentStyle={{
									borderRadius: 8,
									borderColor: tooltipBorder,
									backgroundColor: tooltipBg,
									color: tooltipColor,
								}}
							/>
							<Pie
								data={data}
								dataKey="value"
								nameKey="type"
								cx="50%"
								cy="50%"
							innerRadius={48}
							outerRadius={70}
								paddingAngle={3}
								labelLine={false}
							>
								{data.map((_, index) => (
									<Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
								))}
								<Label
									position="center"
									content={({ viewBox }) => {
										if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox))
											return null;
										const total = data.reduce(
											(s, d) => s + (d.value || 0),
											0,
										);
										return (
											<g>
												<text
													x={viewBox.cx}
													y={viewBox.cy - 12}
													textAnchor="middle"
													fontSize="10"
													fill={centerLabelTop}
												>
													TOTAL VIOLATIONS
												</text>
												<text
													x={viewBox.cx}
													y={viewBox.cy + 12}
													textAnchor="middle"
													fontSize="20"
													fontWeight="700"
													fill={centerLabelBottom}
												>
													{total.toLocaleString()}
												</text>
											</g>
										);
									}}
								/>
							</Pie>
						</PieChart>
					</ResponsiveContainer>
				</div>
				{/* Legend below */}
				<div className="w-full max-w-sm mt-3 space-y-2">
					{data.map((d, i) => {
						const total = data.reduce((s, x) => s + (x.value || 0), 0) || 1;
						const pct = Math.round(((d.value || 0) / total) * 1000) / 10;
						return (
							<div
								key={d.type}
								className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-neutral-900/80"
							>
								<div className="flex items-center gap-2">
									<span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }}></span>
									<span className="text-sm capitalize text-gray-800 dark:text-gray-100">
										{d.type}
									</span>
								</div>
								<div className="text-sm text-gray-600 dark:text-gray-300">
									{(d.value || 0).toLocaleString()} · {pct}%
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export default ViolationTypeDistribution;


