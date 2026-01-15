import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
} from "lucide-react";

interface PackageRow {
  status: string;
}

async function getStats(userId: string) {
  const supabase = await createClient();

  // Get upload counts
  const { count: uploadCount } = await supabase
    .from("uploads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Get package counts by status
  const { data: packages } = await supabase
    .from("packages")
    .select("status")
    .eq("user_id", userId);

  const pkgData = (packages || []) as PackageRow[];
  const packageStats = {
    total: pkgData.length,
    accepted: pkgData.filter((p) => p.status === "accepted").length,
    rejected: pkgData.filter((p) => p.status === "rejected").length,
    pending: pkgData.filter((p) => p.status === "pending").length,
  };

  // Get shipment counts
  const { count: shipmentCount } = await supabase
    .from("shipments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  return {
    uploads: uploadCount || 0,
    packages: packageStats,
    shipments: shipmentCount || 0,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Default stats for new users or if no data
  let stats = {
    uploads: 0,
    packages: { total: 0, accepted: 0, rejected: 0, pending: 0 },
    shipments: 0,
  };

  if (user) {
    try {
      stats = await getStats(user.id);
    } catch (error) {
      // Tables may not exist yet, use defaults
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome back!</h2>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your customs screening activity.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uploads}</div>
            <p className="text-xs text-muted-foreground">CSV files processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.packages.total}</div>
            <p className="text-xs text-muted-foreground">Packages screened</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.packages.accepted}
            </div>
            <p className="text-xs text-muted-foreground">
              Packages cleared for customs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipments</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.shipments}</div>
            <p className="text-xs text-muted-foreground">
              Consolidations registered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
            <CardDescription>
              Upload a new CSV file to process packages for customs screening.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild>
              <Link href="/uploads">
                <Upload className="mr-2 h-4 w-4" />
                Go to Uploads
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>View Packages</CardTitle>
            <CardDescription>
              Review screening results and manage your packages.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild variant="outline">
              <Link href="/packages">
                <Package className="mr-2 h-4 w-4" />
                View Packages
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Manage Shipments</CardTitle>
            <CardDescription>
              Register shipments and verify with CBP for customs clearance.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild variant="outline">
              <Link href="/shipments">
                <Truck className="mr-2 h-4 w-4" />
                View Shipments
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      {stats.packages.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Screening Status Overview</CardTitle>
            <CardDescription>
              Breakdown of package screening results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm">
                  <span className="font-medium">{stats.packages.accepted}</span>{" "}
                  Accepted
                </span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm">
                  <span className="font-medium">{stats.packages.rejected}</span>{" "}
                  Rejected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="text-sm">
                  <span className="font-medium">{stats.packages.pending}</span>{" "}
                  Pending
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
