"use client";

import React from "react";
import BarCard from "./BarCard";

const Top3Municipality = ({ data = [] }) => {
	return (
		<BarCard
			title="Top 3 Municipality"
			data={data}
			xKey="name"
			barKey="value"
			color="#3b82f6"
			horizontal={false}
			xLabel="Municipality"
		/>
	);
};

export default Top3Municipality;


