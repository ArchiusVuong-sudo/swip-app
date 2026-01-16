"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Truck,
  Package,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PackageItem {
  id: string;
  external_id: string;
  house_bill_number: string;
  safepackage_id: string;
  consignee_name: string;
  status: string;
}

interface CreateShipmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ShipmentFormData {
  externalId: string;
  masterBillPrefix: string;
  masterBillSerialNumber: string;
  originatorCode: string;
  entryType: "01" | "11" | "86" | "P";
  // Shipper
  shipperName: string;
  shipperLine1: string;
  shipperLine2: string;
  shipperCity: string;
  shipperState: string;
  shipperPostalCode: string;
  shipperCountry: string;
  shipperPhone: string;
  shipperEmail: string;
  // Consignee
  consigneeName: string;
  consigneeLine1: string;
  consigneeLine2: string;
  consigneeCity: string;
  consigneeState: string;
  consigneePostalCode: string;
  consigneeCountry: string;
  consigneePhone: string;
  consigneeEmail: string;
  // Transportation
  transportMode: "AIR" | "TRUCK";
  portOfEntry: string;
  portOfOrigin: string;
  portOfArrival: string;
  carrierName: string;
  carrierCode: string;
  lineNumber: string;
  firmsCode: string;
  shippingDate: string;
  scheduledArrivalDate: string;
  terminalOperator: string;
}

const defaultFormData: ShipmentFormData = {
  externalId: "",
  masterBillPrefix: "",
  masterBillSerialNumber: "",
  originatorCode: "",
  entryType: "86",
  shipperName: "",
  shipperLine1: "",
  shipperLine2: "",
  shipperCity: "",
  shipperState: "",
  shipperPostalCode: "",
  shipperCountry: "CHN",
  shipperPhone: "",
  shipperEmail: "",
  consigneeName: "",
  consigneeLine1: "",
  consigneeLine2: "",
  consigneeCity: "",
  consigneeState: "",
  consigneePostalCode: "",
  consigneeCountry: "USA",
  consigneePhone: "",
  consigneeEmail: "",
  transportMode: "AIR",
  portOfEntry: "",
  portOfOrigin: "",
  portOfArrival: "",
  carrierName: "",
  carrierCode: "",
  lineNumber: "",
  firmsCode: "",
  shippingDate: "",
  scheduledArrivalDate: "",
  terminalOperator: "",
};

