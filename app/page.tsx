import { GameApp } from "@/components/game/GameApp";
import raw from "../question.json";
import { validateContent } from "@/lib/game/content/validate";

export default function Home() {
  const result = validateContent(raw);
  if (!result.ok) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p>{result.error}</p>
      </main>
    );
  }
  return <GameApp content={result.content} />;
}
