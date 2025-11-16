"use client";

import React from "react";
import BarCard from "./BarCard";

const Top3Officer = ({ data = [] }) => {
	return (
		<BarCard
			title="Top 3 Officer"
			data={data}
			xKey="officer"
			barKey="value"
			color="#8b5cf6"
			horizontal={false}
			xLabel="Officer"
		/>
	);
};

export default Top3Officer;


