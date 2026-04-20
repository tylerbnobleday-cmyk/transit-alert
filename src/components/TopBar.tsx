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
    <div className="absolute left-0 right-0 top-0 z-50 flex flex-col gap-3 p-3 pointer-events-none sm:flex-row sm:items-start sm:justify-between sm:gap-0 sm:p-6">
      {/* Left controls */}
      <div className="pointer-events-auto flex min-w-0 items-center gap-2 sm:gap-3">
        {user && (
          <button
            type="button"
            onClick={onOpenUserMenu}
            className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-card/80 p-2 pr-3 shadow-xl shadow-black/50 backdrop-blur-xl transition hover:bg-card sm:gap-3 sm:pr-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white sm:h-11 sm:w-11">
              {user.username.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 max-w-[5.2rem] sm:max-w-none">
              <p className="truncate text-sm font-semibold text-white">{user.username}</p>
              <p className="truncate text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {user.role}
              </p>
            </div>
          </button>
        )}

        <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-card/80 p-2 pr-3 shadow-xl shadow-black/50 backdrop-blur-xl sm:gap-3 sm:pr-4">
          <img 
            src={`${import.meta.env.BASE_URL}images/app-logo.png`} 
            alt="Transit Alert" 
            className="h-10 w-10 shrink-0 rounded-xl"
          />
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-bold leading-none tracking-tight text-white sm:text-lg">TransitAlert</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Melbourne</p>
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div className="pointer-events-auto flex items-center justify-end gap-3 sm:flex-col sm:items-end sm:gap-4">
        <button
          type="button"
          onClick={onOpenAlerts}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-card/90 p-3 text-left shadow-xl transition hover:bg-card"
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
          className="group relative z-[60] flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-primary shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-95 hover:scale-105 hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] sm:h-14 sm:w-14"
        >
          <MessageSquare className="relative z-10 h-5 w-5 text-primary-foreground sm:h-6 sm:w-6" />
          <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
          
          {/* Unread dot */}
          <span className="absolute top-0 right-0 w-3 h-3 bg-destructive rounded-full border-2 border-primary z-20"></span>
        </button>
      </div>
    </div>
  );
}
