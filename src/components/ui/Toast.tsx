interface Props {
  icon: string;
  message: string;
  visible: boolean;
}

export function Toast({ icon, message, visible }: Props) {
  return (
    <div
      className="fixed bottom-6 left-1/2 flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13px] whitespace-nowrap pointer-events-none z-[200] transition-all duration-300"
      style={{
        transform: `translateX(-50%) translateY(${visible ? "0" : "12px"})`,
        opacity: visible ? 1 : 0,
        background: "var(--bg3)",
        border: "1px solid var(--border2)",
        color: "var(--bright)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
      }}
    >
      <span>{icon}</span>
      <span>{message}</span>
    </div>
  );
}
