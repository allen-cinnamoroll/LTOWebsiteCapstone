"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import BarCard from "./BarCard";

const Top5Violation = ({ data = [] }) => {
	return (
		<BarCard
			title="Most Common Violations"
			description="Top 5 traffic violations recorded this period"
			data={data}
			xKey="violation"
			barKey="value"
			color="#ef4444"
			horizontal={false}
			xLabel="Violation Type"
			icon={AlertTriangle}
		/>
	);
};

export default Top5Violation;


