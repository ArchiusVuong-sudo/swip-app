"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Loader2, TestTube, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { useEnvironmentStore, type Environment } from "@/stores/environment-store";
import { ENVIRONMENT_CONFIG } from "@/lib/safepackage/client";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const { environment, setEnvironment } = useEnvironmentStore();

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
      const response = await fetch(`/api/safepackage/platforms?environment=${environment}`);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Configure your SafePackage API environment.
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
              <p className="text-sm font-medium">API Key Status</p>
              <Badge variant="default">
                Configured
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
