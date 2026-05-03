import Card from './ui/Card';

interface StatsData {
  papersFound: number;
  totalCitations: number;
  openAccessPercent: number;
  averageYear: number;
}

interface StatsDashboardProps {
  stats: StatsData;
}

export default function StatsDashboard({ stats }: StatsDashboardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Papers Found */}
      <Card>
        <div className="text-sm text-gray-600 mb-1">Papers Found</div>
        <div className="text-3xl font-bold text-black mb-1">{stats.papersFound}</div>
        <div className="text-xs text-gray-500">In citation network</div>
      </Card>

      {/* Total Citations */}
      <Card>
        <div className="text-sm text-gray-600 mb-1">Total Citations</div>
        <div className="text-3xl font-bold text-[#2563EB] mb-1">
          {stats.totalCitations.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500">Across all papers</div>
      </Card>

      {/* Open Access */}
      <Card>
        <div className="text-sm text-gray-600 mb-1">Open Access</div>
        <div className="text-3xl font-bold text-[#10B981] mb-1">
          {stats.openAccessPercent}%
        </div>
        <div className="text-xs text-gray-500">Freely available</div>
      </Card>

      {/* Average Year */}
      <Card>
        <div className="text-sm text-gray-600 mb-1">Average Year</div>
        <div className="text-3xl font-bold text-[#F59E0B] mb-1">{stats.averageYear}</div>
        <div className="text-xs text-gray-500">Publication date</div>
      </Card>
    </div>
  );
}

// Made with Bob
