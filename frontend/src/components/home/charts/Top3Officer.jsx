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
			color="#a855f7"
			horizontal={false}
			xLabel="Officer"
		/>
	);
};

export default Top3Officer;


