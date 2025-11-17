"use client";

import React from "react";
import { Map } from "lucide-react";
import BarCard from "./BarCard";

const Top5MunicipalityAccident = ({ data = [] }) => {
	return (
		<BarCard
			title="Accident-Prone Areas"
			description="Municipalities with highest accident occurrences"
			data={data}
			xKey="name"
			barKey="value"
			color="#ef4444"
			horizontal={false}
			xLabel="Municipality"
			icon={Map}
		/>
	);
};

export default Top5MunicipalityAccident;


