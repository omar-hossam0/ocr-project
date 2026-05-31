"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Settings as SettingsIcon,
  MapPin,
  Building2,
  Users,
  Bell,
  Plus,
  Edit3,
  Trash2,
  Save,
  Shield,
  Clock,
  Loader2,
} from "lucide-react";
import type { TranslationKey } from "@/app/lib/translations";
import { useLanguage } from "@/app/lib/language-context";
import { useToast } from "@/components/ToastProvider";
import {
  fetchWithCache,
  invalidateCachePrefix,
  getCacheSnapshot,
} from "@/app/lib/client-cache";

type SettingsLocation = {
  id: string;
  name: string;
  nameAr?: string;
  type: string;
  typeAr?: string;
};

type SettingsDepartment = {
  id: string;
  name: string;
  nameAr?: string;
  filesCount?: number;
};

type UserRole = "Admin" | "Editor" | "Viewer";

type SettingsUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type SystemSettings = {
  fileExpirationDays: number;
  notifyOnFileExpiration: boolean;
  notifyOnFileCheckout: boolean;
  dailySummaryEmail: boolean;
  maxUploadSizeMb: number;
};

const EMPTY_SYSTEM_SETTINGS: SystemSettings = {
  fileExpirationDays: 365,
  notifyOnFileExpiration: true,
  notifyOnFileCheckout: true,
  dailySummaryEmail: false,
  maxUploadSizeMb: 50,
};

const tabs = [
  { id: "locations", label: "Storage Locations", icon: MapPin },
  { id: "departments", label: "Departments", icon: Building2 },
  { id: "users", label: "Users", icon: Users },
  { id: "system", label: "System", icon: SettingsIcon },
] as const;