export function CreateShipmentDialog({
  isOpen,
  onClose,
  onSuccess,
}: CreateShipmentDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<"packages" | "details">("packages");
  const [availablePackages, setAvailablePackages] = useState<PackageItem[]>([]);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<ShipmentFormData>(defaultFormData);
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "master-bill",
    "transportation",
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch available packages (accepted status, not yet in a shipment)
  useEffect(() => {
    if (isOpen) {
      fetchAvailablePackages();
    }
  }, [isOpen]);

  const fetchAvailablePackages = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/packages?status=accepted&unassigned=true");
      if (!response.ok) throw new Error("Failed to fetch packages");
      const data = await response.json();
      setAvailablePackages(data.packages || []);
    } catch (error) {
      console.error("Error fetching packages:", error);
      toast.error("Failed to load available packages");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep("packages");
    setSelectedPackageIds([]);
    setFormData(defaultFormData);
    setExpandedSections(["master-bill", "transportation"]);
    setErrors({});
    onClose();
  };

  const togglePackage = (packageId: string) => {
    setSelectedPackageIds((prev) =>
      prev.includes(packageId)
        ? prev.filter((id) => id !== packageId)
        : [...prev, packageId]
    );
  };

  const toggleAllPackages = () => {
    if (selectedPackageIds.length === availablePackages.length) {
      setSelectedPackageIds([]);
    } else {
      setSelectedPackageIds(availablePackages.map((p) => p.id));
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const updateFormData = (field: keyof ShipmentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.externalId) newErrors.externalId = "External ID is required";
    if (!formData.masterBillPrefix)
      newErrors.masterBillPrefix = "Master Bill Prefix is required";
    if (!formData.masterBillSerialNumber)
      newErrors.masterBillSerialNumber = "Master Bill Serial is required";
    if (!formData.shipperName) newErrors.shipperName = "Shipper name is required";
    if (!formData.shipperLine1)
      newErrors.shipperLine1 = "Shipper address is required";
    if (!formData.shipperCity) newErrors.shipperCity = "Shipper city is required";
    if (!formData.shipperState)
      newErrors.shipperState = "Shipper state is required";
    if (!formData.shipperPostalCode)
      newErrors.shipperPostalCode = "Shipper postal code is required";
    if (!formData.consigneeName)
      newErrors.consigneeName = "Consignee name is required";
    if (!formData.consigneeLine1)
      newErrors.consigneeLine1 = "Consignee address is required";
    if (!formData.consigneeCity)
      newErrors.consigneeCity = "Consignee city is required";
    if (!formData.consigneeState)
      newErrors.consigneeState = "Consignee state is required";
    if (!formData.consigneePostalCode)
      newErrors.consigneePostalCode = "Consignee postal code is required";
    if (!formData.portOfEntry)
      newErrors.portOfEntry = "Port of entry is required";
    if (!formData.portOfOrigin)
      newErrors.portOfOrigin = "Port of origin is required";
    if (!formData.carrierName)
      newErrors.carrierName = "Carrier name is required";
    if (!formData.carrierCode)
      newErrors.carrierCode = "Carrier code is required";
    if (!formData.lineNumber) newErrors.lineNumber = "Line number is required";
    if (!formData.shippingDate)
      newErrors.shippingDate = "Shipping date is required";
    if (!formData.scheduledArrivalDate)
      newErrors.scheduledArrivalDate = "Arrival date is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      // Expand all sections with errors
      const sectionsWithErrors = new Set<string>();
      Object.keys(errors).forEach((field) => {
        if (field.startsWith("shipper")) sectionsWithErrors.add("shipper");
        if (field.startsWith("consignee")) sectionsWithErrors.add("consignee");
        if (
          ["portOfEntry", "portOfOrigin", "portOfArrival", "carrierName", "carrierCode", "lineNumber", "shippingDate", "scheduledArrivalDate"].includes(field)
        )
          sectionsWithErrors.add("transportation");
        if (["externalId", "masterBillPrefix", "masterBillSerialNumber", "originatorCode", "entryType"].includes(field))
          sectionsWithErrors.add("master-bill");
      });
      setExpandedSections((prev) => [...new Set([...prev, ...sectionsWithErrors])]);
      return;
    }

    setIsSubmitting(true);
    try {
      // Format the request body to match the API expected structure
      const requestBody = {
        externalId: formData.externalId,
        masterBillPrefix: formData.masterBillPrefix,
        masterBillSerialNumber: formData.masterBillSerialNumber,
        originatorCode: formData.originatorCode || undefined,
        entryType: formData.entryType,
        shipper: {
          name: formData.shipperName,
          line1: formData.shipperLine1,
          line2: formData.shipperLine2 || undefined,
          city: formData.shipperCity,
          state: formData.shipperState,
          postalCode: formData.shipperPostalCode,
          country: formData.shipperCountry,
          phone: formData.shipperPhone || undefined,
          email: formData.shipperEmail || undefined,
        },
        consignee: {
          name: formData.consigneeName,
          line1: formData.consigneeLine1,
          line2: formData.consigneeLine2 || undefined,
          city: formData.consigneeCity,
          state: formData.consigneeState,
          postalCode: formData.consigneePostalCode,
          country: formData.consigneeCountry,
          phone: formData.consigneePhone || undefined,
          email: formData.consigneeEmail || undefined,
        },
        transportation: {
          mode: formData.transportMode,
          portOfEntry: formData.portOfEntry,
          portOfOrigin: formData.portOfOrigin,
          portOfArrival: formData.portOfArrival || undefined,
          carrierName: formData.carrierName,
          carrierCode: formData.carrierCode,
          lineNumber: formData.lineNumber,
          firmsCode: formData.firmsCode || undefined,
          shippingDate: formData.shippingDate,
          scheduledArrivalDate: formData.scheduledArrivalDate,
          terminalOperator: formData.terminalOperator || undefined,
        },
        packageIds: selectedPackageIds,
      };

      const response = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create shipment");
      }

      const result = await response.json();
      toast.success("Shipment created and registered successfully!");
      handleClose();
      onSuccess?.();
      router.refresh();
    } catch (error) {
      console.error("Error creating shipment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create shipment"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPackageSelection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Select the accepted packages to include in this shipment.
        </p>
        {availablePackages.length > 0 && (
          <Button variant="outline" size="sm" onClick={toggleAllPackages}>
            {selectedPackageIds.length === availablePackages.length
              ? "Deselect All"
              : "Select All"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : availablePackages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No packages available</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Only accepted packages that haven&apos;t been assigned to a shipment can
            be selected.
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[300px] border rounded-lg">
          <div className="divide-y">
            {availablePackages.map((pkg) => (
              <div
                key={pkg.id}
                className={cn(
                  "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                  selectedPackageIds.includes(pkg.id) && "bg-blue-50"
                )}
                onClick={() => togglePackage(pkg.id)}
              >
                <Checkbox
                  checked={selectedPackageIds.includes(pkg.id)}
                  onCheckedChange={() => togglePackage(pkg.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{pkg.external_id}</span>
                    <Badge variant="outline" className="text-xs">
                      {pkg.house_bill_number}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {pkg.consignee_name}
                  </p>
                </div>
                <Badge variant="default" className="gap-1 bg-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Accepted
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-muted-foreground">
          {selectedPackageIds.length} package(s) selected
        </span>
      </div>
    </div>
  );

  const renderFormSection = (
    id: string,
    title: string,
    hasError: boolean,
    children: React.ReactNode
  ) => {
    const isExpanded = expandedSections.includes(id);
    return (
      <Collapsible open={isExpanded} onOpenChange={() => toggleSection(id)}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start p-3 h-auto",
              hasError && "bg-red-50 hover:bg-red-100"
            )}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-2" />
            )}
            <span className="font-medium">{title}</span>
            {hasError && <AlertCircle className="h-4 w-4 ml-2 text-red-500" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 bg-gray-50 rounded-b-lg space-y-4">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const renderFormField = (
    id: keyof ShipmentFormData,
    label: string,
    placeholder: string,
    type: string = "text",
    required: boolean = false
  ) => (
    <div className="space-y-1">
      <Label
        htmlFor={id}
        className={cn("text-xs", errors[id] ? "text-red-600 font-medium" : "text-gray-600")}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={formData[id]}
        onChange={(e) => updateFormData(id, e.target.value)}
        placeholder={placeholder}
        className={cn("h-9 text-sm", errors[id] && "border-red-500")}
      />
      {errors[id] && <p className="text-xs text-red-500">{errors[id]}</p>}
    </div>
  );

  const renderShipmentDetails = () => (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-2">
        {/* Master Bill / Identification */}
        {renderFormSection(
          "master-bill",
          "Master Bill & Identification",
          ["externalId", "masterBillPrefix", "masterBillSerialNumber"].some(
            (f) => errors[f]
          ),
          <div className="grid grid-cols-2 gap-4">
            {renderFormField("externalId", "External ID", "SHP-001", "text", true)}
            {renderFormField("masterBillPrefix", "Master Bill Prefix", "180", "text", true)}
            {renderFormField("masterBillSerialNumber", "Master Bill Serial", "12345678", "text", true)}
            {renderFormField("originatorCode", "Originator Code", "Optional")}
            <div className="space-y-1">
              <Label htmlFor="entryType" className="text-xs text-gray-600">
                Entry Type
              </Label>
              <Select
                value={formData.entryType}
                onValueChange={(value) =>
                  updateFormData("entryType", value as ShipmentFormData["entryType"])
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">01 - Consumption</SelectItem>
                  <SelectItem value="11">11 - Informal Entry</SelectItem>
                  <SelectItem value="86">86 - Section 321</SelectItem>
                  <SelectItem value="P">P - Preliminary Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Shipper */}
        {renderFormSection(
          "shipper",
          "Shipper Information",
          [
            "shipperName",
            "shipperLine1",
            "shipperCity",
            "shipperState",
            "shipperPostalCode",
          ].some((f) => errors[f]),
          <div className="grid grid-cols-2 gap-4">
            {renderFormField("shipperName", "Name", "Shipper Company Name", "text", true)}
            {renderFormField("shipperLine1", "Address Line 1", "123 Main St", "text", true)}
            {renderFormField("shipperLine2", "Address Line 2", "Suite 100")}
            {renderFormField("shipperCity", "City", "Shenzhen", "text", true)}
            {renderFormField("shipperState", "State/Province", "GD", "text", true)}
            {renderFormField("shipperPostalCode", "Postal Code", "518000", "text", true)}
            {renderFormField("shipperCountry", "Country (ISO3)", "CHN", "text", true)}
            {renderFormField("shipperPhone", "Phone", "1234567890")}
            {renderFormField("shipperEmail", "Email", "shipper@example.com", "email")}
          </div>
        )}

        {/* Consignee */}
        {renderFormSection(
          "consignee",
          "Consignee Information",
          [
            "consigneeName",
            "consigneeLine1",
            "consigneeCity",
            "consigneeState",
            "consigneePostalCode",
          ].some((f) => errors[f]),
          <div className="grid grid-cols-2 gap-4">
            {renderFormField("consigneeName", "Name", "US Warehouse Inc", "text", true)}
            {renderFormField("consigneeLine1", "Address Line 1", "456 Commerce Ave", "text", true)}
            {renderFormField("consigneeLine2", "Address Line 2", "Building B")}
            {renderFormField("consigneeCity", "City", "Los Angeles", "text", true)}
            {renderFormField("consigneeState", "State", "CA", "text", true)}
            {renderFormField("consigneePostalCode", "Postal Code", "90001", "text", true)}
            {renderFormField("consigneeCountry", "Country (ISO3)", "USA", "text", true)}
            {renderFormField("consigneePhone", "Phone", "5551234567")}
            {renderFormField("consigneeEmail", "Email", "consignee@example.com", "email")}
          </div>
        )}

        {/* Transportation */}
        {renderFormSection(
          "transportation",
          "Transportation Details",
          [
            "portOfEntry",
            "portOfOrigin",
            "carrierName",
            "carrierCode",
            "lineNumber",
            "shippingDate",
            "scheduledArrivalDate",
          ].some((f) => errors[f]),
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="transportMode" className="text-xs text-gray-600">
                Transport Mode <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.transportMode}
                onValueChange={(value) =>
                  updateFormData("transportMode", value as ShipmentFormData["transportMode"])
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AIR">Air</SelectItem>
                  <SelectItem value="TRUCK">Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {renderFormField("portOfOrigin", "Port of Origin", "SZX", "text", true)}
            {renderFormField("portOfEntry", "Port of Entry", "LAX", "text", true)}
            {renderFormField("portOfArrival", "Port of Arrival", "LAX")}
            {renderFormField("carrierName", "Carrier Name", "FedEx", "text", true)}
            {renderFormField("carrierCode", "Carrier Code (IATA)", "FX", "text", true)}
            {renderFormField("lineNumber", "Line/Flight Number", "FX1234", "text", true)}
            {renderFormField("firmsCode", "FIRMS Code", "Optional")}
            {renderFormField("shippingDate", "Shipping Date", "", "date", true)}
            {renderFormField("scheduledArrivalDate", "Arrival Date", "", "date", true)}
            {renderFormField("terminalOperator", "Terminal Operator", "Optional")}
          </div>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {step === "packages" ? "Select Packages" : "Shipment Details"}
          </DialogTitle>
          <DialogDescription>
            {step === "packages"
              ? "Choose the packages to consolidate into this shipment."
              : "Enter the shipment registration details."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === "packages" ? renderPackageSelection() : renderShipmentDetails()}
        </div>

        <DialogFooter>
          {step === "packages" ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep("details")}
                disabled={selectedPackageIds.length === 0}
              >
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("packages")}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Truck className="mr-2 h-4 w-4" />
                    Create & Register
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
