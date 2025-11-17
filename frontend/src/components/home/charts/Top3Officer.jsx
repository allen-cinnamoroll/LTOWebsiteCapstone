"use client";

import React from "react";
import { Shield } from "lucide-react";
import BarCard from "./BarCard";

const Top3Officer = ({ data = [] }) => {
	return (
		<BarCard
			title="Top Performing Officers"
			description="Officers with highest violation enforcement records"
			data={data}
			xKey="officer"
			barKey="value"
			color="#3b82f6"
			horizontal={false}
			xLabel="Officer Name"
			icon={Shield}
		/>
	);
};

export default Top3Officer;


