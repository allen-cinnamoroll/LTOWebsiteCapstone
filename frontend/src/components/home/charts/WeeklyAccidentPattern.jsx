"use client";

import React from "react";
import { Calendar } from "lucide-react";
import BarCard from "./BarCard";

const WeeklyAccidentPattern = ({ data = [] }) => {
	return (
		<BarCard
			title="Weekly Accident Trends"
			description="Accident frequency by day of the week"
			data={data}
			xKey="weekLabel"
			barKey="value"
			color="#f97316"
			horizontal={false}
			xLabel="Day of Week"
			icon={Calendar}
		/>
	);
};

export default WeeklyAccidentPattern;


