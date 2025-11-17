"use client";

import React from "react";
import { MapPin } from "lucide-react";
import BarCard from "./BarCard";

const Top3Municipality = ({ data = [] }) => {
	return (
		<BarCard
			title="Top Performing Municipalities"
			description="Municipalities with highest vehicle and driver registrations"
			data={data}
			xKey="name"
			barKey="value"
			color="#2563eb"
			horizontal={false}
			xLabel="Municipality"
			icon={MapPin}
		/>
	);
};

export default Top3Municipality;


