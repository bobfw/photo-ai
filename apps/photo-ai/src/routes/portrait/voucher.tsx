import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { VoucherGate } from "#components/voucher-gate";

export const Route = createFileRoute("/portrait/voucher")({
  validateSearch: z.object({
    error: z.enum(["invalid", "consent"]).optional(),
    code: z.string().optional(),
  }),
  component: VoucherPage,
});

function VoucherPage() {
  const navigate = useNavigate();
  const { error, code } = Route.useSearch();

  return (
    <VoucherGate
      initialCode={code}
      initialError={error}
      onEnter={async (value) => {
        await navigate({ to: "/portrait", search: { code: value } });
      }}
      type="portrait"
    />
  );
}
