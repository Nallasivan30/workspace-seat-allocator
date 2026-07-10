"use client";

import * as React from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DonutChartProps {
  data: Array<{
    name: string;
    value: number;
    [key: string]: any;
  }>;
  height?: number;
  colors?: string[];
  unit?: string;
}

export function DonutChart({
  data,
  height = 300,
  colors = [
    "#0f172a", // slate-900
    "#0284c7", // sky-600
    "#0d9488", // teal-600
    "#ea580c", // orange-600
    "#4f46e5", // indigo-600
    "#7c3aed", // violet-600
    "#db2777", // pink-600
  ],
  unit = "",
}: DonutChartProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{ height }}
        className="flex w-full items-center justify-center rounded-lg border border-zinc-100 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50"
      >
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Loading chart...</span>
      </div>
    );
  }

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs font-medium text-zinc-650 dark:text-zinc-400">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>
              {entry.value} ({data[index]?.value}{unit})
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div style={{ width: "100%", height }} className="flex flex-col items-center justify-center">
      <div className="w-full flex-1" style={{ height: height - 60 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #e4e4e7",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                fontSize: "12px",
              }}
              itemStyle={{ color: "#18181b" }}
              formatter={(value: any) => [`${value}${unit}`, "Count"]}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Legend content={renderLegend} verticalAlign="bottom" />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
