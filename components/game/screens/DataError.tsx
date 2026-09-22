import { GameBackdrop } from "../GameBackdrop";

export function DataError() {
  return (
    <GameBackdrop>
      <section className="grid min-h-screen place-items-center p-6">
        <p className="rounded-2xl bg-card px-6 py-4 text-lg font-medium">Lỗi dữ liệu</p>
      </section>
    </GameBackdrop>
  );
}