function roleBadgeClass(role: UserRole) {
  if (role === "Admin") return "bg-red-500/20 text-red-400";
  if (role === "Editor") return "bg-sky-500/20 text-sky-400";
  return "bg-white/10 text-gray-400";
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("locations");
  const { tr, locale } = useLanguage();
  const { showToast, showConfirmToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savingSystem, setSavingSystem] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [locations, setLocations] = useState<SettingsLocation[]>([]);
  const [departments, setDepartments] = useState<SettingsDepartment[]>([]);
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(
    EMPTY_SYSTEM_SETTINGS,
  );

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [locationsRes, departmentsRes, usersRes, systemRes] =
        await Promise.all([
          fetchWithCache(
            "settings-page/locations",
            () => fetch("/api/settings/locations").then((r) => r.json()),
            { ttlMs: 60_000 },
          ),
          fetchWithCache(
            "settings-page/departments",
            () => fetch("/api/settings/departments").then((r) => r.json()),
            { ttlMs: 60_000 },
          ),
          fetchWithCache(
            "settings-page/users",
            () => fetch("/api/settings/users").then((r) => r.json()),
            { ttlMs: 60_000 },
          ),
          fetchWithCache(
            "settings-page/system",
            () => fetch("/api/settings/system").then((r) => r.json()),
            { ttlMs: 60_000 },
          ),
        ]);

      if (!locationsRes.success) {
        throw new Error(locationsRes.error || "Failed to load locations");
      }
      if (!departmentsRes.success) {
        throw new Error(departmentsRes.error || "Failed to load departments");
      }
      if (!usersRes.success) {
        throw new Error(usersRes.error || "Failed to load users");
      }
      if (!systemRes.success) {
        throw new Error(systemRes.error || "Failed to load system settings");
      }

      setLocations(locationsRes.data || []);
      setDepartments(departmentsRes.data || []);
      setUsers(usersRes.data || []);
      setSystemSettings({
        fileExpirationDays: Number(
          systemRes.data?.fileExpirationDays ??
            EMPTY_SYSTEM_SETTINGS.fileExpirationDays,
        ),
        notifyOnFileExpiration: Boolean(
          systemRes.data?.notifyOnFileExpiration ??
          EMPTY_SYSTEM_SETTINGS.notifyOnFileExpiration,
        ),
        notifyOnFileCheckout: Boolean(
          systemRes.data?.notifyOnFileCheckout ??
          EMPTY_SYSTEM_SETTINGS.notifyOnFileCheckout,
        ),
        dailySummaryEmail: Boolean(
          systemRes.data?.dailySummaryEmail ??
          EMPTY_SYSTEM_SETTINGS.dailySummaryEmail,
        ),
        maxUploadSizeMb: Number(
          systemRes.data?.maxUploadSizeMb ??
            EMPTY_SYSTEM_SETTINGS.maxUploadSizeMb,
        ),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load settings";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAddLocation = useCallback(async () => {
    const name = window.prompt(tr("common.locationNamePrompt", "Location name (English)"), "");
    if (!name) return;
    const nameAr = window.prompt("Location name (Arabic)", name);
    if (!nameAr) return;
    
    const type = window.prompt(
      tr("common.locationTypePrompt", "Location type (Cabinet/Office/Storage) - English"),
      "Cabinet",
    );
    if (!type) return;
    const typeAr = window.prompt("Location type (Arabic)", "خزانة");
    if (!typeAr) return;

    setBusyKey("add-location");
    try {
      const response = await fetch("/api/settings/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nameAr, type, typeAr }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to add location");
      }
      invalidateCachePrefix("settings-page/locations");
      await loadData();
      showToast("Location added", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add location";
      showToast(message, "error");
    } finally {
      setBusyKey(null);
    }
  }, [loadData, showToast]);

  const handleEditLocation = useCallback(
    async (location: SettingsLocation) => {
      const name = window.prompt("Location name (English)", location.name);
      if (!name) return;
      const nameAr = window.prompt("Location name (Arabic)", location.nameAr || name);
      if (!nameAr) return;
      
      const type = window.prompt("Location type (English)", location.type);
      if (!type) return;
      const typeAr = window.prompt("Location type (Arabic)", location.typeAr || "خزانة");
      if (!typeAr) return;

      setBusyKey(`edit-location-${location.id}`);
      try {
        const response = await fetch(`/api/settings/locations/${location.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, nameAr, type, typeAr }),
        });
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json.error || "Failed to update location");
        }      invalidateCachePrefix("settings-page/locations");
      await loadData();
      showToast("Location updated", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update location";
      showToast(message, "error");
    } finally {
      setBusyKey(null);
    }
  },
    [loadData, showToast],
  );

  const handleDeleteLocation = useCallback(
    async (location: SettingsLocation) => {
      const confirmed = await showConfirmToast(
        `Delete location \"${location.name}\"?`,
        { confirmText: "Delete", cancelText: "Cancel" },
      );
      if (!confirmed) return;

      setBusyKey(`delete-location-${location.id}`);
      try {
        const response = await fetch(`/api/settings/locations/${location.id}`, {
          method: "DELETE",
        });
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json.error || "Failed to delete location");
        }
        invalidateCachePrefix("settings-page/locations");
        setLocations((prev) => prev.filter((item) => item.id !== location.id));
        showToast("Location deleted", "success");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete location";
        showToast(message, "error");
      } finally {
        setBusyKey(null);
      }
    },
    [showConfirmToast, showToast],
  );

  const handleAddDepartment = useCallback(async () => {
    const name = window.prompt(tr("common.departmentNamePrompt", "Department name (English)"), "");
    if (!name) return;
    const nameAr = window.prompt("Department name (Arabic)", name);
    if (!nameAr) return;

    setBusyKey("add-department");
    try {
      const response = await fetch("/api/settings/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nameAr }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to add department");
      }
      invalidateCachePrefix("settings-page/departments");
      await loadData();
      showToast("Department added", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add department";
      showToast(message, "error");
    } finally {
      setBusyKey(null);
    }
  }, [loadData, showToast]);

  const handleEditDepartment = useCallback(
    async (department: SettingsDepartment) => {
      const name = window.prompt("Department name (English)", department.name);
      if (!name) return;
      const nameAr = window.prompt("Department name (Arabic)", department.nameAr || name);
      if (!nameAr) return;

      setBusyKey(`edit-department-${department.id}`);
      try {
        const response = await fetch(
          `/api/settings/departments/${department.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, nameAr }),
          },
        );
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json.error || "Failed to update department");
        }      invalidateCachePrefix("settings-page/departments");
      await loadData();
      showToast("Department updated", "success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update department";
      showToast(message, "error");
    } finally {
      setBusyKey(null);
    }
  },
    [loadData, showToast],
  );

  const handleDeleteDepartment = useCallback(
    async (department: SettingsDepartment) => {
      const confirmed = await showConfirmToast(
        `Delete department \"${department.name}\"?`,
        { confirmText: "Delete", cancelText: "Cancel" },
      );
      if (!confirmed) return;

      setBusyKey(`delete-department-${department.id}`);
      try {
        const response = await fetch(
          `/api/settings/departments/${department.id}`,
          {
            method: "DELETE",
          },
        );
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json.error || "Failed to delete department");
        }
        invalidateCachePrefix("settings-page/departments");
        setDepartments((prev) =>
          prev.filter((item) => item.id !== department.id),
        );
        showToast("Department deleted", "success");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to delete department";
        showToast(message, "error");
      } finally {
        setBusyKey(null);
      }
    },
    [showConfirmToast, showToast],
  );

  const handleSaveSystem = useCallback(async () => {
    setSavingSystem(true);
    try {
      const response = await fetch("/api/settings/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(systemSettings),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to save system settings");
      }
      invalidateCachePrefix("settings-page/system");
      showToast("System settings saved", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save settings";
      showToast(message, "error");
    } finally {
      setSavingSystem(false);
    }
  }, [showToast, systemSettings]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{tr("settings.title", "Settings")}</h1>
        <p className="text-gray-400 text-sm mt-1">
          {tr("settings.description", "Manage your system, locations, departments, and users")}
        </p>
      </div>

      <div className="flex gap-1 bg-white/5 rounded-2xl p-1 overflow-x-auto border border-white/10">
        {tabs.map((tab) => {
          const tabKey =
            tab.id === "locations"
              ? ("settings.storageLocations" as const)
              : ("settings." + tab.id as TranslationKey);
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${activeTab === tab.id ? "bg-sky-500 text-white" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
            >
              <tab.icon className="w-4 h-4" /> {tr(tabKey, tab.label)}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="glass-card p-8 flex items-center justify-center gap-3 text-gray-300">
          <Loader2 className="w-5 h-5 animate-spin" />
          {tr("common.loadingSettings", "Loading settings...")}
        </div>
      )}

      {activeTab === "locations" && !loading && (
        <div className="glass-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold text-white">{tr("settings.addLocationTitle", "Storage Locations")}</h2>
            <button
              onClick={handleAddLocation}
              disabled={!!busyKey}
              className="inline-flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-sky-400 transition disabled:opacity-60"
            >
              <Plus className="w-4 h-4" /> {tr("settings.addLocation", "Add Location")}
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/20 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {locale === "ar" ? loc.nameAr || loc.name : loc.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {locale === "ar" ? loc.typeAr || loc.type : loc.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => void handleEditLocation(loc)}
                    disabled={!!busyKey}
                    className="p-2 hover:bg-white/10 rounded-lg transition disabled:opacity-60"
                  >
                    <Edit3 className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => void handleDeleteLocation(loc)}
                    disabled={!!busyKey}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
            {!locations.length && (
              <div className="px-6 py-8 text-sm text-gray-500 text-center">
                {tr("common.noLocations", "No locations yet.")}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "departments" && !loading && (
        <div className="glass-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold text-white">{tr("settings.addDepartmentTitle", "Departments")}</h2>
            <button
              onClick={handleAddDepartment}
              disabled={!!busyKey}
              className="inline-flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-sky-400 transition disabled:opacity-60"
            >
              <Plus className="w-4 h-4" /> {tr("settings.addDepartment", "Add Department")}
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {locale === "ar" ? dept.nameAr || dept.name : dept.name}
                    </p>                      <p className="text-xs text-gray-500">
                        {dept.filesCount || 0} {tr("common.files", "files")}
                      </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => void handleEditDepartment(dept)}
                    disabled={!!busyKey}
                    className="p-2 hover:bg-white/10 rounded-lg transition disabled:opacity-60"
                  >
                    <Edit3 className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => void handleDeleteDepartment(dept)}
                    disabled={!!busyKey}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
            {!departments.length && (
              <div className="px-6 py-8 text-sm text-gray-500 text-center">
                {tr("common.noDepartments", "No departments yet.")}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "users" && !loading && (
        <div className="glass-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold text-white">{tr("settings.users", "Users")}</h2>
            <span className="text-xs text-gray-400">
              Synced from real user accounts
            </span>
          </div>

          <div className="divide-y divide-white/5">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-300">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleBadgeClass(user.role)}`}
                >
                  {user.role}
                </span>
              </div>
            ))}
            {!users.length && (
              <div className="px-6 py-8 text-sm text-gray-500 text-center">
                {tr("common.noUsers", "No registered users yet.")}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "system" && !loading && (
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <h2 className="font-semibold text-white">{tr("settings.systemSettings", "System Settings")}</h2>
            <div className="space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">                    <Clock className="w-4 h-4 text-gray-500" /> {tr("settings.fileExpiration", "File Expiration Period (days)")}
                </label>
                <input
                  type="number"
                  value={systemSettings.fileExpirationDays}
                  onChange={(e) =>
                    setSystemSettings((prev) => ({
                      ...prev,
                      fileExpirationDays: Number(e.target.value || 0),
                    }))
                  }
                  className="w-full sm:w-64 px-4 py-3 rounded-xl border border-white/15 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">                    <Bell className="w-4 h-4 text-gray-500" /> {tr("settings.notifications", "Notification Settings")}
                </label>
                <div className="space-y-3 mt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.notifyOnFileExpiration}
                      onChange={(e) =>
                        setSystemSettings((prev) => ({
                          ...prev,
                          notifyOnFileExpiration: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded border-white/20 text-sky-500 focus:ring-sky-500 bg-white/10"
                    />
                    <span className="text-sm text-gray-300">
                      {tr("settings.notifyExpiration", "Notify on file expiration")}
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.notifyOnFileCheckout}
                      onChange={(e) =>
                        setSystemSettings((prev) => ({
                          ...prev,
                          notifyOnFileCheckout: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded border-white/20 text-sky-500 focus:ring-sky-500 bg-white/10"
                    />
                    <span className="text-sm text-gray-300">
                      {tr("settings.notifyCheckout", "Notify on file checkout")}
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.dailySummaryEmail}
                      onChange={(e) =>
                        setSystemSettings((prev) => ({
                          ...prev,
                          dailySummaryEmail: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded border-white/20 text-sky-500 focus:ring-sky-500 bg-white/10"
                    />
                    <span className="text-sm text-gray-300">
                      {tr("settings.dailySummary", "Daily summary email")}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">                    <Shield className="w-4 h-4 text-gray-500" /> {tr("settings.maxUploadSize", "Max Upload Size (MB)")}
                </label>
                <input
                  type="number"
                  value={systemSettings.maxUploadSizeMb}
                  onChange={(e) =>
                    setSystemSettings((prev) => ({
                      ...prev,
                      maxUploadSizeMb: Number(e.target.value || 0),
                    }))
                  }
                  className="w-full sm:w-64 px-4 py-3 rounded-xl border border-white/15 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition"
                />
              </div>
            </div>

            <button
              onClick={() => void handleSaveSystem()}
              disabled={savingSystem}
              className="inline-flex items-center gap-2 bg-sky-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-sky-400 transition disabled:opacity-70"
            >
              {savingSystem ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {tr("settings.saveSettings", "Save Settings")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
