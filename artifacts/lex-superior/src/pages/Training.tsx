import React, { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Database, CheckCircle2, XCircle, ExternalLink, Loader2,
  Play, RefreshCw, Unlink, FileText, AlertCircle, Key,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DriveStatus {
  configured: boolean;
  connected: boolean;
  hasApiKeyFallback: boolean;
}

interface SwarmProgress {
  status: "idle" | "running" | "complete" | "error";
  startedAt?: string;
  completedAt?: string;
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
  results: Array<{
    filename: string;
    fileId: string;
    agentResults: Record<string, { ok: boolean; snippet: string }>;
  }>;
  error?: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

const SECRETS_TABLE = [
  { key: "GOOGLE_CLIENT_ID", purpose: "OAuth app client ID from Google Cloud Console" },
  { key: "GOOGLE_CLIENT_SECRET", purpose: "OAuth app client secret" },
  { key: "ANTHROPIC_API_KEY", purpose: "Claude API key for the agent swarm" },
  { key: "GOOGLE_REFRESH_TOKEN", purpose: "Auto-reconnect after server restart (logged after first auth)" },
];

export default function Training() {
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [swarmProgress, setSwarmProgress] = useState<SwarmProgress | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [folderId, setFolderId] = useState("");
  const [maxFiles, setMaxFiles] = useState(10);
  const [loading, setLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const authWindowRef = useRef<Window | null>(null);

  const fetchDriveStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/training/drive-status");
      const data = await res.json() as DriveStatus;
      setDriveStatus(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchSwarmProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/training/status");
      const data = await res.json() as SwarmProgress;
      setSwarmProgress(data);
      if (data.status !== "running") {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchDriveStatus();
    fetchSwarmProgress();

    const handleMessage = (e: MessageEvent) => {
      if (e.data === "drive-connected") {
        fetchDriveStatus();
        toast.success("Google Drive connected!");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [fetchDriveStatus, fetchSwarmProgress]);

  // Poll while swarm is running
  useEffect(() => {
    if (swarmProgress?.status === "running") {
      pollRef.current = setInterval(fetchSwarmProgress, 2000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [swarmProgress?.status, fetchSwarmProgress]);

  const handleConnect = () => {
    authWindowRef.current = window.open(
      "/api/training/drive-auth",
      "drive-auth",
      "width=600,height=700,left=200,top=100"
    );
  };

  const handleDisconnect = async () => {
    await fetch("/api/training/drive-disconnect", { method: "DELETE" });
    await fetchDriveStatus();
    toast.success("Google Drive disconnected");
  };

  const handlePreviewFiles = async () => {
    setFilesLoading(true);
    try {
      const params = new URLSearchParams({ maxFiles: String(maxFiles) });
      if (folderId) params.set("folderId", folderId);
      const res = await fetch(`/api/training/drive-files?${params}`);
      const data = await res.json() as { files: DriveFile[]; count: number };
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed");
      setDriveFiles(data.files);
      toast.success(`Found ${data.count} files`);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setFilesLoading(false);
    }
  };

  const handleStartSwarm = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/training/drive-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: folderId || undefined, maxFiles }),
      });
      const data = await res.json() as { status?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to start");
      toast.success(data.status === "started" ? "Agent swarm launched!" : "Already running");
      await fetchSwarmProgress();
      pollRef.current = setInterval(fetchSwarmProgress, 2000);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  };

  const isRunning = swarmProgress?.status === "running";
  const isConnected = driveStatus?.connected || driveStatus?.hasApiKeyFallback;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold">AI Training</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Connect Google Drive and run the 5-agent Claude swarm to extract legal knowledge from your documents.
          </p>
        </div>

        <div className="space-y-6">
          {/* Drive Connection Card */}
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ExternalLink className="w-4 h-4 text-primary" />
                Google Drive Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {driveStatus === null ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking status…
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <><CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span className="font-medium text-emerald-400">
                          {driveStatus.connected ? "OAuth Connected" : "API Key (public files only)"}
                        </span></>
                    ) : (
                      <><XCircle className="w-5 h-5 text-rose-400" />
                        <span className="font-medium text-rose-400">Not Connected</span></>
                    )}
                  </div>
                  <div className="flex gap-2 sm:ml-auto">
                    {driveStatus.connected ? (
                      <Button variant="outline" size="sm" onClick={handleDisconnect}
                        className="border-rose-400/30 text-rose-400 hover:bg-rose-400/10">
                        <Unlink className="w-3.5 h-3.5 mr-1.5" /> Disconnect
                      </Button>
                    ) : (
                      <Button size="sm" onClick={handleConnect}
                        disabled={!driveStatus.configured}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Connect Google Drive
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={fetchDriveStatus}>
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {driveStatus && !driveStatus.configured && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-400/10 border border-amber-400/20 text-sm text-amber-300">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Set <code className="bg-white/10 px-1 rounded">GOOGLE_CLIENT_ID</code> and <code className="bg-white/10 px-1 rounded">GOOGLE_CLIENT_SECRET</code> in Replit Secrets to enable OAuth.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Required Secrets Card */}
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="w-4 h-4 text-primary" />
                Required Replit Secrets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Secret</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SECRETS_TABLE.map((row) => (
                      <tr key={row.key} className="border-b border-white/5">
                        <td className="py-2 pr-4">
                          <code className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {row.key}
                          </code>
                        </td>
                        <td className="py-2 text-muted-foreground">{row.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Swarm Launcher Card */}
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Play className="w-4 h-4 text-primary" />
                Agent Swarm Launcher
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="folderId">Folder ID <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="folderId"
                    placeholder="Leave blank for all My Drive files"
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxFiles">Max Files <span className="text-muted-foreground">(1–50)</span></Label>
                  <Input
                    id="maxFiles"
                    type="number"
                    min={1}
                    max={50}
                    value={maxFiles}
                    onChange={(e) => setMaxFiles(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleStartSwarm}
                  disabled={loading || isRunning || !isConnected}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isRunning ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running…</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" /> Start Agent Swarm</>
                  )}
                </Button>
                <Button variant="outline" onClick={handlePreviewFiles} disabled={filesLoading || !isConnected}
                  className="border-white/10">
                  {filesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                  Preview Files
                </Button>
              </div>

              {/* File preview */}
              {driveFiles.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground mb-2">{driveFiles.length} file(s) found:</p>
                  {driveFiles.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 text-sm py-1">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{f.name}</span>
                      <Badge className="ml-auto text-[10px] bg-white/5 border-0 text-muted-foreground shrink-0">
                        {f.mimeType === "application/vnd.google-apps.document" ? "Google Doc" : f.mimeType.split("/")[1]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress Card */}
          {swarmProgress && swarmProgress.status !== "idle" && (
            <Card className={cn(
              "glass-card border",
              swarmProgress.status === "complete" && "border-emerald-400/30",
              swarmProgress.status === "error" && "border-rose-400/30",
              swarmProgress.status === "running" && "border-primary/30",
            )}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {swarmProgress.status === "running" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                  {swarmProgress.status === "complete" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {swarmProgress.status === "error" && <XCircle className="w-4 h-4 text-rose-400" />}
                  Swarm Progress
                  <Badge className={cn(
                    "ml-auto text-xs border-0",
                    swarmProgress.status === "running" && "bg-primary/20 text-primary",
                    swarmProgress.status === "complete" && "bg-emerald-400/20 text-emerald-400",
                    swarmProgress.status === "error" && "bg-rose-400/20 text-rose-400",
                  )}>
                    {swarmProgress.status.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {swarmProgress.status === "error" && (
                  <p className="text-sm text-rose-400">{swarmProgress.error}</p>
                )}

                {(swarmProgress.status === "running" || swarmProgress.status === "complete") && (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {swarmProgress.processedFiles} / {swarmProgress.totalFiles || "?"} files
                        </span>
                        {swarmProgress.currentFile && (
                          <span className="text-xs text-muted-foreground truncate max-w-[60%] text-right">
                            {swarmProgress.currentFile}
                          </span>
                        )}
                      </div>
                      {swarmProgress.totalFiles > 0 && (
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${(swarmProgress.processedFiles / swarmProgress.totalFiles) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {swarmProgress.results.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Processed</p>
                        {swarmProgress.results.map((r) => {
                          const agentCount = Object.values(r.agentResults).filter((a) => a.ok).length;
                          return (
                            <div key={r.fileId} className="flex items-center gap-2 text-sm py-1.5 border-b border-white/5">
                              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="flex-1 truncate">{r.filename}</span>
                              <Badge className="text-[10px] bg-emerald-400/10 text-emerald-400 border-0">
                                {agentCount}/5 agents
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {swarmProgress.completedAt && (
                  <p className="text-xs text-muted-foreground">
                    Completed: {new Date(swarmProgress.completedAt).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
