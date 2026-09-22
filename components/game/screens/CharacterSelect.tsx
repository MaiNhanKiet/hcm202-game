"use client";

import { motion } from "framer-motion";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CharacterId } from "@/lib/game/session/types";
import { GameBackdrop } from "../GameBackdrop";

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
    <GameBackdrop>
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-6 p-6">
        <h2 className="w-fit rounded-2xl border-4 border-[#1d4e63] bg-card px-4 py-2 text-3xl font-bold text-foreground shadow-[5px_6px_0_#123846]">
          Chọn nhân vật
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {CHARACTERS.map((character, index) => (
            <motion.div
              key={character.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <Card
                role="button"
                tabIndex={0}
                className="cursor-pointer border-4 border-[#1d4e63] shadow-[6px_7px_0_#123846] transition hover:-translate-y-1"
                onClick={() => onSelect(character.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(character.id);
                  }
                }}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{character.name}</CardTitle>
                  <CardDescription>{character.ability}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </GameBackdrop>
  );
}
