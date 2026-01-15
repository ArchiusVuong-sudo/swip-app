"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { ApiConfiguration } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, TestTube, CheckCircle, XCircle } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const [environment, setEnvironment] = useState("sandbox");
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("api_configurations")
        .select("*")
        .eq("user_id", user.id)
        .eq("environment", environment)
        .single();

      if (data) {
        const config = data as ApiConfiguration;
        setApiKey(config.api_key || "");
      }

      // Load from env as defaults
      setApiKey(process.env.NEXT_PUBLIC_SAFEPACKAGE_API_KEY || "");
      setClientId(process.env.SAFEPACKAGE_CLIENT_ID || "");
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const baseUrl = environment === "sandbox"
        ? "https://sandbox.safepackage.com"
        : "https://api.safepackage.com";

      const { error } = await (supabase
        .from("api_configurations") as ReturnType<typeof supabase.from>)
        .upsert({
          user_id: user.id,
          environment,
          api_key: apiKey,
          base_url: baseUrl,
          is_active: true,
        } as Record<string, unknown>, {
          onConflict: "user_id,environment",
        });

      if (error) throw error;

      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/safepackage/platforms");

      if (response.ok) {
        setTestResult("success");
        toast.success("API connection successful!");
      } else {
        setTestResult("error");
        toast.error("API connection failed");
      }
    } catch (error) {
      setTestResult("error");
      toast.error("API connection failed");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Configure your SafePackage API credentials and preferences.
        </p>
      </div>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>SafePackage API Configuration</CardTitle>
          <CardDescription>
            Enter your API credentials to connect to the SafePackage service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Environment Selection */}
          <div className="space-y-2">
            <Label htmlFor="environment">Environment</Label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger id="environment" className="w-full max-w-xs">
                <SelectValue placeholder="Select environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Sandbox</Badge>
                    <span>Testing environment</span>
                  </div>
                </SelectItem>
                <SelectItem value="production">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Production</Badge>
                    <span>Live environment</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Use Sandbox for testing, Production for live operations.
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your SafePackage API key"
              className="max-w-lg"
            />
            <p className="text-sm text-muted-foreground">
              Your API key is stored securely and used for authentication.
            </p>
          </div>

          {/* Client ID */}
          <div className="space-y-2">
            <Label htmlFor="clientId">Client ID (Optional)</Label>
            <Input
              id="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Enter your SafePackage Client ID"
              className="max-w-lg"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || !apiKey}
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="mr-2 h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>

            {testResult === "success" && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Connection successful</span>
              </div>
            )}
            {testResult === "error" && (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">Connection failed</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>
            Current API connection status and environment information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Environment</p>
              <Badge variant={environment === "sandbox" ? "secondary" : "default"}>
                {environment === "sandbox" ? "Sandbox" : "Production"}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">API Endpoint</p>
              <p className="text-sm text-muted-foreground">
                {environment === "sandbox"
                  ? "sandbox.safepackage.com"
                  : "api.safepackage.com"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">API Key Status</p>
              <Badge variant={apiKey ? "default" : "destructive"}>
                {apiKey ? "Configured" : "Not Set"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
