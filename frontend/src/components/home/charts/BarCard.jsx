"use client";

import React, { useEffect, useState } from "react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	LabelList,
} from "recharts";

/**
 * Generic Bar Chart Card
 * Props:
 * - title: string
 * - description?: string (optional subtitle/description)
 * - data: Array<Record<string, any>>
 * - xKey: string   (label field)
 * - barKey: string (numeric field)
 * - color?: string
 * - horizontal?: boolean (default false; if true, uses layout='vertical')
 * - xLabel?: string
 * - yLabel?: string
 * - icon?: React component (optional icon)
 */
const BarCard = ({
	title,
	description,
	data = [],
	xKey,
	barKey,
	color = "#2563eb",
	horizontal = false,
	xLabel,
	yLabel,
	icon: Icon,
}) => {
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

	const gridStroke = isDarkMode ? "#374151" : "#e5e7eb";
	const axisStroke = isDarkMode ? "#9ca3af" : "#6b7280";
	const tooltipBg = isDarkMode ? "#111827" : "#ffffff";
	const tooltipBorder = isDarkMode ? "#374151" : "#e5e7eb";
	const tooltipColor = isDarkMode ? "#f9fafb" : "#111827";

	return (
		<div className="rounded-xl shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-neutral-900 dark:to-neutral-800 border border-gray-200 dark:border-gray-700 p-4 h-full relative overflow-hidden">
			{/* Decorative gradient background */}
			<div className="absolute top-0 right-0 w-32 h-32 opacity-5 dark:opacity-10" style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}></div>
			
			<div className="mb-3 relative z-10">
				<div className="flex items-start gap-2">
					{Icon && (
						<div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
							<Icon className="h-5 w-5" style={{ color: color }} />
						</div>
					)}
					<div className="space-y-0">
						<div className="font-semibold text-gray-900 dark:text-gray-100">
							{title}
						</div>
						{description && (
							<p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
								{description}
							</p>
						)}
					</div>
				</div>
			</div>
			<div className="w-full h-64 relative z-10">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={data}
						layout={horizontal ? "vertical" : "horizontal"}
						margin={{ top: 8, right: 6, bottom: 24, left: 6 }}
					>
						{/* Axes */}
						{horizontal ? (
							<>
								<XAxis
									type="number"
									label={
										xLabel
											? {
													value: xLabel,
													position: "insideBottom",
													offset: -12,
											  }
											: undefined
									}
									stroke={axisStroke}
								/>
								<YAxis
									type="category"
									dataKey={xKey}
									width={70}
									tick={{ fontSize: 10 }}
									label={
										yLabel
											? {
													value: yLabel,
													angle: -90,
													position: "insideLeft",
											  }
											: undefined
									}
									stroke={axisStroke}
								/>
							</>
						) : (
							<>
								<XAxis
									dataKey={xKey}
									interval={0}
									tick={{ fontSize: 12 }}
									label={
										xLabel
											? {
													value: xLabel,
													position: "insideBottom",
													offset: -12,
											  }
											: undefined
									}
									stroke={axisStroke}
								/>
								<YAxis
									width={28}
									tick={{ fontSize: 10 }}
									label={
										yLabel
											? {
													value: yLabel,
													angle: -90,
													position: "insideLeft",
											  }
											: undefined
									}
									stroke={axisStroke}
								/>
							</>
						)}
						{/* Custom tooltip with clean numbers */}
						<Tooltip
							formatter={(value) => [value, ""]}
							labelStyle={{ 
								fontWeight: 500,
								fontSize: '11px',
								marginBottom: '2px'
							}}
							contentStyle={{
								borderRadius: 6,
								border: `1px solid ${tooltipBorder}`,
								backgroundColor: tooltipBg,
								color: tooltipColor,
								padding: '6px 10px',
								fontSize: '12px',
								boxShadow: isDarkMode 
									? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
									: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
							}}
							itemStyle={{
								padding: '2px 0',
								fontSize: '12px',
								fontWeight: 600
							}}
						/>
						{/* Gradient fill */}
						<defs>
							<linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor={color} stopOpacity={0.9} />
								<stop offset="95%" stopColor={color} stopOpacity={0.5} />
							</linearGradient>
						</defs>
						{/* Bars with rounded corners and value labels */}
						<Bar
							dataKey={barKey}
							fill={`url(#grad-${color})`}
							radius={[6, 6, 0, 0]}
							barCategoryGap="25%"
							minPointSize={2}
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};

export default BarCard;


