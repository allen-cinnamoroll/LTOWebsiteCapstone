"use client";

import React from "react";
import { TrendingDown } from "lucide-react";
import BarCard from "./BarCard";

const Top3BottomMunicipality = ({ data = [] }) => {
	return (
		<BarCard
			title="Areas Needing Attention"
			description="Municipalities with lowest registration volumes"
			data={data}
			xKey="name"
			barKey="value"
			color="#f59e0b"
			horizontal={false}
			xLabel="Municipality"
			icon={TrendingDown}
		/>
	);
};

export default Top3BottomMunicipality;


