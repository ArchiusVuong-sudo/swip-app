"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Store } from "lucide-react";
import type { UserPlatform } from "@/types/database";

// Default platform suggestions
const DEFAULT_PLATFORMS = [
  { id: "amazon", name: "Amazon", url: "https://amazon.com" },
  { id: "ebay", name: "eBay", url: "https://ebay.com" },
  { id: "aliexpress", name: "AliExpress", url: "https://aliexpress.com" },
  { id: "wish", name: "Wish", url: "https://wish.com" },
  { id: "shopify", name: "Shopify", url: "" },
  { id: "temu", name: "Temu", url: "https://temu.com" },
  { id: "shein", name: "Shein", url: "https://shein.com" },
];

interface PlatformFormData {
  platform_id: string;
  platform_url: string;
  seller_id: string;
  is_enabled: boolean;
  notes: string;
}

export function PlatformManagement() {
  const [platforms, setPlatforms] = useState<UserPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<UserPlatform | null>(null);
  const [formData, setFormData] = useState<PlatformFormData>({
    platform_id: "",
    platform_url: "",
    seller_id: "",
    is_enabled: true,
    notes: "",
  });

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const response = await fetch("/api/platforms");
      if (!response.ok) throw new Error("Failed to fetch platforms");
      const data = await response.json();
      setPlatforms(data.platforms || []);
    } catch (error) {
      console.error("Error fetching platforms:", error);
      toast.error("Failed to load platforms");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (platform?: UserPlatform) => {
    if (platform) {
      setEditingPlatform(platform);
      setFormData({
        platform_id: platform.platform_id,
        platform_url: platform.platform_url || "",
        seller_id: platform.seller_id || "",
        is_enabled: platform.is_enabled,
        notes: platform.notes || "",
      });
    } else {
      setEditingPlatform(null);
      setFormData({
        platform_id: "",
        platform_url: "",
        seller_id: "",
        is_enabled: true,
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.platform_id.trim()) {
      toast.error("Platform ID is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save platform");
      }

      toast.success(editingPlatform ? "Platform updated" : "Platform added");
      setDialogOpen(false);
      fetchPlatforms();
    } catch (error) {
      console.error("Error saving platform:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save platform");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (platform: UserPlatform) => {
    try {
      const response = await fetch(`/api/platforms/${platform.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: !platform.is_enabled }),
      });

      if (!response.ok) throw new Error("Failed to update platform");

      setPlatforms(prev =>
        prev.map(p =>
          p.id === platform.id ? { ...p, is_enabled: !p.is_enabled } : p
        )
      );
      toast.success(`Platform ${!platform.is_enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error toggling platform:", error);
      toast.error("Failed to update platform");
    }
  };

  const handleDelete = async (platform: UserPlatform) => {
    if (!confirm(`Delete platform "${platform.platform_id}"?`)) return;

    try {
      const response = await fetch(`/api/platforms/${platform.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete platform");

      setPlatforms(prev => prev.filter(p => p.id !== platform.id));
      toast.success("Platform deleted");
    } catch (error) {
      console.error("Error deleting platform:", error);
      toast.error("Failed to delete platform");
    }
  };

  const handleSelectSuggestion = (suggestion: (typeof DEFAULT_PLATFORMS)[0]) => {
    setFormData(prev => ({
      ...prev,
      platform_id: suggestion.id,
      platform_url: suggestion.url,
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Platform Management
            </CardTitle>
            <CardDescription>
              Configure the e-commerce platforms you work with. Disabled platforms will be skipped during validation.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Platform
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingPlatform ? "Edit Platform" : "Add Platform"}
                </DialogTitle>
                <DialogDescription>
                  Configure platform details for CSV validation and API submissions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Suggestions */}
                {!editingPlatform && (
                  <div className="space-y-2">
                    <Label>Quick Add</Label>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_PLATFORMS.map(p => (
                        <Badge
                          key={p.id}
                          variant="outline"
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => handleSelectSuggestion(p)}
                        >
                          {p.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="platform_id">Platform ID *</Label>
                  <Input
                    id="platform_id"
                    value={formData.platform_id}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, platform_id: e.target.value }))
                    }
                    placeholder="e.g., amazon, ebay"
                    disabled={!!editingPlatform}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must match the platform_id in your CSV files
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform_url">Platform URL</Label>
                  <Input
                    id="platform_url"
                    value={formData.platform_url}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, platform_url: e.target.value }))
                    }
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seller_id">Default Seller ID</Label>
                  <Input
                    id="seller_id"
                    value={formData.seller_id}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, seller_id: e.target.value }))
                    }
                    placeholder="Your seller ID on this platform"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Optional notes..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_enabled">Enabled</Label>
                  <Switch
                    id="is_enabled"
                    checked={formData.is_enabled}
                    onCheckedChange={checked =>
                      setFormData(prev => ({ ...prev, is_enabled: checked }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingPlatform ? "Update" : "Add"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {platforms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No platforms configured yet.</p>
            <p className="text-sm">Add platforms to enable validation filtering.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform ID</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Seller ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platforms.map(platform => (
                <TableRow key={platform.id}>
                  <TableCell className="font-medium">
                    {platform.platform_id}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {platform.platform_url || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {platform.seller_id || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={platform.is_enabled}
                        onCheckedChange={() => handleToggle(platform)}
                      />
                      <Badge
                        variant={platform.is_enabled ? "default" : "secondary"}
                      >
                        {platform.is_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(platform)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(platform)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
