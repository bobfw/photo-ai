import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ChangeEvent } from "react";

import { Topbar } from "../components/topbar.tsx";
import { Welcome } from "../components/welcome.tsx";
import { errorMessage } from "../error-message.ts";
import { usePortraitSession } from "../portrait-session.tsx";
import type { PortraitKind } from "../types.ts";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [kind, setKind] = useState<PortraitKind>("cutout");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { loadPortrait } = usePortraitSession();
  const navigate = useNavigate();

  async function handleFile(file: File) {
    setBusy(true);
    setError("");
    try {
      await loadPortrait(file, kind);
      await navigate({ to: "/editor" });
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void handleFile(file);
  }

  return (
    <>
      <Topbar />
      <main className="mx-auto max-w-[480px] px-4 pb-[calc(32px_+_var(--safe-bottom))] min-[520px]:px-5">
        <Welcome
          busy={busy}
          error={error}
          kind={kind}
          onKindChange={(nextKind) => {
            setError("");
            setKind(nextKind);
          }}
        />
      </main>
      <input
        accept="image/*"
        className="sr-only"
        disabled={busy}
        id="photo-input"
        onChange={handleInput}
        type="file"
      />
    </>
  );
}
