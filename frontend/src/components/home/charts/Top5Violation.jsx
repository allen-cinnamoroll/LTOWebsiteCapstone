"use client";

import React from "react";
import BarCard from "./BarCard";

const Top5Violation = ({ data = [] }) => {
	return (
		<BarCard
			title="Top 5 Violation"
			data={data}
			xKey="violation"
			barKey="value"
			color="#f59e0b"
			horizontal={false}
			xLabel="Violation"
		/>
	);
};

export default Top5Violation;


