"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@repo/ui";
import { useState } from "react";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    marketing: false,
    updates: true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Choose what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive emails about your account activity
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifications.email}
                onClick={() =>
                  setNotifications((n) => ({ ...n, email: !n.email }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.email ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.email ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Marketing Emails</p>
                <p className="text-sm text-muted-foreground">
                  Receive emails about new features and offers
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifications.marketing}
                onClick={() =>
                  setNotifications((n) => ({ ...n, marketing: !n.marketing }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.marketing ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.marketing ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Product Updates</p>
                <p className="text-sm text-muted-foreground">
                  Receive emails about product updates and changes
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifications.updates}
                onClick={() =>
                  setNotifications((n) => ({ ...n, updates: !n.updates }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.updates ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.updates ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how the application looks and feels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="flex gap-4">
                <button
                  type="button"
                  className="flex flex-col items-center gap-2 rounded-lg border-2 border-primary p-4"
                >
                  <div className="h-16 w-24 rounded bg-background border" />
                  <span className="text-sm font-medium">Light</span>
                </button>
                <button
                  type="button"
                  className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted p-4 hover:border-primary/50"
                >
                  <div className="h-16 w-24 rounded bg-slate-900" />
                  <span className="text-sm font-medium">Dark</span>
                </button>
                <button
                  type="button"
                  className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted p-4 hover:border-primary/50"
                >
                  <div className="h-16 w-24 rounded bg-gradient-to-r from-background to-slate-900" />
                  <span className="text-sm font-medium">System</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Manage your API keys for external integrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  value="sk_live_••••••••••••••••••••••••••••••••"
                  disabled
                  className="font-mono"
                />
                <Button variant="outline">Copy</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This key was created on January 15, 2025
              </p>
            </div>

            <Button variant="outline">Generate New Key</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
