export function WinScreen({ rewards }: { rewards: string[] }) {
  return (
    <section className="grid min-h-screen place-items-center gap-4 p-8 text-center">
      <h2 className="text-3xl font-semibold">Giải mã quyền lực</h2>
      <ul>
        {rewards.map((reward) => (
          <li key={reward}>{reward}</li>
        ))}
      </ul>
    </section>
  );
}
