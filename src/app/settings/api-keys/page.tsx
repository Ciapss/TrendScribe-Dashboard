"use client"

import { useState } from "react"
import { ApiKeysTable } from "@/components/settings/api-keys-table"
import { CreateApiKeyForm } from "@/components/settings/create-api-key-form"

export default function ApiKeysPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleKeyCreated = () => {
    // Trigger a refresh of the table by incrementing the refresh trigger
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Keys</h2>
          <p className="text-muted-foreground">
            Manage API keys for accessing TrendScribe programmatically.
          </p>
        </div>
        <CreateApiKeyForm onKeyCreated={handleKeyCreated} />
      </div>
      
      <ApiKeysTable key={refreshTrigger} />
    </div>
  )
}