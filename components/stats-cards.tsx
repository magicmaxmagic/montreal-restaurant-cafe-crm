import { Card } from "@/components/ui";
import type { BusinessLead } from "@/types/business";

type StatsCardsProps = {
  businesses: BusinessLead[];
};

export function StatsCards({ businesses }: StatsCardsProps) {
  const emailed = businesses.filter((business) => business.emailed).length;
  const visited = businesses.filter((business) => business.visited).length;
  const websites = businesses.filter((business) => business.website).length;
  const emails = businesses.filter((business) => business.email).length;

  const stats = [
    { label: "Total leads", value: businesses.length.toString(), helper: "Montreal businesses" },
    { label: "Emails sent", value: emailed.toString(), helper: "Marked as emailed" },
    { label: "Visited", value: visited.toString(), helper: "Marked as visited" },
    { label: "Contact data", value: `${emails}/${websites}`, helper: "Emails / websites" }
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
