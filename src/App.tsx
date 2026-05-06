import "./index.css";

export default function App() {
  return (
    <div className="p-8 flex flex-col gap-4">
      <div className="bg-y-teal text-white p-4 rounded-lg">
        bg-y-teal werkt
      </div>
      <div className="bg-y-teal-dark text-white p-4 rounded-lg">
        bg-y-teal-dark werkt
      </div>
      <div className="bg-y-purple-dark text-white p-4 rounded-lg">
        bg-y-purple-dark werkt
      </div>
      <p className="text-sm text-slate-500">
        Bouwmeester — Fase 0 scaffold OK. Poort 5200.
      </p>
    </div>
  );
}
