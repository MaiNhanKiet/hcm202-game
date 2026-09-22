export function ExplainScreen({
  explanation,
  onContinue,
}: {
  explanation: string;
  onContinue: () => void;
}) {
  return (
    <section className="grid min-h-screen place-items-center gap-4 p-8 text-center">
      <p className="max-w-xl text-lg">{explanation}</p>
      <button type="button" className="rounded-full bg-teal-700 px-6 py-3 text-white" onClick={onContinue}>
        Tiếp tục
      </button>
    </section>
  );
}
