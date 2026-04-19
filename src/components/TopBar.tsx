import { MessageSquare } from "lucide-react";
import { Badge } from "./ui/badge";
import { useGetReportStats } from "@/lib/api-client-react/src/generated/api";

interface TopBarProps {
  onOpenChat: () => void;
  onOpenAlerts: () => void;
  onOpenUserMenu: () => void;
  user?: {
    username: string;
    role: string;
    isAdmin: boolean;
  } | null;
}

export function TopBar({ onOpenChat, onOpenAlerts, onOpenUserMenu, user }: TopBarProps) {
  const { data: stats } = useGetReportStats({
    query: { refetchInterval: 60000 }
  });

  const alertsToday = stats?.alertsToday || 0;
  const isHighAlert = alertsToday > 100;

  return (
    <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 z-50 flex items-start justify-between pointer-events-none">
      {/* Left controls */}
      <div className="pointer-events-auto flex items-center gap-3">
        {user && (
          <button
            type="button"
            onClick={onOpenUserMenu}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-card/80 p-2 pr-4 shadow-xl shadow-black/50 backdrop-blur-xl transition hover:bg-card"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
              {user.username.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user.username}</p>
              <p className="truncate text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {user.role}
              </p>
            </div>
          </button>
        )}

        <div className="flex items-center gap-3 bg-card/80 backdrop-blur-xl p-2 pr-4 rounded-2xl border border-white/10 shadow-xl shadow-black/50">
          <img 
            src={`${import.meta.env.BASE_URL}images/app-logo.png`} 
            alt="Transit Alert" 
            className="w-10 h-10 rounded-xl"
          />
          <div>
            <h1 className="font-display font-bold text-lg leading-none text-white tracking-tight">TransitAlert</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Melbourne</p>
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex flex-col items-end gap-4 pointer-events-auto">
        <button
          type="button"
          onClick={onOpenAlerts}
          className="bg-card/90 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-xl flex items-center gap-3 text-left transition hover:bg-card"
        >
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Today&apos;s Alerts</span>
            <span className="font-display font-bold text-xl text-white leading-none mt-1">{alertsToday}</span>
          </div>
          <Badge variant={isHighAlert ? "destructive" : "default"} className="animate-pulse-slow">
            {isHighAlert ? "High" : "Normal"}
          </Badge>
        </button>

        <button 
          type="button"
          onClick={onOpenChat}
          className="group relative z-[60] flex items-center justify-center w-14 h-14 bg-primary rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:scale-105 transition-all active:scale-95 border border-white/20"
        >
          <MessageSquare className="w-6 h-6 text-primary-foreground relative z-10" />
          <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
          
          {/* Unread dot */}
          <span className="absolute top-0 right-0 w-3 h-3 bg-destructive rounded-full border-2 border-primary z-20"></span>
        </button>
      </div>
    </div>
  );
}
