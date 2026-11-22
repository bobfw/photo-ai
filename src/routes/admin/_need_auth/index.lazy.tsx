import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createLazyFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import {
  createColumnHelper,
  functionalUpdate,
  rowPaginationFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { cn } from "cn";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "#ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "#ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "#ui/dialog";
import { Input } from "#ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "#ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#ui/table";
import { toast } from "#ui/toast";

import { clearApiKey, getApiKey } from "./-internal/api-key.ts";
import { isUnauthorized } from "./-internal/auth.ts";
import { platformLabel } from "./-internal/platforms.ts";
import { createVoucher, distributeVoucher, listVouchers } from "./-internal/services/admin.ts";
import { VOUCHER_TYPES, voucherTypeLabel, type VoucherType } from "./-internal/voucher-types.ts";

export const Route = createLazyFileRoute("/admin/_need_auth/")({
  component: AdminPage,
});

type Voucher = Awaited<ReturnType<typeof listVouchers>>["vouchers"][number];

const features = tableFeatures({ rowPaginationFeature });
const columnHelper = createColumnHelper<typeof features, Voucher>();

const PAGE_SIZES = [10, 20, 50];

const TYPE_FILTERS = [{ value: "all", label: "全部" }, ...VOUCHER_TYPES] as const;
const DISTRIBUTION_FILTERS = [
  { value: "all", label: "全部" },
  { value: "undistributed", label: "未分发" },
  { value: "distributed", label: "已分发" },
] as const;
const USAGE_FILTERS = [
  { value: "all", label: "全部" },
  { value: "unused", label: "未使用" },
  { value: "partial", label: "使用中" },
  { value: "used", label: "已用完" },
] as const;

function voucherCopyText(code: string, createdAt: number) {
  const time = new Date(createdAt).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `凭证码：${code}\n生成时间：${time}`;
}

function AdminPage() {
  type TypeFilter = (typeof TYPE_FILTERS)[number]["value"];
  type DistributionFilter = (typeof DISTRIBUTION_FILTERS)[number]["value"];
  type UsageFilter = (typeof USAGE_FILTERS)[number]["value"];

  const apiKey = getApiKey();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<{ code: string; createdAt: number }[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<{ type: VoucherType; total: number; edits: number }>();
  const [confirming, setConfirming] = useState(false);
  const [sessionDistributed, setSessionDistributed] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [distributionFilter, setDistributionFilter] = useState<DistributionFilter>("all");
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("all");

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: [
      "admin",
      "vouchers",
      apiKey,
      page,
      pageSize,
      typeFilter,
      distributionFilter,
      usageFilter,
    ],
    queryFn: () =>
      listVouchers({
        data: {
          key: apiKey,
          page,
          pageSize,
          type: typeFilter,
          distribution: distributionFilter,
          usage: usageFilter,
        },
      }),
    enabled: apiKey !== "",
    placeholderData: keepPreviousData,
    retry: false,
  });

  const refreshVouchers = () => queryClient.invalidateQueries({ queryKey: ["admin", "vouchers"] });

  const distributeMutation = useMutation({
    mutationFn: (code: string) => distributeVoucher({ data: { code, key: getApiKey() } }),
    onSuccess: (_result, code) => {
      setSessionDistributed((codes) => (codes.includes(code) ? codes : [...codes, code]));
      void refreshVouchers();
    },
  });

  const copyVoucher = async (voucher: { code: string; createdAt: number }) => {
    try {
      await navigator.clipboard.writeText(voucherCopyText(voucher.code, voucher.createdAt));
    } catch {
      toast.add({ title: "复制失败，请手动选择复制", type: "error" });
      return;
    }
    toast.add({ title: "已复制，并分发到小红书", type: "success" });
    distributeMutation.mutate(voucher.code);
  };

  const createMutation = useMutation({
    mutationFn: (input: { type: VoucherType; total: number; edits: number }) =>
      createVoucher({ data: { ...input, key: getApiKey() } }),
    onSuccess: ({ code, createdAt }) => {
      setCreated([{ code, createdAt }]);
      setConfirming(false);
      setCreateOpen(false);
      setPage(1);
      void refreshVouchers();
      void copyVoucher({ code, createdAt });
    },
  });

  const distributedCodes = new Set([
    ...(data?.vouchers ?? []).flatMap((voucher) =>
      voucher.platform === null ? [] : [voucher.code],
    ),
    ...sessionDistributed,
  ]);
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const currentPage = Math.min(page, pageCount);
  const columns = buildColumns(distributedCodes, (voucher) => void copyVoucher(voucher));
  const table = useTable(
    {
      data: data?.vouchers ?? [],
      columns,
      features,
      manualPagination: true,
      pageCount,
      autoResetPageIndex: false,
      state: { pagination: { pageIndex: currentPage - 1, pageSize } },
      onPaginationChange: (updater) => {
        const next = functionalUpdate(updater, { pageIndex: currentPage - 1, pageSize });
        if (next.pageSize !== pageSize) {
          setPageSize(next.pageSize);
          setPage(1);
          return;
        }
        setPage(next.pageIndex + 1);
      },
    },
    (state) => ({ pagination: state.pagination }),
  );

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  if (apiKey === "") return <Navigate replace to="/admin/login" />;
  if (isPending) return <Centered>正在载入…</Centered>;
  if (error) {
    if (isUnauthorized(error)) return <Navigate replace to="/admin/login" />;
    return <Centered>载入失败：{error.message}</Centered>;
  }

  const { vouchers, stats, total } = data;
  const hasFilters = typeFilter !== "all" || distributionFilter !== "all" || usageFilter !== "all";
  let emptyMessage = "本页没有凭证。";
  if (stats.total === 0) emptyMessage = "还没有凭证，点「生成凭证」创建。";
  else if (total === 0) emptyMessage = "没有符合筛选的凭证。";

  return (
    <main className="bg-background min-h-dvh">
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
        <header className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-b pb-5">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl">凭证管理</h1>
            <p className="text-muted-foreground text-xs tracking-wide">出片 · 婚纱照</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="h-11"
              onClick={() => {
                createMutation.reset();
                setDraft(undefined);
                setConfirming(false);
                setCreateOpen(true);
              }}
              type="button"
            >
              生成凭证
            </Button>
            <Button
              className="h-11"
              onClick={() => {
                clearApiKey();
                void navigate({ to: "/admin/login", replace: true });
              }}
              type="button"
              variant="outline"
            >
              退出登录
            </Button>
          </div>
        </header>

        <Dialog
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (open) {
              return;
            }

            setConfirming(false);
            setDraft(undefined);
          }}
          open={createOpen}
        >
          <DialogContent>
            <div className="space-y-1.5">
              <DialogTitle>{confirming ? "确认生成" : "生成凭证"}</DialogTitle>
              <DialogDescription>
                {confirming
                  ? "请确认以下信息，确认后立即生成。"
                  : "一次生成一个凭证；写真凭证暂未接入生成流程。"}
              </DialogDescription>
            </div>
            {confirming && draft ? (
              <div className="space-y-3">
                <div className="bg-muted/50 space-y-1 rounded-lg px-3 py-2.5 text-sm">
                  <p>{voucherTypeLabel(draft.type)} · 1 个凭证</p>
                  <p className="text-muted-foreground">
                    每张可生成 {draft.total} 张，每张可修改 {draft.edits} 次。
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    className="h-11 flex-1"
                    disabled={createMutation.isPending}
                    onClick={() => {
                      setConfirming(false);
                    }}
                    type="button"
                    variant="outline"
                  >
                    返回
                  </Button>
                  <Button
                    className="h-11 flex-1"
                    disabled={createMutation.isPending}
                    onClick={() => {
                      createMutation.mutate(draft);
                    }}
                    type="button"
                  >
                    {createMutation.isPending ? "生成中…" : "确认生成"}
                  </Button>
                </div>
              </div>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const type = form.get("type");
                  if (typeof type !== "string") return;
                  setDraft({
                    type: type as VoucherType,
                    total: Number(form.get("total")),
                    edits: Number(form.get("edits")),
                  });
                  setConfirming(true);
                }}
              >
                <label className="block space-y-1.5">
                  <span className="text-muted-foreground text-xs">凭证类型</span>
                  <select
                    className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-11 w-full rounded-lg border px-2 text-sm outline-none focus-visible:ring-3"
                    defaultValue={draft?.type ?? "wedding"}
                    name="type"
                    required
                  >
                    {VOUCHER_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1.5">
                    <span className="text-muted-foreground text-xs">张数</span>
                    <Input
                      className="h-11"
                      defaultValue={draft?.total}
                      max={5}
                      min={1}
                      name="total"
                      required
                      type="number"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-muted-foreground text-xs">每张可修改次数</span>
                    <Input
                      className="h-11"
                      defaultValue={draft?.edits}
                      max={5}
                      min={0}
                      name="edits"
                      required
                      type="number"
                    />
                  </label>
                </div>
                <div className="flex gap-2 pt-1">
                  <DialogClose
                    render={<Button className="h-11 flex-1" type="button" variant="outline" />}
                  >
                    取消
                  </DialogClose>
                  <Button className="h-11 flex-1" type="submit">
                    下一步
                  </Button>
                </div>
              </form>
            )}
            {createMutation.error ? (
              <p className="text-destructive text-sm" role="alert">
                {isUnauthorized(createMutation.error)
                  ? "API Key 已失效，请重新登录"
                  : createMutation.error.message}
              </p>
            ) : undefined}
          </DialogContent>
        </Dialog>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="全部凭证" value={stats.total} />
          <Stat label="未分发" value={stats.total - stats.distributed} />
          <Stat label="已分发" value={stats.distributed} />
          <Stat label="未使用" value={stats.unused} />
          <Stat label="使用中" value={stats.partial} />
          <Stat label="已用完" value={stats.used} />
        </dl>

        {created.length > 0 ? (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>本次生成</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {created.map(({ code, createdAt }) => (
                  <li
                    className="bg-muted/50 flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                    key={code}
                  >
                    <code className="min-w-0 font-mono text-xs break-all">{code}</code>
                    <CopyButton
                      code={code}
                      disabled={distributedCodes.has(code)}
                      onClick={() => void copyVoucher({ code, createdAt })}
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : undefined}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>凭证列表</CardTitle>
          </CardHeader>
          <CardContent className={cn(isFetching ? "opacity-60" : undefined)}>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <FilterSelect
                label="类型"
                onChange={(value) => {
                  setTypeFilter(value);
                  setPage(1);
                }}
                options={TYPE_FILTERS}
                value={typeFilter}
              />
              <FilterSelect
                label="分发"
                onChange={(value) => {
                  setDistributionFilter(value);
                  setPage(1);
                }}
                options={DISTRIBUTION_FILTERS}
                value={distributionFilter}
              />
              <FilterSelect
                label="使用"
                onChange={(value) => {
                  setUsageFilter(value);
                  setPage(1);
                }}
                options={USAGE_FILTERS}
                value={usageFilter}
              />
            </div>

            {vouchers.length === 0 ? (
              <p className="text-muted-foreground text-sm">{emptyMessage}</p>
            ) : (
              <Table
                containerProps={{
                  "aria-label": "凭证列表",
                  role: "region",
                  tabIndex: 0,
                }}
              >
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          className={columnClass(header.column.id, "head")}
                          key={header.id}
                        >
                          {header.isPlaceholder ? undefined : <table.FlexRender header={header} />}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getAllCells().map((cell) => (
                        <TableCell className={columnClass(cell.column.id, "cell")} key={cell.id}>
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {distributeMutation.error ? (
              <p className="text-destructive mt-2 text-sm" role="alert">
                {isUnauthorized(distributeMutation.error)
                  ? "API Key 已失效，请重新登录"
                  : distributeMutation.error.message}
              </p>
            ) : undefined}
          </CardContent>
          {stats.total > 0 ? (
            <CardFooter className="flex flex-wrap items-center justify-between gap-3">
              <label className="text-muted-foreground flex items-center gap-2 text-xs">
                每页
                <select
                  aria-label="每页条数"
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-11 rounded-lg border px-2 text-sm outline-none focus-visible:ring-3 sm:h-8"
                  onChange={(event) => {
                    table.setPageSize(Number(event.target.value));
                  }}
                  value={table.state.pagination.pageSize}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                条
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-muted-foreground text-xs">
                  {hasFilters
                    ? `筛选出 ${total} 个 / 共 ${stats.total} 个`
                    : `共 ${stats.total} 个凭证`}
                </span>
                <PageControls
                  onPageChange={(next) => {
                    table.setPageIndex(next - 1);
                  }}
                  page={table.state.pagination.pageIndex + 1}
                  pageCount={table.getPageCount()}
                />
              </div>
            </CardFooter>
          ) : undefined}
        </Card>
      </div>
    </main>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-6 text-center">
      <p className="text-muted-foreground text-sm">{children}</p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card ring-foreground/10 rounded-xl px-4 py-3 ring-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-heading mt-1 text-2xl leading-none">{value}</dd>
    </div>
  );
}

function buildColumns(distributedCodes: Set<string>, onCopy: (voucher: Voucher) => void) {
  return columnHelper.columns([
    columnHelper.accessor("code", {
      header: "凭证码",
      cell: ({ getValue }) => <code className="font-mono text-xs break-all">{getValue()}</code>,
    }),
    columnHelper.accessor("type", {
      header: "类型",
      cell: ({ getValue }) => <Pill>{voucherTypeLabel(getValue())}</Pill>,
    }),
    columnHelper.display({
      id: "status",
      header: "状态",
      cell: ({ row }) => {
        const voucher = row.original;
        const isDistributed = voucher.platform !== null;
        return (
          <div className="flex flex-wrap gap-1.5">
            <Pill active={isDistributed}>
              {voucher.platform === null ? "未分发" : `已分发 · ${platformLabel(voucher.platform)}`}
            </Pill>
            <Pill>{statusOf(voucher)}</Pill>
          </div>
        );
      },
    }),
    columnHelper.accessor((voucher) => `${voucher.generatedCount} / ${voucher.totalImages}`, {
      id: "usage",
      header: "已用 / 额度",
      cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
    }),
    columnHelper.accessor(
      (voucher) =>
        `${voucher.generatedCount + voucher.editsUsed} / ${
          voucher.totalImages + voucher.totalImages * voucher.maxEdits
        }`,
      {
        id: "totalUsage",
        header: "已用 / 总次数",
        cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
      },
    ),
    columnHelper.accessor("createdAt", {
      header: "创建时间",
      cell: ({ getValue }) => new Date(getValue()).toLocaleString("zh-CN", { hour12: false }),
    }),
    columnHelper.display({
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <CopyButton
          code={row.original.code}
          disabled={row.original.platform !== null || distributedCodes.has(row.original.code)}
          onClick={() => {
            onCopy(row.original);
          }}
        />
      ),
    }),
  ]);
}

function columnClass(columnId: string, kind: "head" | "cell") {
  if (columnId === "createdAt") return "hidden md:table-cell";
  if (columnId === "code" && kind === "cell") return "max-w-[16rem] whitespace-normal";
  if (columnId === "status" && kind === "cell") return "whitespace-normal";
  if (columnId === "actions") return "text-right";
  return;
}

function FilterSelect<T extends string>({
  label,
  options,
  onChange,
  value,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  value: T;
}) {
  return (
    <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
      {label}
      <select
        className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-11 rounded-lg border px-2 text-sm outline-none focus-visible:ring-3 sm:h-8"
        onChange={(event) => {
          onChange(event.target.value as T);
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Pill({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs whitespace-nowrap",
        active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function PageControls({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <Pagination aria-label="分页" className="mx-0 w-auto">
      <PaginationContent className="flex-wrap justify-end">
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={page <= 1}
            className={cn("h-11 sm:h-8", page <= 1 && "pointer-events-none opacity-50")}
            href="#"
            onClick={(event) => {
              event.preventDefault();
              if (page > 1) onPageChange(page - 1);
            }}
            tabIndex={page <= 1 ? -1 : undefined}
            text="上一页"
          />
        </PaginationItem>

        <PaginationItem className="sm:hidden">
          <span className="text-muted-foreground px-1 text-xs">
            {page} / {pageCount}
          </span>
        </PaginationItem>

        {pageItems(page, pageCount).map((item, index) =>
          item === "ellipsis" ? (
            <PaginationItem className="hidden sm:block" key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem className="hidden sm:block" key={item}>
              <PaginationLink
                className="size-11 sm:size-8"
                href="#"
                isActive={item === page}
                onClick={(event) => {
                  event.preventDefault();
                  onPageChange(item);
                }}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            aria-disabled={page >= pageCount}
            className={cn("h-11 sm:h-8", page >= pageCount && "pointer-events-none opacity-50")}
            href="#"
            onClick={(event) => {
              event.preventDefault();
              if (page < pageCount) onPageChange(page + 1);
            }}
            tabIndex={page >= pageCount ? -1 : undefined}
            text="下一页"
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function pageItems(page: number, pageCount: number): (number | "ellipsis")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = [...new Set([1, pageCount, page - 1, page, page + 1])]
    .filter((value) => value >= 1 && value <= pageCount)
    .toSorted((left, right) => left - right);
  const items: (number | "ellipsis")[] = [];
  let previous = 0;
  for (const value of pages) {
    if (previous !== 0 && value - previous > 1) items.push("ellipsis");
    items.push(value);
    previous = value;
  }
  return items;
}

function CopyButton({
  code,
  disabled,
  onClick,
}: {
  code: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={disabled ? "凭证已分发，不能复制" : `复制凭证码 ${code}`}
      className="h-11 shrink-0 px-3 sm:h-8"
      disabled={disabled}
      onClick={onClick}
      size="sm"
      type="button"
      variant="outline"
    >
      {disabled ? "已分发" : "复制"}
    </Button>
  );
}

function statusOf(voucher: Voucher) {
  if (voucher.generatedCount === 0) return "未使用";
  if (voucher.generatedCount < voucher.totalImages) return "使用中";
  return "已用完";
}
