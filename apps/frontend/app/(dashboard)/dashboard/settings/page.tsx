"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import { Input } from "../../../../components/ui/input";
import { Select } from "../../../../components/ui/select";
import { Button } from "../../../../components/ui/button";
import { Store, Save, Palette, Settings, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("business"); // business, branding, operations

  // Form Fields State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [domain, setDomain] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState("INR");
  const [taxPercentage, setTaxPercentage] = useState<number>(0);

  // Phase 9 branding & business settings fields
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#10b981");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState("");
  const [gstVatNumber, setGstVatNumber] = useState("");
  const [language, setLanguage] = useState("en");
  const [businessHours, setBusinessHours] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [invoiceFooter, setInvoiceFooter] = useState("");
  const [emailFooter, setEmailFooter] = useState("");
  const [website, setWebsite] = useState("");
  const [socialLinks, setSocialLinks] = useState("");

  // Operation Toggles
  const [enableEmailReceipts, setEnableEmailReceipts] = useState(true);
  const [enableOnlineOrdering, setEnableOnlineOrdering] = useState(true);
  const [enableTableOrdering, setEnableTableOrdering] = useState(true);
  const [enableTakeaway, setEnableTakeaway] = useState(true);
  const [enableDelivery, setEnableDelivery] = useState(true);

  // Errors State
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/restaurants/me");
        if (response.data?.success && response.data.data) {
          const r = response.data.data;
          setName(r.name || "");
          setEmail(r.email || "");
          setPhone(r.phone || "");
          setAddress(r.address || "");
          setCity(r.city || "");
          setState(r.state || "");
          setCountry(r.country || "");
          setPostalCode(r.postalCode || "");
          setDomain(r.domain || "");
          setLogoUrl(r.logoUrl || "");

          if (r.settings) {
            setTimezone(r.settings.timezone || "Asia/Kolkata");
            setCurrency(r.settings.currency || "INR");
            setTaxPercentage(Number(r.settings.taxPercentage || 0));

            // Branding and operations
            setPrimaryColor(r.settings.primaryColor || "#6366f1");
            setSecondaryColor(r.settings.secondaryColor || "#10b981");
            setBusinessRegistrationNumber(r.settings.businessRegistrationNumber || "");
            setGstVatNumber(r.settings.gstVatNumber || "");
            setLanguage(r.settings.language || "en");
            setBusinessHours(r.settings.businessHours || "");
            setInvoicePrefix(r.settings.invoicePrefix || "INV-");
            setInvoiceFooter(r.settings.invoiceFooter || "");
            setEmailFooter(r.settings.emailFooter || "");
            setWebsite(r.settings.website || "");
            setSocialLinks(r.settings.socialLinks || "");

            setEnableEmailReceipts(r.settings.enableEmailReceipts !== false);
            setEnableOnlineOrdering(r.settings.enableOnlineOrdering !== false);
            setEnableTableOrdering(r.settings.enableTableOrdering !== false);
            setEnableTakeaway(r.settings.enableTakeaway !== false);
            setEnableDelivery(r.settings.enableDelivery !== false);
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        addToast("Failed to load restaurant settings.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [addToast]);

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!name.trim()) tempErrors.name = "Restaurant Name is required";
    if (!email.trim()) {
      tempErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = "Invalid email format";
    }
    if (!phone.trim()) tempErrors.phone = "Phone number is required";
    if (taxPercentage < 0 || taxPercentage > 100) {
      tempErrors.taxPercentage = "Tax percentage must be between 0 and 100";
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      addToast("Please check fields for errors before saving.", "error");
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.patch("/restaurants/me", {
        name,
        email,
        phone,
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || null,
        postalCode: postalCode || null,
        domain: domain || null,
        logoUrl: logoUrl || null,
        timezone,
        currency,
        taxPercentage: Number(taxPercentage),
        primaryColor,
        secondaryColor,
        businessEmail: email || null,
        businessPhone: phone || null,
        businessRegistrationNumber: businessRegistrationNumber || null,
        gstVatNumber: gstVatNumber || null,
        language,
        businessHours: businessHours || null,
        invoicePrefix,
        invoiceFooter: invoiceFooter || null,
        emailFooter: emailFooter || null,
        website: website || null,
        socialLinks: socialLinks || null,
        enableEmailReceipts,
        enableOnlineOrdering,
        enableTableOrdering,
        enableTakeaway,
        enableDelivery,
      });

      if (response.data?.success) {
        addToast("Restaurant configurations updated successfully!", "success");
      } else {
        addToast(response.data?.message || "Failed to update configurations", "error");
      }
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      addToast(err.response?.data?.message || "Error saving restaurant settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-800 rounded-lg w-1/4 animate-pulse" />
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-sm space-y-6">
          <div className="h-12 bg-slate-800 rounded" />
          <div className="h-12 bg-slate-800 rounded" />
          <div className="h-12 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  const timezoneOptions = [
    { value: "Asia/Kolkata", label: "India Standard Time (IST) - Asia/Kolkata" },
    { value: "UTC", label: "Coordinated Universal Time (UTC)" },
    { value: "America/New_York", label: "Eastern Standard Time (EST) - America/New_York" },
    { value: "Europe/London", label: "Greenwich Mean Time (GMT) - Europe/London" },
  ];

  const currencyOptions = [
    { value: "INR", label: "Indian Rupee (₹) - INR" },
    { value: "USD", label: "US Dollar ($) - USD" },
    { value: "EUR", label: "Euro (€) - EUR" },
    { value: "GBP", label: "British Pound (£) - GBP" },
  ];

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-slate-900 rounded-3xl border border-slate-850 shadow-2xl overflow-hidden">
        {/* Banner header */}
        <div className="bg-slate-950 px-8 py-6 text-white flex items-center justify-between border-b border-slate-850">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Restaurant Settings</h2>
              <p className="text-xs text-slate-400 font-medium">Configure your SaaS business profile and brand layouts.</p>
            </div>
          </div>
          <Button type="submit" loading={saving} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/15 cursor-pointer transition active:scale-95">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-950/40 border-b border-slate-850 px-8 flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("business")}
            className={`py-4 font-bold text-xs uppercase tracking-wider border-b-2 transition cursor-pointer ${
              activeTab === "business"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Settings className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Business Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("branding")}
            className={`py-4 font-bold text-xs uppercase tracking-wider border-b-2 transition cursor-pointer ${
              activeTab === "branding"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Palette className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Colors & Branding
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("operations")}
            className={`py-4 font-bold text-xs uppercase tracking-wider border-b-2 transition cursor-pointer ${
              activeTab === "operations"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <CheckCircle2 className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Ordering Toggles
          </button>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-8">
          {activeTab === "business" && (
            <div className="space-y-6">
              {/* General Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                  General Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input
                    label="Restaurant Name *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={errors.name}
                    placeholder="Restaurant Name"
                  />
                  <Input
                    label="Contact Email *"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={errors.email}
                    placeholder="email@restaurant.com"
                  />
                  <Input
                    label="Contact Phone *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    error={errors.phone}
                    placeholder="+919876543210"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Business Registration Number"
                    value={businessRegistrationNumber}
                    onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
                    placeholder="REG-2026-X12"
                  />
                  <Input
                    label="GST/VAT Registration Number"
                    value={gstVatNumber}
                    onChange={(e) => setGstVatNumber(e.target.value)}
                    placeholder="GSTIN9876543210"
                  />
                </div>
              </div>

              {/* Localization */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                  Localization & Taxes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Select
                    label="Timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    options={timezoneOptions}
                  />
                  <Select
                    label="Currency Code"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    options={currencyOptions}
                  />
                  <Input
                    label="Default Tax Percentage (%)"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                    error={errors.taxPercentage}
                    placeholder="5.0"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                  Business Location
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Input
                      label="Street Address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Food Street, Main Layout"
                    />
                  </div>
                  <Input
                    label="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Delhi"
                  />
                  <Input
                    label="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Delhi"
                  />
                  <Input
                    label="Country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India"
                  />
                  <Input
                    label="Postal Code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="110001"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "branding" && (
            <div className="space-y-6">
              {/* Assets & Colors */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                  Theme Customization
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-3">
                    <Input
                      label="Restaurant Logo URL"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">Primary Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-12 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">Secondary Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="h-10 w-12 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoices & Emails footer */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                  Invoice & Email Branded Footers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Email Footer Signature"
                    value={emailFooter}
                    onChange={(e) => setEmailFooter(e.target.value)}
                    placeholder="Sent via Pizza Palace Support Team"
                  />
                  <Input
                    label="Invoice Layout Footer Note"
                    value={invoiceFooter}
                    onChange={(e) => setInvoiceFooter(e.target.value)}
                    placeholder="Thank you for dining with us! Visit again."
                  />
                </div>
              </div>

              {/* Social links */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                  Online Links & Info
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Business Website Address"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://pizzapalace.com"
                  />
                  <Input
                    label="Social Media Profile Links (JSON / comma-separated)"
                    value={socialLinks}
                    onChange={(e) => setSocialLinks(e.target.value)}
                    placeholder="Facebook: fb.com/pizza, Instagram: @pizza"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "operations" && (
            <div className="space-y-6">
              {/* Operation configurations */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                  Operational Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Receipt Invoice Prefix"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    placeholder="INV-"
                  />
                  <Input
                    label="Business Hours description"
                    value={businessHours}
                    onChange={(e) => setBusinessHours(e.target.value)}
                    placeholder="Mon-Sun: 9:00 AM - 11:00 PM"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                  Ordering & Receipt Controls
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-850 rounded-2xl">
                    <div>
                      <div className="text-sm font-bold text-white">Automated Email Receipts</div>
                      <div className="text-xs text-slate-500 mt-0.5">Send a PDF/HTML receipt immediately upon successful payment confirmation.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableEmailReceipts}
                      onChange={(e) => setEnableEmailReceipts(e.target.checked)}
                      className="h-5 w-5 text-indigo-600 rounded bg-slate-950 border-slate-800 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-850 rounded-2xl">
                    <div>
                      <div className="text-sm font-bold text-white">Online Digital Ordering</div>
                      <div className="text-xs text-slate-500 mt-0.5">Allow online ordering through custom tenant domains.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableOnlineOrdering}
                      onChange={(e) => setEnableOnlineOrdering(e.target.checked)}
                      className="h-5 w-5 text-indigo-600 rounded bg-slate-950 border-slate-800 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-850 rounded-2xl">
                    <div>
                      <div className="text-sm font-bold text-white">Table QR Session Ordering</div>
                      <div className="text-xs text-slate-500 mt-0.5">Enable guests to self-checkout and order straight from QR codes.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableTableOrdering}
                      onChange={(e) => setEnableTableOrdering(e.target.checked)}
                      className="h-5 w-5 text-indigo-600 rounded bg-slate-950 border-slate-800 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-850 rounded-2xl">
                    <div>
                      <div className="text-sm font-bold text-white">Takeaway Ordering</div>
                      <div className="text-xs text-slate-500 mt-0.5">Expose self-pickup options for customers.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableTakeaway}
                      onChange={(e) => setEnableTakeaway(e.target.checked)}
                      className="h-5 w-5 text-indigo-600 rounded bg-slate-950 border-slate-800 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-850 rounded-2xl">
                    <div>
                      <div className="text-sm font-bold text-white">Delivery Services</div>
                      <div className="text-xs text-slate-500 mt-0.5">Support home address delivery orders inside the checkout flow.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableDelivery}
                      onChange={(e) => setEnableDelivery(e.target.checked)}
                      className="h-5 w-5 text-indigo-600 rounded bg-slate-950 border-slate-800 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
