import type { View } from "../types";

type SidebarProps = {
  activeView: View;
  isOnline: boolean;
  onViewChange: (view: View) => void;
};

export function Sidebar({ activeView, isOnline, onViewChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">Streamline</div>
      <nav>
        {(["home", "search", "profile"] as View[]).map((view) => (
          <button key={view} className={activeView === view ? "active" : ""} onClick={() => onViewChange(view)}>
            {view}
          </button>
        ))}
      </nav>
      <div className={`status-pill ${isOnline ? "online" : "offline"}`}>{isOnline ? "Online" : "Offline"}</div>
    </aside>
  );
}
