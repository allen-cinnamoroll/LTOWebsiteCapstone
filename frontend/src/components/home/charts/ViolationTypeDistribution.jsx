"use client";

import React from "react";
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
	return (
		<div className="rounded-xl bg-white shadow-md border p-4 h-full">
			<div className="font-semibold mb-2">Violation Type Distribution</div>
			<div className="w-full h-60 flex flex-col items-center">
				{/* Donut */}
				<div className="w-full h-36">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Tooltip
								formatter={(value) => [value, ""]}
								contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb" }}
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
										if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
										const total = data.reduce((s, d) => s + (d.value || 0), 0);
										return (
											<g>
												<text x={viewBox.cx} y={viewBox.cy - 12} textAnchor="middle" fontSize="10" fill="#6b7280">TOTAL VIOLATIONS</text>
												<text x={viewBox.cx} y={viewBox.cy + 12} textAnchor="middle" fontSize="20" fontWeight="700" fill="#111827">{total.toLocaleString()}</text>
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
							<div key={d.type} className="flex items-center justify-between rounded-lg border px-3 py-2">
								<div className="flex items-center gap-2">
									<span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }}></span>
									<span className="text-sm capitalize">{d.type}</span>
								</div>
								<div className="text-sm text-gray-600">{(d.value || 0).toLocaleString()} · {pct}%</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export default ViolationTypeDistribution;


