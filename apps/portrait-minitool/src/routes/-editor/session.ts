import type { PortraitSession } from "../../portrait-session.tsx";

export function getIsCutout(session: PortraitSession) {
  return session.kind === "cutout" || session.hasAlpha;
}
