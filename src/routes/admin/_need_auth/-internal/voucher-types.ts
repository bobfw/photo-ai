export const VOUCHER_TYPES = [
  { value: "wedding", label: "婚纱照" },
  { value: "portrait", label: "写真" },
] as const;

export type VoucherType = (typeof VOUCHER_TYPES)[number]["value"];

export function voucherTypeLabel(type: string) {
  return VOUCHER_TYPES.find((item) => item.value === type)?.label ?? type;
}
