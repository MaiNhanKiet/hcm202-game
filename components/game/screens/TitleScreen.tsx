export function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <section className="grid min-h-screen place-items-center gap-4 p-8 text-center">
      <div>
        <h1 className="text-4xl font-semibold">Câu Cá Tri Thức</h1>
        <p className="mt-2 text-lg">Giải mã quyền lực</p>
      </div>
      <button type="button" className="rounded-full bg-teal-700 px-6 py-3 text-white" onClick={onStart}>
        Bắt đầu
      </button>
    </section>
  );
}
