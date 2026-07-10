"use client";

import * as React from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { User, Shield, Sliders, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [targetUtilization, setTargetUtilization] = React.useState("80");
  const [allowOverAllocation, setAllowOverAllocation] = React.useState(true);

  const handleSaveWorkspaceSettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Settings Updated",
      description: "Workspace policy settings have been updated successfully.",
      type: "success",
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">System Settings</h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Manage user profiles, customize allocation thresholds, and inspect authorization policies
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Profile Details (Left Pane) */}
        <Card className="lg:col-span-1 border-zinc-200/80 shadow-sm dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5">
              <User className="h-4 w-4 text-indigo-600" />
              User Profile
            </CardTitle>
            <CardDescription>Logged in session profile parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4 text-center border-b border-zinc-100 dark:border-zinc-800">
              <div className="h-16 w-16 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                {user?.full_name?.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white">{user?.full_name}</h3>
                <span className="text-xs font-mono text-zinc-500 capitalize bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                  {user?.role} Account
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Email Address</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Account ID</span>
                <span className="font-mono text-zinc-500">#{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Status</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                  <CheckCircle className="h-3 w-3" /> Active
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Settings (Right Pane) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Workspace Configurations Card */}
          <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-indigo-600" />
                Workspace Rule Configurations
              </CardTitle>
              <CardDescription>Customize allocation behavior and utilization alarms</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveWorkspaceSettings} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="target-util">Target Saturation / Utilization Limit (%)</Label>
                  <Input
                    id="target-util"
                    type="number"
                    min="10"
                    max="100"
                    value={targetUtilization}
                    onChange={(e) => setTargetUtilization(e.target.value)}
                  />
                  <p className="text-[11px] text-zinc-400">
                    Triggers a workspace notification banner once allocation exceeds this threshold.
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Allow Project Over-Allocations</Label>
                    <p className="text-[11px] text-zinc-400">
                      Warn instead of blocking assignments if employee total allocation exceeds 100%.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowOverAllocation}
                    onChange={(e) => setAllowOverAllocation(e.target.checked)}
                    className="h-4.5 w-4.5 accent-indigo-600 rounded"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <Button type="submit">Save Configurations</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* User Permissions Table Card */}
          <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-indigo-600" />
                Role Permissions Inspector
              </CardTitle>
              <CardDescription>Detailed overview of action clearances per role</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                      <th className="p-4 font-semibold text-zinc-700 dark:text-zinc-300">Action / Permission</th>
                      <th className="p-4 font-semibold text-zinc-700 dark:text-zinc-300">Admin Role</th>
                      <th className="p-4 font-semibold text-zinc-700 dark:text-zinc-300">Viewer Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    <tr>
                      <td className="p-4 font-medium text-zinc-900 dark:text-white">Read Workspace Layouts / Metrics</td>
                      <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">Allowed</td>
                      <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">Allowed</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-zinc-900 dark:text-white">Create/Edit/Deactivate Employees</td>
                      <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">Allowed</td>
                      <td className="p-4 text-zinc-400">Denied</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-zinc-900 dark:text-white">Allocate Seats (Manual/Auto-Allocate)</td>
                      <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">Allowed</td>
                      <td className="p-4 text-zinc-400">Denied</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-zinc-900 dark:text-white">Manage Projects / Members Mapping</td>
                      <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">Allowed</td>
                      <td className="p-4 text-zinc-400">Denied</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
