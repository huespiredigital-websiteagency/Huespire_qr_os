"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Mail, Megaphone, Send, ShieldAlert, Sparkles, LayoutTemplate, Palette } from "lucide-react";

export default function CommunicationCenterPage() {
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState(false);
  const [restaurantName, setRestaurantName] = useState("Restaurant");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#10b981");

  // Form Fields State
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [vipOnly, setVipOnly] = useState(false);
  const [tagFilter, setTagFilter] = useState("");
  const [template, setTemplate] = useState("general"); // general, birthday, coupon

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await apiClient.get("/restaurants/me");
        if (response.data?.success && response.data.data) {
          const r = response.data.data;
          setRestaurantName(r.name || "Restaurant");
          setLogoUrl(r.logoUrl || "");
          if (r.settings) {
            setPrimaryColor(r.settings.primaryColor || "#6366f1");
            setSecondaryColor(r.settings.secondaryColor || "#10b981");
          }
        }
      } catch (err) {
        console.error("Failed to load branding:", err);
      }
    };
    fetchBranding();
  }, []);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setTemplate(selected);

    if (selected === "general") {
      setSubject(`Greetings from ${restaurantName}`);
      setBody("We wanted to reach out and say thank you for dining with us! We have exciting new menu items added this week. Scan your table QR code on your next visit to view them!");
    } else if (selected === "birthday") {
      setSubject("Happy Birthday! 🎂 Enjoy a Special Gift from Us");
      setBody("Wishing you a wonderful birthday! To celebrate your special day, present this email to your server on your next visit to receive a complimentary dessert of your choice.");
    } else if (selected === "coupon") {
      setSubject(`Exclusive 15% OFF Discount from ${restaurantName}`);
      setBody("We appreciate your business! Use the promo code LOYAL15 on your next visit or online order to receive 15% OFF your entire bill. Valid for the next 30 days.");
    }
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      addToast("Subject and campaign body are required.", "error");
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post("/customers/communication/bulk-email", {
        targetTag: tagFilter || undefined,
        vipOnly,
        subject,
        body,
      });

      if (response.data?.success) {
        addToast(response.data.message || "Campaign sent successfully!", "success");
        setSubject("");
        setBody("");
      }
    } catch (err: any) {
      console.error("Failed to send campaign:", err);
      addToast(err.response?.data?.message || "Failed to dispatch email campaign.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-indigo-400" />
          Marketing & Communication Center
        </h1>
        <p className="text-slate-400 text-xs font-semibold mt-1">
          Launch branded email campaigns, coupons, and announcments utilizing your active restaurant theme.
        </p>
      </div>

      {/* Main Grid: Composer & Branded Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Composer Form */}
        <form onSubmit={handleSendCampaign} className="bg-slate-900/50 backdrop-blur-xl border border-slate-850 p-6 rounded-3xl space-y-6 shadow-2xl">
          <div className="border-b border-slate-850 pb-4">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-indigo-400" />
              Campaign Composer
            </h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">Campaign Template</label>
                <select
                  value={template}
                  onChange={handleTemplateChange}
                  className="w-full bg-slate-950 border border-slate-850 text-xs text-slate-300 px-3 py-3.5 rounded-xl focus:outline-none cursor-pointer"
                >
                  <option value="general">Standard Welcome Announcement</option>
                  <option value="birthday">Birthday Offer Offer</option>
                  <option value="coupon">Discount Code Coupon</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">Target Audience</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vipOnly}
                      onChange={(e) => setVipOnly(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 rounded bg-slate-950 border-slate-800"
                    />
                    VIP Only
                  </label>
                  <input
                    type="text"
                    placeholder="Audience Tag (e.g. Regular)"
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <Input
              label="Email Subject Heading *"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. You have an exclusive offer from our kitchen!"
            />

            <div>
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">Campaign Body Content *</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email body here..."
                rows={8}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-4 text-xs placeholder-slate-700 text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              <strong>Anti-Spam Policy Warning:</strong> Make sure you are only sending promotional emails to customers who have verified their contact details or opted in during table QR checkout.
            </p>
          </div>

          <Button
            type="submit"
            loading={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs py-4 rounded-xl shadow-lg shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            Launch Email Campaign
          </Button>
        </form>

        {/* Dynamic Branded live HTML Preview */}
        <div className="bg-slate-950 border border-slate-850 rounded-3xl p-6 shadow-2xl flex flex-col h-full min-h-[500px]">
          <div className="border-b border-slate-850 pb-4 mb-4 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-1.5">
              <LayoutTemplate className="h-4 w-4 text-indigo-400" />
              Live Branded Template Preview
            </h2>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Active theme colors</span>
            </div>
          </div>

          {/* Email mockup wrapper */}
          <div className="flex-1 bg-slate-900 rounded-2xl overflow-hidden border border-slate-850 max-w-lg mx-auto w-full">
            {/* Header banner */}
            <div
              style={{ backgroundColor: primaryColor }}
              className="p-6 text-center text-white"
            >
              {logoUrl ? (
                <img src={logoUrl} className="h-10 mx-auto mb-2 rounded" alt={restaurantName} />
              ) : null}
              <div className="font-extrabold text-lg tracking-tight">{restaurantName}</div>
            </div>

            {/* Email Body content */}
            <div className="p-8 bg-slate-900 min-h-[250px] space-y-4">
              <h2 className="text-white text-base font-extrabold">{subject || "Email Heading Title"}</h2>
              <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap">
                Dear Valued Customer,
                {"\n\n"}
                {body || "Your composed email announcement body will appear here in real-time, matching your exact colors and header configuration."}
              </p>
              
              <div style={{ textAlign: "center", marginTop: "25px" }}>
                <span
                  style={{ backgroundColor: secondaryColor }}
                  className="inline-block px-5 py-2 text-white font-extrabold text-[10px] rounded-lg"
                >
                  Branded Button Action
                </span>
              </div>
            </div>

            {/* Branded Footer */}
            <div className="bg-slate-950 p-4 border-t border-slate-850 text-center text-[10px] text-slate-500">
              <p className="font-bold">Thank you for choosing {restaurantName}!</p>
              <p className="mt-4 uppercase tracking-widest text-[8px] text-slate-600">Powered by Restaurant OS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
