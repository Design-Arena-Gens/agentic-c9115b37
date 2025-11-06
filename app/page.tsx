import { IndicatorBuilder } from '@/components/IndicatorBuilder';

export default function Page() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10">
      <IndicatorBuilder />
      <footer className="pb-10 text-center text-xs text-slate-500">
        Crafted for algorithmic traders seeking deterministic, non-repainting machine learning signals.
      </footer>
    </main>
  );
}
