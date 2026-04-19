import { Card } from "@/components/ui";
import type { BusinessLead } from "@/types/business";

type StatsCardsProps = {
  businesses: BusinessLead[];
};

export function StatsCards({ businesses }: StatsCardsProps) {
  const contacted = businesses.filter((business) => business.leadStatus !== "new").length;
  const qualified = businesses.filter((business) => business.leadStatus === "qualified").length;
  const websites = businesses.filter((business) => business.website).length;
  const avgRating =
    businesses.reduce((sum, business) => sum + (business.rating ?? 0), 0) /
    Math.max(1, businesses.filter((business) => business.rating !== null).length);

  const stats = [
    { label: "Total leads", value: businesses.length.toString(), helper: "Deduplicated businesses" },
    { label: "Touched leads", value: contacted.toString(), helper: "Contacted or beyond" },
    { label: "Qualified", value: qualified.toString(), helper: "Ready for pipeline" },
    { label: "Avg rating", value: avgRating ? avgRating.toFixed(1) : "—", helper: `${websites} with websites` }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-5">
          <p className="text-sm text-slate-400">{stat.label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{stat.value}</p>
          <p className="mt-2 text-xs text-slate-500">{stat.helper}</p>
        </Card>
      ))}
    </div>
  );
}
