'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface CitationData {
  year: number;
  count: number;
}

interface CitationTrendChartProps {
  data: CitationData[];
  title?: string;
}

export default function CitationTrendChart({ data, title }: CitationTrendChartProps) {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-bold text-black mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="year"
            stroke="#000"
            style={{ fontSize: '12px', fontWeight: 600 }}
          />
          <YAxis stroke="#000" style={{ fontSize: '12px', fontWeight: 600 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '2px solid #000',
              borderRadius: '8px',
              boxShadow: '2px 2px 0px 0px rgba(0,0,0,1)',
            }}
            labelStyle={{ fontWeight: 'bold', color: '#000' }}
          />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '14px',
              fontWeight: 600,
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#2563EB"
            strokeWidth={3}
            dot={{ fill: '#2563EB', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 2 }}
            name="Citations"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Made with Bob
