"use client";

import React, { useEffect, useState } from "react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	LabelList,
} from "recharts";

/**
 * Generic Bar Chart Card
 * Props:
 * - title: string
 * - data: Array<Record<string, any>>
 * - xKey: string   (label field)
 * - barKey: string (numeric field)
 * - color?: string
 * - horizontal?: boolean (default false; if true, uses layout='vertical')
 * - xLabel?: string
 * - yLabel?: string
 */
const BarCard = ({
	title,
	data = [],
	xKey,
	barKey,
	color = "#2563eb",
	horizontal = false,
	xLabel,
	yLabel,
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

	const axisTextColor = isDarkMode ? "#9ca3af" : "#94a3b8"; // text-slate-400 equivalent

	return (
		<div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 flex flex-col h-full">
			<h2 className="text-sm font-semibold text-slate-800 mb-2">
				{title}
			</h2>
			<div className="w-full h-64 flex-1">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={data}
						layout={horizontal ? "vertical" : "horizontal"}
						margin={{ top: 8, right: 6, bottom: 24, left: 6 }}
					>
						{/* Subtle solid gridlines */}
						<CartesianGrid strokeDasharray="0" stroke={isDarkMode ? "#374151" : "#e2e8f0"} strokeWidth={1} />
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
													style: { fontSize: "12px", fill: axisTextColor },
											  }
											: undefined
									}
									stroke={axisStroke}
									tick={{ fontSize: 12, fill: axisTextColor }}
								/>
								<YAxis
									type="category"
									dataKey={xKey}
									width={70}
									tick={{ fontSize: 12, fill: axisTextColor }}
									label={
										yLabel
											? {
													value: yLabel,
													angle: -90,
													position: "insideLeft",
													style: { fontSize: "12px", fill: axisTextColor },
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
									tick={{ fontSize: 12, fill: axisTextColor }}
									label={
										xLabel
											? {
													value: xLabel,
													position: "insideBottom",
													offset: -12,
													style: { fontSize: "12px", fill: axisTextColor },
											  }
											: undefined
									}
									stroke={axisStroke}
								/>
								<YAxis
									width={28}
									tick={{ fontSize: 12, fill: axisTextColor }}
									label={
										yLabel
											? {
													value: yLabel,
													angle: -90,
													position: "insideLeft",
													style: { fontSize: "12px", fill: axisTextColor },
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
							labelStyle={{ fontWeight: 600 }}
							contentStyle={{
								borderRadius: 8,
								borderColor: tooltipBorder,
								backgroundColor: tooltipBg,
								color: tooltipColor,
							}}
						/>
						{/* Solid color fill */}
						<defs>
							<linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor={color} stopOpacity={1} />
								<stop offset="100%" stopColor={color} stopOpacity={0.85} />
							</linearGradient>
						</defs>
						{/* Bars with rounded corners */}
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


