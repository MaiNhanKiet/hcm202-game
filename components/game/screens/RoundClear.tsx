export function RoundClear({
  reward,
  onContinue,
}: {
  reward: string;
  onContinue: () => void;
}) {
  return (
    <section className="grid min-h-screen place-items-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-semibold">Vượt vòng</h2>
      <p>Nhận {reward}</p>
      <button type="button" className="rounded-full bg-teal-700 px-6 py-3 text-white" onClick={onContinue}>
        Tiếp tục
      </button>
    </section>
  );
}
