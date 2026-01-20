"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Loader2, TestTube, CheckCircle, XCircle, AlertTriangle, Info, Eye, EyeOff, Key, Trash2 } from "lucide-react";
import { useEnvironmentStore, type Environment } from "@/stores/environment-store";
import { ENVIRONMENT_CONFIG } from "@/lib/safepackage/client";

export default function SettingsPage() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [showSandboxKey, setShowSandboxKey] = useState(false);
  const [showProductionKey, setShowProductionKey] = useState(false);
  const [sandboxKeyInput, setSandboxKeyInput] = useState("");
  const [productionKeyInput, setProductionKeyInput] = useState("");

  const { environment, setEnvironment, apiKeys, setApiKey, clearApiKey } = useEnvironmentStore();

  // Get the current environment config
  const currentConfig = ENVIRONMENT_CONFIG[environment];

  const handleEnvironmentChange = (newEnv: Environment) => {
    setEnvironment(newEnv);
    setTestResult(null);
    toast.success(`Switched to ${newEnv === "production" ? "Production" : "Sandbox"} environment`);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Include the user's API key if they have one configured
      const userApiKey = apiKeys[environment];
      const url = new URL(`/api/safepackage/platforms`, window.location.origin);
      url.searchParams.set("environment", environment);
      if (userApiKey) {
        url.searchParams.set("apiKey", userApiKey);
      }

      const response = await fetch(url.toString());

      if (response.ok) {
        setTestResult("success");
        toast.success("API connection successful!");
      } else {
        setTestResult("error");
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || "API connection failed");
      }
    } catch (error) {
      setTestResult("error");
      toast.error("API connection failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSaveApiKey = (env: Environment, key: string) => {
    if (!key.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    setApiKey(env, key.trim());
    if (env === "sandbox") {
      setSandboxKeyInput("");
    } else {
      setProductionKeyInput("");
    }
    toast.success(`${env === "sandbox" ? "Sandbox" : "Production"} API key saved`);
    setTestResult(null);
  };

  const handleClearApiKey = (env: Environment) => {
    clearApiKey(env);
    toast.success(`${env === "sandbox" ? "Sandbox" : "Production"} API key cleared. Using system default.`);
    setTestResult(null);
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return "••••••••";
    return key.substring(0, 4) + "••••••••" + key.substring(key.length - 4);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Configure your SafePackage API environment and credentials.
        </p>
      </div>

      {/* Production Warning */}
      {environment === "production" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Production Environment Active</AlertTitle>
          <AlertDescription>
            You are using the production SafePackage API. All operations will affect real data and incur charges.
          </AlertDescription>
        </Alert>
      )}

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>SafePackage API Environment</CardTitle>
          <CardDescription>
            Select the SafePackage API environment to use. Sandbox is for testing, Production is for live operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Environment Selection */}
          <div className="space-y-2">
            <Label htmlFor="environment">Environment</Label>
            <Select value={environment} onValueChange={(v) => handleEnvironmentChange(v as Environment)}>
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
                    <Badge variant="destructive">Production</Badge>
                    <span>Live environment</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {environment === "sandbox"
                ? "Sandbox mode is safe for testing. No real transactions will occur."
                : "Production mode uses live API. Use with caution."}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing}
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

      {/* API Keys Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Optionally configure your own API keys. If not provided, the system default keys will be used.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sandbox API Key */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Sandbox</Badge>
                <span className="text-sm font-medium">API Key</span>
              </div>
              {apiKeys.sandbox && (
                <Badge variant="outline" className="text-green-600">
                  Custom Key
                </Badge>
              )}
            </div>

            {apiKeys.sandbox ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2 bg-muted rounded font-mono text-sm">
                  {showSandboxKey ? apiKeys.sandbox : maskApiKey(apiKeys.sandbox)}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSandboxKey(!showSandboxKey)}
                >
                  {showSandboxKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleClearApiKey("sandbox")}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  placeholder="Enter your sandbox API key"
                  value={sandboxKeyInput}
                  onChange={(e) => setSandboxKeyInput(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleSaveApiKey("sandbox", sandboxKeyInput)}
                  disabled={!sandboxKeyInput.trim()}
                >
                  Save
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {apiKeys.sandbox
                ? "Using your custom sandbox API key."
                : "Using system default sandbox key. Enter your own key to override."}
            </p>
          </div>

          {/* Production API Key */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Production</Badge>
                <span className="text-sm font-medium">API Key</span>
              </div>
              {apiKeys.production && (
                <Badge variant="outline" className="text-green-600">
                  Custom Key
                </Badge>
              )}
            </div>

            {apiKeys.production ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2 bg-muted rounded font-mono text-sm">
                  {showProductionKey ? apiKeys.production : maskApiKey(apiKeys.production)}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowProductionKey(!showProductionKey)}
                >
                  {showProductionKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleClearApiKey("production")}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  placeholder="Enter your production API key"
                  value={productionKeyInput}
                  onChange={(e) => setProductionKeyInput(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleSaveApiKey("production", productionKeyInput)}
                  disabled={!productionKeyInput.trim()}
                >
                  Save
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {apiKeys.production
                ? "Using your custom production API key."
                : "Using system default production key. Enter your own key to override."}
            </p>
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
              <p className="text-sm font-medium">Active Environment</p>
              <Badge variant={environment === "sandbox" ? "secondary" : "destructive"}>
                {environment === "sandbox" ? "Sandbox" : "Production"}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">API Endpoint</p>
              <p className="text-sm text-muted-foreground">
                {currentConfig.baseUrl.replace("https://", "")}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">API Key Source</p>
              <Badge variant={apiKeys[environment] ? "default" : "secondary"}>
                {apiKeys[environment] ? "Custom Key" : "System Default"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Environment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Badge variant="secondary">Sandbox</Badge>
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Safe for testing and development</li>
                <li>- No real transactions or charges</li>
                <li>- Test data only</li>
                <li>- API: sandbox.safepackage.com</li>
              </ul>
            </div>
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Badge variant="destructive">Production</Badge>
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Real customs screening operations</li>
                <li>- Actual charges may apply</li>
                <li>- Live data and transactions</li>
                <li>- API: api.safepackage.com</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
