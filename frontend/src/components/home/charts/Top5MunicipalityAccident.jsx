"use client";

import React from "react";
import BarCard from "./BarCard";

const Top5MunicipalityAccident = ({ data = [] }) => {
	return (
		<BarCard
			title="Top 5 Municipality Accident"
			data={data}
			xKey="name"
			barKey="value"
			color="#ef4444"
			horizontal={false}
			xLabel="Municipality"
		/>
	);
};

export default Top5MunicipalityAccident;


