"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { 
  User,
  Bell,
  Shield,
  Palette,
  CreditCard,
  HelpCircle
} from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground"
        >
          Settings
        </motion.h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xl font-medium text-primary">DR</span>
              </div>
              <Button variant="outline" className="rounded-xl">Change Photo</Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" defaultValue="Rebecca" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" defaultValue="Thompson" className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="rebecca@practice.com" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credentials">Credentials</Label>
              <Input id="credentials" defaultValue="PhD, LMFT" className="rounded-xl" />
            </div>
            <Button className="rounded-xl">Save Changes</Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Email notifications</p>
                <p className="text-xs text-muted-foreground">Receive emails about client activity</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Homework completions</p>
                <p className="text-xs text-muted-foreground">Get notified when clients complete assignments</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Weekly summary</p>
                <p className="text-xs text-muted-foreground">Receive a weekly digest of practice activity</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">AI suggestions</p>
                <p className="text-xs text-muted-foreground">Get notified about new AI homework recommendations</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Privacy & Security */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Two-factor authentication</p>
                <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
              <Button variant="outline" className="rounded-xl">Enable</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Session timeout</p>
                <p className="text-xs text-muted-foreground">Automatically log out after inactivity</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div>
              <Button variant="outline" className="rounded-xl">Change Password</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Billing */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Billing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Growing Practice Plan</p>
                  <p className="text-xs text-muted-foreground">$79/month - Renews on Jan 15, 2026</p>
                </div>
                <Button variant="outline" className="rounded-xl">Manage</Button>
              </div>
            </div>
            <Button variant="ghost" className="rounded-xl">View Billing History</Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Help */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Help & Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start rounded-xl">
              Documentation
            </Button>
            <Button variant="outline" className="w-full justify-start rounded-xl">
              Contact Support
            </Button>
            <Button variant="outline" className="w-full justify-start rounded-xl">
              Request a Feature
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
