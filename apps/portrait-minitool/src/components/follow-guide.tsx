interface FollowGuideProperties {
  compact?: boolean;
}

// 关注弹窗接口已下线，也没有关注状态查询 API；只能引导用户点容器右上角的「···」关注。
export function FollowGuide({ compact = false }: FollowGuideProperties) {
  return (
    <aside aria-label="关注博主" className={`follow-guide ${compact ? "is-compact" : ""}`}>
      <p className="follow-guide-title">不会抠图也能自己做</p>
      <p className="follow-guide-copy">关注博主，去主页用 AI 自助生成同款透明底人像。</p>
      <p className="follow-guide-hint">点页面右上角「···」→「关注」</p>
    </aside>
  );
}
