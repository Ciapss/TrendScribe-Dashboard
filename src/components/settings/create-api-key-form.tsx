"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Plus, Copy, Check, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiClient } from "@/lib/api-client"
import type { APIKey } from "@/types"

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  readPosts: z.boolean(),
  generatePosts: z.boolean(),
  manageWebhooks: z.boolean(),
  expiresAt: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface CreateApiKeyFormProps {
  onKeyCreated?: () => void
}

export function CreateApiKeyForm({ onKeyCreated }: CreateApiKeyFormProps = {}) {
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<APIKey | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      readPosts: true,
      generatePosts: false,
      manageWebhooks: false,
      expiresAt: "",
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsCreating(true)
    setError(null)
    
    try {
      const apiKey = await apiClient.createApiKey({
        name: data.name,
        permissions: {
          readPosts: data.readPosts,
          generatePosts: data.generatePosts,
          manageWebhooks: data.manageWebhooks,
        },
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      })
      
      setCreatedKey(apiKey)
      onKeyCreated?.()
    } catch (error) {
      console.error('Failed to create API key:', error)
      setError(error instanceof Error ? error.message : 'Failed to create API key')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyKey = () => {
    if (createdKey?.key) {
      navigator.clipboard.writeText(createdKey.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setCreatedKey(null)
    setCopied(false)
    setError(null)
    form.reset()
  }

  const hasAnyPermission = form.watch("readPosts") || form.watch("generatePosts") || form.watch("manageWebhooks")

  if (createdKey) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create API Key
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-600" />
              <span>API Key Created Successfully</span>
            </DialogTitle>
            <DialogDescription>
              Your new API key has been generated. Make sure to copy it now - you won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Store this key securely. It won&apos;t be shown again for security reasons.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your API Key</label>
              <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                <code className="flex-1 text-sm font-mono break-all select-all">
                  {createdKey.key}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyKey}
                  className={copied ? "bg-green-50 border-green-200" : ""}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Key Details</label>
              <div className="space-y-1 text-sm">
                <div>Name: {createdKey.name}</div>
                <div className="flex items-center space-x-2">
                  <span>Permissions:</span>
                  <div className="flex space-x-1">
                    {createdKey.permissions.readPosts && (
                      <Badge variant="outline" className="text-xs">Read Posts</Badge>
                    )}
                    {createdKey.permissions.generatePosts && (
                      <Badge variant="outline" className="text-xs">Generate Posts</Badge>
                    )}
                    {createdKey.permissions.manageWebhooks && (
                      <Badge variant="outline" className="text-xs">Manage Webhooks</Badge>
                    )}
                  </div>
                </div>
                {createdKey.expiresAt && (
                  <div>Expires: {new Date(createdKey.expiresAt).toLocaleDateString()}</div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const handleDialogChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setError(null)
      if (!createdKey) {
        form.reset()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New API Key</DialogTitle>
          <DialogDescription>
            Generate a new API key to access TrendScribe programmatically.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Production Website, Development Testing"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name to help you identify this key
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Permissions */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-3">Permissions</h4>
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="readPosts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Read Posts</FormLabel>
                          <FormDescription>
                            View and retrieve generated blog posts
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="generatePosts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Generate Posts</FormLabel>
                          <FormDescription>
                            Create new blog posts via API
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="manageWebhooks"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Manage Webhooks</FormLabel>
                          <FormDescription>
                            Create, update, and delete webhook configurations
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {!hasAnyPermission && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please select at least one permission for the API key.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Expiration (optional) */}
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiration Date (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave blank for no expiration. Recommended for security.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isCreating || !hasAnyPermission}
              >
                {isCreating ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create API Key
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}