import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Settings from "@/pages/Settings";
import TodaysAlerts from "@/pages/TodaysAlerts";
import NotFound from "@/pages/not-found";

// Initialize QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/app" component={Home} />
      <Route path="/settings" component={Settings} />
      <Route path="/login" component={Login} />
      <Route path="/alerts/today" component={TodaysAlerts} />
      <Route component={NotFound} />
    </Switch>
  );
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error) {
    console.error("Transit Alert crashed during render", error);
  }

  override render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-6 text-foreground">
        <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-card/90 p-6 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
            App Error
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white">
            The page hit a runtime error instead of loading.
          </h1>
          <p className="mt-3 text-sm text-white/65">
            Refresh the page after this patch lands. If it still fails, this panel will show the
            actual message instead of leaving the screen black.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-amber-100">
            {this.state.error.message || "Unknown runtime error"}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
          >
            Reload app
          </button>
        </div>
      </main>
    );
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppErrorBoundary>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AppErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
