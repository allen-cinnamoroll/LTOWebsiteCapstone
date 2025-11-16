"use client";

import React from "react";
import BarCard from "./BarCard";

const WeeklyAccidentPattern = ({ data = [] }) => {
	return (
		<BarCard
			title="Weekly Accident Pattern"
			data={data}
			xKey="weekLabel"
			barKey="value"
			color="#0ea5e9"
			horizontal={false}
			xLabel="Week"
		/>
	);
};

export default WeeklyAccidentPattern;


