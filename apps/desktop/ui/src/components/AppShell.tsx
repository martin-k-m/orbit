import { AnimatePresence, motion } from "framer-motion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TitleBar } from "@/components/TitleBar";
import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { Toaster } from "@/components/Toaster";
import { UpdateBanner } from "@/components/UpdateBanner";
import { useAppStore } from "@/store/app";
import { Dashboard } from "@/views/Dashboard";
import { Analytics } from "@/views/Analytics";
import { Ecosystem } from "@/views/Ecosystem";
import { Docker } from "@/views/Docker";
import { Database } from "@/views/Database";
import { ApiExplorer } from "@/views/ApiExplorer";
import { Settings } from "@/views/Settings";
import { ProjectView } from "@/views/ProjectView";

export function AppShell() {
  const view = useAppStore((s) => s.view);

  const key =
    view.kind === "project" ? `project:${view.id}` : view.kind;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-bg text-fg">
        {/* Ambient background wash */}
        <div className="pointer-events-none absolute inset-0 bg-radial-fade" />
        <div className="pointer-events-none absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />
        <div className="pointer-events-none absolute -right-40 top-10 h-96 w-96 rounded-full bg-accent-2/10 blur-[120px]" />

        <TitleBar />
        <UpdateBanner />

        <div className="relative flex min-h-0 flex-1">
          <Sidebar />

          <main className="scrollbar-thin relative min-w-0 flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="mx-auto w-full max-w-6xl px-8 py-8"
              >
                {view.kind === "dashboard" && <Dashboard />}
                {view.kind === "analytics" && <Analytics />}
                {view.kind === "ecosystem" && <Ecosystem />}
                {view.kind === "docker" && <Docker />}
                {view.kind === "database" && <Database />}
                {view.kind === "apis" && <ApiExplorer />}
                {view.kind === "settings" && <Settings />}
                {view.kind === "project" && (
                  <ProjectView projectId={view.id} path={view.path} />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <CommandPalette />
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
