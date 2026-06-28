"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import { Input } from "../../../../components/ui/input";
import { Select } from "../../../../components/ui/select";
import { Button } from "../../../../components/ui/button";
import { Store, Save } from "lucide-react";

export default function SettingsPage() {
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Fields State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState("INR");
  const [taxPercentage, setTaxPercentage] = useState<number>(0);

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
          
          // Settings are stored inside nested settings object
          if (r.settings) {
            setTimezone(r.settings.timezone || "Asia/Kolkata");
            setCurrency(r.settings.currency || "INR");
            setTaxPercentage(Number(r.settings.taxPercentage || 0));
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
    if (!validate()) return;

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
        timezone,
        currency,
        taxPercentage: Number(taxPercentage),
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
        <div className="h-10 bg-slate-200 rounded-lg w-1/4 animate-pulse" />
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="h-12 bg-slate-100 rounded" />
          <div className="h-12 bg-slate-100 rounded" />
          <div className="h-12 bg-slate-100 rounded" />
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
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Banner header */}
        <div className="bg-slate-900 px-8 py-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Restaurant Configurations</h2>
              <p className="text-xs text-slate-400">Configure global metadata and default tax settings.</p>
            </div>
          </div>
          <Button type="submit" loading={saving} className="px-5 cursor-pointer">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-8">
          {/* General Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider">
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
          </div>

          {/* Localization & Pricing */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider">
              Localization & Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Select
                label="Timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                options={timezoneOptions}
              />
              <Select
                label="Currency"
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

          {/* Contact Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider">
              Address Details
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
      </form>
    </div>
  );
}
