interface FollowGuideProperties {
  compact?: boolean;
}

// 关注弹窗接口已下线，也没有关注状态查询 API；只能引导用户点容器右上角的「···」关注。
export function FollowGuide({ compact = false }: FollowGuideProperties) {
  return (
    <aside
      aria-label="关注博主"
      className={`border border-[#ffe0e6] bg-[#fff7f8] ${
        compact ? "mt-3 rounded-[12px] px-3 py-3" : "mt-6 rounded-[16px] px-4 py-3.5"
      }`}
    >
      <p className="m-0 text-sm font-semibold text-ink">不会抠图也能自己做</p>
      <p className="mb-0 mt-1 text-xs leading-[1.6] text-ink-soft">
        关注博主，去主页用 AI 自助生成同款透明底人像。
      </p>
      <p className="mb-0 mt-2 text-[11px] font-medium text-brand-strong">
        点页面右上角「···」→「关注」
      </p>
    </aside>
  );
}
