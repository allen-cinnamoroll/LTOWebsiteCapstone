"use client";

import React from "react";
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
	return (
		<div className="rounded-xl bg-white shadow-md border p-4 h-full">
			<div className="font-semibold mb-2">{title}</div>
			<div className="w-full h-64">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={data}
						layout={horizontal ? "vertical" : "horizontal"}
						margin={{ top: 8, right: 6, bottom: 24, left: 6 }}
					>
						{/* Subtle grid and modern theming */}
						<CartesianGrid strokeDasharray="3 3" />
						{/* Axes */}
						{horizontal ? (
							<>
								<XAxis type="number" label={xLabel ? { value: xLabel, position: "insideBottom", offset: -12 } : undefined} />
								<YAxis type="category" dataKey={xKey} width={70} tick={{ fontSize: 10 }} label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft" } : undefined} />
							</>
						) : (
							<>
								<XAxis dataKey={xKey} interval={0} tick={{ fontSize: 12 }} label={xLabel ? { value: xLabel, position: "insideBottom", offset: -12 } : undefined} />
								<YAxis width={28} tick={{ fontSize: 10 }} label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft" } : undefined} />
							</>
						)}
						{/* Custom tooltip with clean numbers */}
						<Tooltip
							formatter={(value) => [value, ""]}
							labelStyle={{ fontWeight: 600 }}
							contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb" }}
						/>
						{/* Gradient fill */}
						<defs>
							<linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor={color} stopOpacity={0.9} />
								<stop offset="95%" stopColor={color} stopOpacity={0.5} />
							</linearGradient>
						</defs>
						{/* Bars with rounded corners and value labels */}
						<Bar dataKey={barKey} fill={`url(#grad-${color})`} radius={[6, 6, 0, 0]} barCategoryGap="25%" minPointSize={2} />
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};

export default BarCard;


