export function RoundFail({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="grid min-h-screen place-items-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-semibold">Hết mạng</h2>
      <button type="button" className="rounded-full bg-teal-700 px-6 py-3 text-white" onClick={onRetry}>
        Thử lại vòng này
      </button>
    </section>
  );
}
