interface StatCardProps {
  label: string;
  value: string;
  secondary?: React.ReactNode;
}

export function StatCard({ label, value, secondary }: StatCardProps) {
  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-dusty-lavender-800 bg-slate-grey-900 p-6 transition-shadow hover:shadow-[0_0_24px_0px_#93065b33]">
      <span className="text-sm font-medium text-dusty-lavender-400">
        {label}
      </span>
      <span className="text-3xl font-semibold text-slate-grey-50">{value}</span>
      {secondary && (
        <div className="text-sm text-dusty-lavender-400">{secondary}</div>
      )}
    </div>
  );
}
