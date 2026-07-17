import { useCallback, useEffect, useState } from "react";
import {
  Container as ContainerIcon,
  Play,
  Square,
  RotateCw,
  RefreshCw,
  Layers,
  Loader2,
} from "lucide-react";
import type { DockerContainer, DockerImage } from "@/lib/types";
import {
  dockerAvailable,
  dockerContainers,
  dockerImages,
  dockerAction,
  isTauri,
} from "@/lib/ipc";
import { useAppStore } from "@/store/app";
import { cn } from "@/lib/cn";

/** Docker containers + images, driven by the local `docker` CLI. */
export function Docker() {
  const pushToast = useAppStore((s) => s.pushToast);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const ok = await dockerAvailable();
    setAvailable(ok);
    if (!ok) {
      setContainers([]);
      setImages([]);
      return;
    }
    const [cs, imgs] = await Promise.all([dockerContainers(), dockerImages()]);
    setContainers(cs);
    setImages(imgs);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function act(action: "start" | "stop" | "restart", c: DockerContainer) {
    setBusy(true);
    try {
      await dockerAction(action, c.id);
      await refresh();
      pushToast({ variant: "success", title: `Container ${action}ed`, description: c.name });
    } catch (e) {
      pushToast({ variant: "error", title: `Docker ${action} failed`, description: String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
          <ContainerIcon className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Containers</h1>
          <p className="text-sm text-fg-subtle">Docker containers and images on this machine.</p>
        </div>
        <button
          onClick={() => void refresh()}
          className="no-drag ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} /> Refresh
        </button>
      </header>

      {available === null ? (
        <Centered>
          <Loader2 className="h-5 w-5 animate-spin text-fg-subtle" />
        </Centered>
      ) : !available ? (
        <div className="rounded-xl border border-white/[0.08] bg-black/20 p-8 text-center">
          <ContainerIcon className="mx-auto h-8 w-8 text-fg-subtle" />
          <p className="mt-3 text-sm text-fg-muted">
            {isTauri()
              ? "Docker isn't available — install Docker and start the daemon."
              : "Docker preview — open the desktop app to talk to the daemon."}
          </p>
        </div>
      ) : (
        <>
          {/* Containers */}
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
              <ContainerIcon className="h-4 w-4 text-accent" />
              Containers
              <span className="rounded bg-white/[0.06] px-1.5 text-[11px] text-fg-subtle">
                {containers.length}
              </span>
            </h2>
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
              {containers.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-fg-subtle">No containers.</p>
              ) : (
                containers.map((c) => {
                  const running = c.state === "running";
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-2.5 last:border-b-0"
                    >
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          running
                            ? "bg-success shadow-[0_0_8px_hsl(var(--success))]"
                            : "bg-fg-subtle",
                        )}
                        title={c.state}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-fg">{c.name}</span>
                          <span className="truncate font-mono text-[11px] text-fg-subtle">
                            {c.image}
                          </span>
                        </div>
                        <div className="truncate text-[11px] text-fg-subtle">
                          {c.status}
                          {c.ports && ` · ${c.ports}`}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {running ? (
                          <>
                            <IconBtn onClick={() => void act("restart", c)} disabled={busy} title="Restart">
                              <RotateCw className="h-3.5 w-3.5" />
                            </IconBtn>
                            <IconBtn onClick={() => void act("stop", c)} disabled={busy} title="Stop">
                              <Square className="h-3.5 w-3.5" />
                            </IconBtn>
                          </>
                        ) : (
                          <IconBtn onClick={() => void act("start", c)} disabled={busy} title="Start">
                            <Play className="h-3.5 w-3.5" />
                          </IconBtn>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Images */}
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
              <Layers className="h-4 w-4 text-accent" />
              Images
              <span className="rounded bg-white/[0.06] px-1.5 text-[11px] text-fg-subtle">
                {images.length}
              </span>
            </h2>
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
              {images.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-fg-subtle">No images.</p>
              ) : (
                images.map((img, i) => (
                  <div
                    key={`${img.id}:${i}`}
                    className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-2 text-sm last:border-b-0"
                  >
                    <span className="truncate font-medium text-fg">
                      {img.repository}
                      <span className="text-fg-subtle">:{img.tag}</span>
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-fg-subtle">
                      {img.size}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="no-drag rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-white/[0.06] hover:text-fg disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-40 items-center justify-center">{children}</div>;
}
