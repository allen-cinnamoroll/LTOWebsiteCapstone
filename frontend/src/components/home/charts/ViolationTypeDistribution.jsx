"use client";

import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

/**
 * Violation Type Distribution - Pie/Donut Chart
 * Props:
 * - data: { type: string; count: number }[]
 * - colors?: string[]
 */
const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981", "#06b6d4"];

const ViolationTypeDistribution = ({ data = [], colors = COLORS }) => {
	// Expect data as [{ type: 'Alarm'|'Confiscated'|'Impounded', value: number }, ...]
	const [isDarkMode, setIsDarkMode] = useState(() => {
		if (typeof document === "undefined") return false;
		const root = document.documentElement;
		const prefersDark =
			window.matchMedia &&
			window.matchMedia("(prefers-color-scheme: dark)").matches;
		return root.classList.contains("dark") || prefersDark;
	});

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
			
			// Also listen to media query changes
			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
			if (mediaQuery.addEventListener) {
				mediaQuery.addEventListener("change", checkTheme);
			} else if (mediaQuery.addListener) {
				mediaQuery.addListener(checkTheme);
			}
			
			return () => {
				observer.disconnect();
				if (mediaQuery.removeEventListener) {
					mediaQuery.removeEventListener("change", checkTheme);
				} else if (mediaQuery.removeListener) {
					mediaQuery.removeListener(checkTheme);
				}
			};
		}
	}, []);

	const tooltipBg = isDarkMode ? "#111827" : "#ffffff";
	const tooltipBorder = isDarkMode ? "#374151" : "#e5e7eb";
	const tooltipColor = isDarkMode ? "#f9fafb" : "#000000";
	const centerLabelTop = isDarkMode ? "#e5e7eb" : "#111827";
	const centerLabelMiddle = isDarkMode ? "#ffffff" : "#000000";
	const centerLabelBottom = isDarkMode ? "#d1d5db" : "#4b5563";

	const primaryColor = "#22c55e"; // Green as primary
	
	return (
		<div className="rounded-xl shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-neutral-900 dark:to-neutral-800 border border-gray-200 dark:border-gray-700 p-4 h-full relative overflow-hidden">
			{/* Decorative gradient background */}
			<div className="absolute top-0 right-0 w-32 h-32 opacity-5 dark:opacity-10" style={{ background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)` }}></div>
			
			<div className="mb-3 relative z-10">
				<div className="flex items-start gap-2">
					<div className="p-2 rounded-lg" style={{ backgroundColor: `${primaryColor}15` }}>
						<PieChartIcon className="h-5 w-5" style={{ color: primaryColor }} />
					</div>
					<div className="space-y-0">
						<div className="font-semibold text-gray-900 dark:text-gray-100">
							Violation Categories
						</div>
						<p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
							Distribution of violation types
						</p>
					</div>
				</div>
			</div>
			<div className="w-full h-64 flex flex-col items-center relative z-10">
				{/* Donut */}
				<div className="w-full h-44">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart key={isDarkMode ? 'dark' : 'light'}>
							<Tooltip
								contentStyle={{ display: 'none' }}
								active={false}
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
												{/* Top line: TOTAL VIOLATIONS */}
												<text
													x={viewBox.cx}
													y={viewBox.cy - 8}
													textAnchor="middle"
													fontSize="9"
													fill="#000000"
													fontWeight="600"
													style={{ 
														userSelect: 'none',
														letterSpacing: '0.5px',
														fontFamily: 'system-ui, -apple-system, sans-serif'
													}}
												>
													TOTAL VIOLATIONS
												</text>
												{/* Middle line: Total number */}
												<text
													x={viewBox.cx}
													y={viewBox.cy + 14}
													textAnchor="middle"
													fontSize="24"
													fontWeight="800"
													fill="#000000"
													style={{ 
														filter: isDarkMode 
															? 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))'
															: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.15))',
														userSelect: 'none',
														fontFamily: 'system-ui, -apple-system, sans-serif'
													}}
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
				{/* Legend below - Custom layout: Alarm and Confiscated on first row, Impounded on second row */}
				<div className="w-full max-w-sm mt-2 space-y-1.5">
					{/* First row: Alarm and Confiscated */}
					<div className="flex items-center gap-2 justify-center">
						{data
							.filter((d) => d.type.toLowerCase() === 'alarm' || d.type.toLowerCase() === 'confiscated')
							.map((d, idx) => {
								const originalIndex = data.findIndex((item) => item.type === d.type);
								const total = data.reduce((s, x) => s + (x.value || 0), 0) || 1;
								const pct = Math.round(((d.value || 0) / total) * 1000) / 10;
								return (
									<div
										key={d.type}
										className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 bg-white dark:bg-neutral-900/80"
									>
										<div className="flex items-center gap-1.5">
											<span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: colors[originalIndex % colors.length] }}></span>
											<span className="text-xs capitalize text-gray-800 dark:text-gray-100">
												{d.type}
											</span>
										</div>
										<div className="text-xs text-gray-600 dark:text-gray-300 ml-2">
											{(d.value || 0).toLocaleString()} · {pct}%
										</div>
									</div>
								);
							})}
					</div>
					{/* Second row: Impounded */}
					<div className="flex items-center justify-center">
						{data
							.filter((d) => d.type.toLowerCase() === 'impounded')
							.map((d) => {
								const originalIndex = data.findIndex((item) => item.type === d.type);
						const total = data.reduce((s, x) => s + (x.value || 0), 0) || 1;
						const pct = Math.round(((d.value || 0) / total) * 1000) / 10;
						return (
							<div
								key={d.type}
										className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 bg-white dark:bg-neutral-900/80"
							>
										<div className="flex items-center gap-1.5">
											<span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: colors[originalIndex % colors.length] }}></span>
											<span className="text-xs capitalize text-gray-800 dark:text-gray-100">
										{d.type}
									</span>
								</div>
										<div className="text-xs text-gray-600 dark:text-gray-300 ml-2">
									{(d.value || 0).toLocaleString()} · {pct}%
								</div>
							</div>
						);
					})}
					</div>
				</div>
			</div>
		</div>
	);
};

export default ViolationTypeDistribution;


