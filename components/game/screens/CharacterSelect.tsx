import type { CharacterId } from "@/lib/game/session/types";

const CHARACTERS: { id: CharacterId; name: string; ability: string }[] = [
  { id: "observer", name: "Người quan sát", ability: "Gợi ý một cá sai" },
  { id: "persistent", name: "Người kiên trì", ability: "Thêm một mạng" },
  { id: "careful", name: "Người sâu sát", ability: "Xem lại giải thích câu sai" },
];

export function CharacterSelect({
  onSelect,
}: {
  onSelect: (id: CharacterId) => void;
}) {
  return (
    <section className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 p-8">
      <h2 className="text-2xl font-semibold">Chọn nhân vật</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {CHARACTERS.map((character) => (
          <button
            key={character.id}
            type="button"
            className="rounded-xl border border-teal-800/40 p-4 text-left"
            onClick={() => onSelect(character.id)}
          >
            <strong>{character.name}</strong>
            <p className="mt-2 text-sm opacity-80">{character.ability}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
