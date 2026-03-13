"use client";
import { useState, useCallback } from "react";
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
} from "lucide-react";
const locations = [
  { id: 1, name: "Cabinet A - Drawer 1", type: "Cabinet" },
  { id: 2, name: "Cabinet A - Drawer 2", type: "Cabinet" },
  { id: 3, name: "Cabinet A - Drawer 3", type: "Cabinet" },
  { id: 4, name: "Cabinet B - Drawer 1", type: "Cabinet" },
  { id: 5, name: "Office 1 - Shelf A", type: "Office" },
  { id: 6, name: "Office 2 - Shelf B", type: "Office" },
  { id: 7, name: "Storage Room 1", type: "Storage" },
  { id: 8, name: "Storage Room 2", type: "Storage" },
];
const departments = [
  { id: 1, name: "Legal", filesCount: 342 },
  { id: 2, name: "HR", filesCount: 218 },
  { id: 3, name: "Finance", filesCount: 456 },
  { id: 4, name: "Operations", filesCount: 128 },
  { id: 5, name: "IT", filesCount: 67 },
  { id: 6, name: "Administration", filesCount: 73 },
];
const users = [
  { id: 1, name: "Omar Ahmed", email: "omar@company.com", role: "Admin" },
  { id: 2, name: "Sara Hassan", email: "sara@company.com", role: "Editor" },
  { id: 3, name: "Khalid Ali", email: "khalid@company.com", role: "Viewer" },
  { id: 4, name: "Fatima Omar", email: "fatima@company.com", role: "Editor" },
  { id: 5, name: "Ahmad Mohamed", email: "ahmad@company.com", role: "Viewer" },
];
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("locations");
  
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);
  
  const tabs = [
    { id: "locations", label: "Storage Locations", icon: MapPin },
    { id: "departments", label: "Departments", icon: Building2 },
    { id: "users", label: "Users", icon: Users },
    { id: "system", label: "System", icon: SettingsIcon },
  ];
  return (
    <div className="space-y-6">
      {" "}
      {/* Header */}{" "}
      <div>
        {" "}
        <h1 className="text-2xl font-bold text-white">Settings</h1>{" "}
        <p className="text-gray-400 text-sm mt-1">
          Manage your system, locations, departments, and users
        </p>{" "}
      </div>{" "}
      {/* Tabs */}{" "}
      <div className="flex gap-1 bg-white/5 rounded-2xl p-1 overflow-x-auto border border-white/10">
        {" "}
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${activeTab === tab.id ? "bg-sky-500 text-white" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
          >
            {" "}
            <tab.icon className="w-4 h-4" /> {tab.label}{" "}
          </button>
        ))}{" "}
      </div>{" "}
      {/* Locations */}{" "}
      {activeTab === "locations" && (
        <div className="glass-card">
          {" "}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            {" "}
            <h2 className="font-semibold text-white">Storage Locations</h2>{" "}
            <button className="inline-flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-sky-400 transition">
              {" "}
              <Plus className="w-4 h-4" /> Add Location{" "}
            </button>{" "}
          </div>{" "}
          <div className="divide-y divide-white/5">
            {" "}
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition"
              >
                {" "}
                <div className="flex items-center gap-3">
                  {" "}
                  <div className="w-9 h-9 rounded-lg bg-sky-500/20 flex items-center justify-center">
                    {" "}
                    <MapPin className="w-4 h-4 text-sky-400" />{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-sm font-medium text-white">
                      {loc.name}
                    </p>{" "}
                    <p className="text-xs text-gray-500">{loc.type}</p>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="flex items-center gap-1">
                  {" "}
                  <button className="p-2 hover:bg-white/10 rounded-lg transition">
                    {" "}
                    <Edit3 className="w-4 h-4 text-gray-400" />{" "}
                  </button>{" "}
                  <button className="p-2 hover:bg-red-500/20 rounded-lg transition">
                    {" "}
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />{" "}
                  </button>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Departments */}{" "}
      {activeTab === "departments" && (
        <div className="glass-card">
          {" "}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            {" "}
            <h2 className="font-semibold text-white">Departments</h2>{" "}
            <button className="inline-flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-sky-400 transition">
              {" "}
              <Plus className="w-4 h-4" /> Add Department{" "}
            </button>{" "}
          </div>{" "}
          <div className="divide-y divide-white/5">
            {" "}
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition"
              >
                {" "}
                <div className="flex items-center gap-3">
                  {" "}
                  <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    {" "}
                    <Building2 className="w-4 h-4 text-purple-400" />{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-sm font-medium text-white">
                      {dept.name}
                    </p>{" "}
                    <p className="text-xs text-gray-500">
                      {dept.filesCount} files
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="flex items-center gap-1">
                  {" "}
                  <button className="p-2 hover:bg-white/10 rounded-lg transition">
                    {" "}
                    <Edit3 className="w-4 h-4 text-gray-400" />{" "}
                  </button>{" "}
                  <button className="p-2 hover:bg-red-500/20 rounded-lg transition">
                    {" "}
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />{" "}
                  </button>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Users */}{" "}
      {activeTab === "users" && (
        <div className="glass-card">
          {" "}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            {" "}
            <h2 className="font-semibold text-white">Users</h2>{" "}
            <button className="inline-flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-sky-400 transition">
              {" "}
              <Plus className="w-4 h-4" /> Add User{" "}
            </button>{" "}
          </div>{" "}
          <div className="divide-y divide-white/5">
            {" "}
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition"
              >
                {" "}
                <div className="flex items-center gap-3">
                  {" "}
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                    {" "}
                    <span className="text-sm font-medium text-gray-300">
                      {" "}
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}{" "}
                    </span>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-sm font-medium text-white">
                      {user.name}
                    </p>{" "}
                    <p className="text-xs text-gray-500">{user.email}</p>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="flex items-center gap-3">
                  {" "}
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${user.role === "Admin" ? "bg-red-500/20 text-red-400" : user.role === "Editor" ? "bg-sky-500/20 text-sky-400" : "bg-white/10 text-gray-400"}`}
                  >
                    {" "}
                    {user.role}{" "}
                  </span>{" "}
                  <div className="flex items-center gap-1">
                    {" "}
                    <button className="p-2 hover:bg-white/10 rounded-lg transition">
                      {" "}
                      <Edit3 className="w-4 h-4 text-gray-400" />{" "}
                    </button>{" "}
                    <button className="p-2 hover:bg-red-500/20 rounded-lg transition">
                      {" "}
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />{" "}
                    </button>{" "}
                  </div>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* System */}{" "}
      {activeTab === "system" && (
        <div className="space-y-6">
          {" "}
          <div className="glass-card p-6 space-y-6">
            {" "}
            <h2 className="font-semibold text-white">System Settings</h2>{" "}
            <div className="space-y-5">
              {" "}
              <div>
                {" "}
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
                  {" "}
                  <Clock className="w-4 h-4 text-gray-500" /> File Expiration
                  Period (days){" "}
                </label>{" "}
                <input
                  type="number"
                  defaultValue={365}
                  className="w-full sm:w-64 px-4 py-3 rounded-xl border border-white/15 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition"
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
                  {" "}
                  <Bell className="w-4 h-4 text-gray-500" /> Notification
                  Settings{" "}
                </label>{" "}
                <div className="space-y-3 mt-2">
                  {" "}
                  <label className="flex items-center gap-3 cursor-pointer">
                    {" "}
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded border-white/20 text-sky-500 focus:ring-sky-500 bg-white/10"
                    />{" "}
                    <span className="text-sm text-gray-300">
                      Notify on file expiration
                    </span>{" "}
                  </label>{" "}
                  <label className="flex items-center gap-3 cursor-pointer">
                    {" "}
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded border-white/20 text-sky-500 focus:ring-sky-500 bg-white/10"
                    />{" "}
                    <span className="text-sm text-gray-300">
                      Notify on file checkout
                    </span>{" "}
                  </label>{" "}
                  <label className="flex items-center gap-3 cursor-pointer">
                    {" "}
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-white/20 text-sky-500 focus:ring-sky-500 bg-white/10"
                    />{" "}
                    <span className="text-sm text-gray-300">
                      Daily summary email
                    </span>{" "}
                  </label>{" "}
                </div>{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
                  {" "}
                  <Shield className="w-4 h-4 text-gray-500" /> Max Upload Size
                  (MB){" "}
                </label>{" "}
                <input
                  type="number"
                  defaultValue={50}
                  className="w-full sm:w-64 px-4 py-3 rounded-xl border border-white/15 bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition"
                />{" "}
              </div>{" "}
            </div>{" "}
            <button className="inline-flex items-center gap-2 bg-sky-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-sky-400 transition">
              {" "}
              <Save className="w-4 h-4" /> Save Settings{" "}
            </button>{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
