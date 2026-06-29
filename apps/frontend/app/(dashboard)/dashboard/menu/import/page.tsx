"use client";

import React, { useState } from "react";
import { apiClient } from "../../../../../lib/api-client";
import { useUIStore } from "../../../../../lib/store/ui-store";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Info,
  ShieldAlert,
  CheckCheck,
  FileDown,
  Clock
} from "lucide-react";
import { Button } from "../../../../../components/ui/button";

interface StructuredError {
  sheet: string;
  row: number;
  column: string;
  value: string;
  reason: string;
  suggestion?: string;
  status?: "Skipped" | "Failed";
}

export default function MenuImportPage() {
  const { addToast } = useUIStore();

  const [importType, setImportType] = useState<string>("unified");
  const [importMode, setImportMode] = useState<"strict" | "partial">("strict");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [validating, setValidating] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);

  // Results State
  const [structuredErrors, setStructuredErrors] = useState<StructuredError[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [parsedCount, setParsedCount] = useState<any>(null);
  const [importSuccessData, setImportSuccessData] = useState<any>(null);

  // Template Download Handler
  const handleDownloadTemplate = async (type: string) => {
    try {
      const response = await apiClient.get(`/menu-import/templates/${type}`, {
        responseType: "blob"
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `menu_template_${type}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast(`${type.replace("-", " ")} template downloaded successfully.`, "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to download template.", "error");
    }
  };

  // Download Error Report XLSX
  const handleDownloadErrorReport = async () => {
    if (structuredErrors.length === 0) return;
    try {
      const response = await apiClient.post("/menu-import/error-report", { errors: structuredErrors }, {
        responseType: "blob"
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "ImportErrors.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast("Import error report downloaded.", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to download error report.", "error");
    }
  };

  // Export Menu Handler
  const handleExportMenu = async () => {
    try {
      const response = await apiClient.get("/menu-import/export", {
        responseType: "blob"
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "menu_export.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast("Menu exported successfully.", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to export current menu.", "error");
    }
  };

  // Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      await processSelectedFile(droppedFile);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      await processSelectedFile(selectedFile);
    }
  };

  // Reset State
  const resetUploadState = () => {
    setFile(null);
    setStructuredErrors([]);
    setPreviewData(null);
    setParsedCount(null);
    setImportSuccessData(null);
  };

  // Run validation
  const processSelectedFile = async (selectedFile: File) => {
    const isExcel = selectedFile.name.endsWith(".xlsx");
    const isCsv = selectedFile.name.endsWith(".csv");

    if (!isExcel && !isCsv) {
      addToast("Please upload only Excel (.xlsx) or CSV (.csv) files.", "error");
      return;
    }

    if (isCsv && importType === "unified") {
      addToast("CSV format is single-sheet only. Please select a specific sheet type.", "error");
      return;
    }

    setFile(selectedFile);
    setStructuredErrors([]);
    setPreviewData(null);
    setParsedCount(null);
    setImportSuccessData(null);

    try {
      setValidating(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await apiClient.post(
        `/menu-import/validate?type=${importType}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      if (response.data?.success) {
        const valData = response.data.data;
        setStructuredErrors(valData.errors || []);
        setPreviewData(valData.preview);
        setParsedCount(valData.parsedCount);
        if ((valData.errors || []).length === 0) {
          addToast("File validation passed. Ready to import.", "success");
        } else {
          addToast(`Found ${(valData.errors || []).length} validation issues. Review below.`, "warning");
        }
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || "File validation failed.", "error");
      setFile(null);
    } finally {
      setValidating(false);
    }
  };

  // Confirm Import
  const handleImport = async (overrideMode?: "strict" | "partial") => {
    if (!file) return;
    const modeToUse = overrideMode || importMode;
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post(
        `/menu-import/import?type=${importType}&mode=${modeToUse}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      if (response.data?.success) {
        const resData = response.data.data;
        setImportSuccessData(resData);
        if (resData.errors && resData.errors.length > 0) {
          setStructuredErrors(resData.errors);
        }
        addToast(
          modeToUse === "strict"
            ? "Menu imported successfully inside database transaction."
            : "Menu import complete with valid rows processed.",
          "success"
        );
      }
    } catch (err: any) {
      console.error(err);
      const backendErrors = err.response?.data?.errors;
      if (backendErrors && Array.isArray(backendErrors)) {
        setStructuredErrors(backendErrors);
        addToast("Import stopped due to validation checks.", "error");
      } else {
        addToast(err.response?.data?.message || "Import execution failed.", "error");
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl">
        <div>
          <h2 className="text-xl font-bold">Smart Bulk Menu Management</h2>
          <p className="text-sm text-slate-400 mt-1">
            Production-ready Excel/CSV importer with smart string normalization and zero silent failures.
          </p>
        </div>
        <Button
          onClick={handleExportMenu}
          className="bg-emerald-600 hover:bg-emerald-700 text-white border-none py-3 px-5 rounded-xl cursor-pointer"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Current Menu
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Hand Download / Config Section */}
        <div className="lg:col-span-1 space-y-6">
          {/* Mode Selector Cards */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h3 className="text-md font-bold text-white flex items-center">
              <ShieldAlert className="h-5 w-5 mr-2 text-indigo-500" />
              Select Import Mode
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => setImportMode("strict")}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  importMode === "strict"
                    ? "border-indigo-500 bg-indigo-500/10 text-white"
                    : "border-slate-800 bg-neutral-850/40 text-slate-400 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Strict Mode (Default)</span>
                  {importMode === "strict" && <CheckCheck className="h-4 w-4 text-indigo-400" />}
                </div>
                <p className="text-xs mt-1 text-slate-400">
                  Rolls back the entire transaction if any row has validation errors.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setImportMode("partial")}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  importMode === "partial"
                    ? "border-amber-500 bg-amber-500/10 text-white"
                    : "border-slate-800 bg-neutral-850/40 text-slate-400 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Import Valid Rows Only</span>
                  {importMode === "partial" && <CheckCheck className="h-4 w-4 text-amber-400" />}
                </div>
                <p className="text-xs mt-1 text-slate-400">
                  Imports valid rows and skips invalid ones, logging errors into a downloadable report.
                </p>
              </button>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
            <h3 className="text-md font-bold text-white mb-4 flex items-center">
              <Download className="h-5 w-5 mr-2 text-indigo-500" />
              1. Download Templates
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Use these template formats to prepare your menu rows correctly.
            </p>
            <div className="space-y-3">
              {[
                { type: "categories", label: "Categories Template" },
                { type: "menu-items", label: "Menu Items Template" },
                { type: "variants", label: "Variants Template" },
                { type: "addons", label: "Add-ons Template" }
              ].map(t => (
                <button
                  key={t.type}
                  onClick={() => handleDownloadTemplate(t.type)}
                  className="w-full text-left bg-neutral-850 hover:bg-neutral-800 border border-slate-800 text-slate-300 hover:text-white px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-all"
                >
                  <span>{t.label}</span>
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
            <h3 className="text-md font-bold text-white mb-4 flex items-center">
              <Info className="h-5 w-5 mr-2 text-indigo-500" />
              Smart Matching & Validation
            </h3>
            <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
              <li>
                <strong>Unified Normalization</strong>: Automatically resolves <code>BBQ & Grill</code>, <code>Veg_Burgers</code>, and <code>Chicken-Bucket</code> seamlessly.
              </li>
              <li>
                <strong>Zero Silent Failures</strong>: Every row ends in exactly one state: Imported, Updated, Skipped, or Failed.
              </li>
              <li>
                <strong>Fuzzy Match Hints</strong>: Suggests closest valid items for typos.
              </li>
            </ul>
          </div>
        </div>

        {/* Right Hand Upload / Verification Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-6">
            <div>
              <h3 className="text-md font-bold text-white">2. Upload Menu File</h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure your import type and drag-and-drop the prepared file.
              </p>
            </div>

            {/* Select Import Type */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { id: "unified", label: "Unified Excel" },
                { id: "categories", label: "Categories" },
                { id: "menu-items", label: "Menu Items" },
                { id: "variants", label: "Variants" },
                { id: "addons", label: "Add-ons" }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setImportType(opt.id);
                    resetUploadState();
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    importType === opt.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                      : "bg-neutral-850 text-slate-350 border-slate-800 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all ${
                dragActive
                  ? "border-indigo-500 bg-indigo-500/10 text-white"
                  : "border-slate-800 bg-neutral-850/50 hover:bg-neutral-850/80 text-slate-400"
              }`}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                accept=".xlsx,.csv"
              />
              <Upload className="h-10 w-10 text-slate-500 mb-3" />
              <p className="text-sm font-semibold text-white">
                Drag & drop your file here, or{" "}
                <label
                  htmlFor="file-upload"
                  className="text-indigo-500 hover:text-indigo-400 cursor-pointer underline"
                >
                  browse
                </label>
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Supports Excel (.xlsx) {importType !== "unified" && "or CSV (.csv)"} up to 10MB
              </p>
            </div>

            {/* Loading States */}
            {validating && (
              <div className="flex items-center justify-center space-x-3 py-6 text-sm text-slate-400 bg-neutral-850/50 rounded-2xl">
                <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
                <span>Parsing file, normalizing strings & evaluating fuzzy matches...</span>
              </div>
            )}

            {/* Selected File Badge */}
            {file && !validating && (
              <div className="flex items-center justify-between bg-neutral-850 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="h-6 w-6 text-indigo-500" />
                  <div>
                    <h4 className="text-xs font-bold text-white">{file.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB • Format: {file.name.split(".").pop()?.toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetUploadState}
                  className="text-xs text-rose-500 hover:text-rose-400 font-semibold cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Structured Row-Level Error / Skipped Report Table */}
            {structuredErrors.length > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-500">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <h4 className="text-sm font-bold">Row Issues & Unresolved Matches ({structuredErrors.length})</h4>
                  </div>
                  <Button
                    onClick={handleDownloadErrorReport}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs py-1.5 px-3 rounded-xl border-none cursor-pointer flex items-center shadow"
                  >
                    <FileDown className="h-3.5 w-3.5 mr-1.5" />
                    Download Error Report (.xlsx)
                  </Button>
                </div>

                <div className="max-h-72 overflow-y-auto border border-rose-950 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-rose-950/40 text-rose-300 font-bold border-b border-rose-900/40">
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Sheet</th>
                        <th className="p-2.5">Row</th>
                        <th className="p-2.5">Column</th>
                        <th className="p-2.5">Original Value</th>
                        <th className="p-2.5">Reason</th>
                        <th className="p-2.5">Suggested Fix</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-950/30 text-slate-300">
                      {structuredErrors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-rose-950/20">
                          <td className="p-2.5 font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                              err.status === "Skipped"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }`}>
                              {err.status || "Failed"}
                            </span>
                          </td>
                          <td className="p-2.5 font-semibold text-white">{err.sheet}</td>
                          <td className="p-2.5 font-mono text-slate-400">#{err.row}</td>
                          <td className="p-2.5 font-medium text-indigo-300">{err.column}</td>
                          <td className="p-2.5 text-rose-300 font-mono bg-rose-950/30 rounded px-1.5">{err.value || "empty"}</td>
                          <td className="p-2.5 text-slate-300">{err.reason}</td>
                          <td className="p-2.5">
                            {err.suggestion ? (
                              <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                                {err.suggestion}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {importMode === "strict" ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-3">
                    <p className="text-xs text-rose-400">
                      Strict mode prevents importing until all errors are fixed. Or switch mode below:
                    </p>
                    <Button
                      onClick={() => handleImport("partial")}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs py-2 px-4 rounded-xl cursor-pointer font-bold"
                    >
                      Import Valid Rows Only
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-amber-400">
                    Partial mode enabled: Valid rows will be imported and the invalid rows above will be skipped.
                  </p>
                )}
              </div>
            )}

            {/* Validation Preview Stats & Execution Controls */}
            {previewData && !importSuccessData && (
              <div className="space-y-4">
                {structuredErrors.length === 0 && (
                  <div className="flex items-center space-x-2 text-emerald-500">
                    <CheckCircle2 className="h-5 w-5" />
                    <h4 className="text-sm font-bold">Validation Passed Successfully</h4>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { title: "Categories", key: "categories", count: parsedCount?.categories },
                    { title: "Menu Items", key: "menuItems", count: parsedCount?.menuItems },
                    { title: "Variants", key: "variants", count: parsedCount?.variants },
                    { title: "Add-ons", key: "addons", count: parsedCount?.addons }
                  ].map(stat => (
                    <div key={stat.key} className="bg-neutral-850 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">{stat.title}</span>
                      <div className="mt-2 space-y-1">
                        <div className="text-lg font-bold text-white">{stat.count} <span className="text-xs text-slate-500">total</span></div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span className="text-emerald-500">+{previewData[stat.key]?.create} New</span>
                          <span className="text-amber-500">~{previewData[stat.key]?.update} Update</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => handleImport()}
                    disabled={importing || (importMode === "strict" && structuredErrors.length > 0)}
                    className={`border-none py-3 px-6 rounded-xl font-bold cursor-pointer flex items-center shadow-lg ${
                      importMode === "strict" && structuredErrors.length > 0
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Executing Smart Import...
                      </>
                    ) : (
                      <>
                        Confirm and Execute Import ({importMode.toUpperCase()})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Import Success Granular Summary Card */}
            {importSuccessData && (
              <div className="bg-emerald-600/10 border border-emerald-500/20 p-6 rounded-2xl space-y-5">
                <div className="flex items-center justify-between text-emerald-500">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-6 w-6" />
                    <h4 className="text-md font-bold">Import Complete</h4>
                  </div>
                  {importSuccessData.processingTimeMs && (
                    <span className="text-xs text-slate-400 flex items-center bg-neutral-850 px-3 py-1 rounded-full border border-slate-800">
                      <Clock className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
                      Processing Time: {(importSuccessData.processingTimeMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>

                {/* Granular Summary Metrics */}
                {importSuccessData.summary && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      { title: "Categories", key: "categories" },
                      { title: "Menu Items", key: "menuItems" },
                      { title: "Variants", key: "variants" },
                      { title: "Add-ons", key: "addons" }
                    ].map(m => {
                      const stats = importSuccessData.summary[m.key];
                      const importedCount = (stats?.create || 0) + (stats?.update || 0);
                      return (
                        <div key={m.key} className="bg-neutral-850 p-4 rounded-2xl border border-slate-800 space-y-2">
                          <span className="text-sm font-bold text-white">{m.title}</span>
                          <div className="space-y-1 text-xs text-slate-300 pt-1">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Imported:</span>
                              <span className="font-bold text-emerald-400">{importedCount}</span>
                            </div>
                            {stats?.update > 0 && (
                              <div className="flex justify-between text-[11px]">
                                <span className="text-slate-500">Updated:</span>
                                <span className="font-semibold text-amber-400">{stats.update}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-400">Skipped:</span>
                              <span className="font-bold text-slate-300">{stats?.skipped || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Failed:</span>
                              <span className="font-bold text-rose-400">{stats?.failed || 0}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={resetUploadState}
                    className="bg-slate-800 hover:bg-slate-700 text-white border-none py-2.5 px-5 rounded-xl cursor-pointer"
                  >
                    Upload Another File
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
