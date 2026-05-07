export function ProjectCardSkeleton() {
  return (
    <div
      className="bg-white animate-pulse"
      style={{
        borderTop: "0.5px solid #e2e8f0",
        borderRight: "0.5px solid #e2e8f0",
        borderBottom: "0.5px solid #e2e8f0",
        borderLeft: "3px solid #e2e8f0",
        borderRadius: "0 8px 8px 0",
        padding: "12px",
      }}
    >
      <div className="flex justify-between mb-2">
        <div className="h-2.5 w-20 bg-slate-200 rounded" />
        <div className="h-4 w-14 bg-slate-200 rounded-full" />
      </div>
      <div className="h-3.5 w-4/5 bg-slate-200 rounded mb-1.5" />
      <div className="h-3 w-2/3 bg-slate-200 rounded mb-3" />
      <div className="h-2 w-3/4 bg-slate-200 rounded mb-3" />
      <div className="h-1 bg-slate-200 rounded-full mb-2.5" />
      <div className="h-5 w-5 bg-slate-200 rounded-full" />
    </div>
  );
}
