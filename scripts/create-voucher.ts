// 创建婚纱照凭证码（写入本地 D1；加 --remote 写线上 D1）：
// pnpm voucher:create -- --total 5 --count 10 [--remote]
import { spawnSync } from "node:child_process";
import { randomUUIDv7 } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

const USAGE = `用法:
  node scripts/create-voucher.ts [--total <每个凭证可生成张数>] [--count <凭证数量>] [--type <凭证类型>] [--remote]`;

const cliArguments = process.argv.slice(2);
// 兼容从仓库根目录执行：pnpm voucher:create -- --total 5 --count 10
if (cliArguments[0] === "--") cliArguments.shift();

const { values } = parseArgs({
  args: cliArguments,
  options: {
    total: { type: "string", default: "5" },
    count: { type: "string", default: "1" },
    type: { type: "string", default: "wedding" },
    remote: { type: "boolean", default: false },
  },
  allowPositionals: false,
});

const total = Number(values.total);
const count = Number(values.count);
if (!Number.isSafeInteger(total) || total <= 0) throw new Error(`${USAGE}\n--total 必须是正整数`);
if (!Number.isSafeInteger(count) || count <= 0) throw new Error(`${USAGE}\n--count 必须是正整数`);
if (!/^[a-z][a-z\d-]*$/.test(values.type)) {
  throw new Error(`${USAGE}\n--type 只能包含小写字母、数字和连字符`);
}

const codes = Array.from({ length: count }, () => randomUUIDv7());
const createdAt = Date.now();
const statements = codes.map(
  (code) =>
    `INSERT INTO vouchers (code, type, total_images, generated_count, created_at) VALUES ('${code}', '${values.type}', ${total}, 0, ${createdAt});`,
);

const directory = mkdtempSync(path.join(tmpdir(), "likeness-vouchers-"));
const file = path.join(directory, "vouchers.sql");
writeFileSync(file, statements.join("\n"));

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "wrangler",
    "d1",
    "execute",
    "likeness",
    values.remote ? "--remote" : "--local",
    `--file=${file}`,
    "--yes",
  ],
  { stdio: "inherit" },
);
rmSync(directory, { recursive: true, force: true });

if (result.status === 0) {
  for (const code of codes) console.log(code);
} else {
  process.exitCode = result.status ?? 1;
}
