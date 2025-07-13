import { useState } from 'react';
import { Copy, ExternalLink, Zap, Github, Globe, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

export function WebhooksPage() {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const webhookEndpoints = [
    {
      name: 'GitHub PR Webhook',
      endpoint: '/api/webhooks/github-pr',
      description: 'Triggered when a pull request is opened, updated, or merged',
      icon: Github,
      color: 'bg-purple-500/10 text-purple-500',
      method: 'POST',
      events: ['pull_request', 'deployment'],
    },
    {
      name: 'Generic Webhook',
      endpoint: '/api/webhooks/generic',
      description: 'Generic webhook for custom integrations',
      icon: Zap,
      color: 'bg-blue-500/10 text-blue-500',
      method: 'POST',
      events: ['custom'],
    },
    {
      name: 'Deployment Webhook',
      endpoint: '/api/webhooks/deployment',
      description: 'Triggered when a deployment is created or updated',
      icon: Globe,
      color: 'bg-green-500/10 text-green-500',
      method: 'POST',
      events: ['deployment'],
    },
  ];

  const copyToClipboard = (text: string, endpoint: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpoint);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const getFullUrl = (endpoint: string) => {
    return `${window.location.origin}${endpoint}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Configure webhook endpoints to trigger tests automatically
          </p>
        </div>
      </div>

      {/* Webhook Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Webhook Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">Webhook service is healthy</span>
            </div>
            <Badge className="bg-green-500/10 text-green-500">
              Online
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Available Webhooks */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {webhookEndpoints.map((webhook) => {
          const Icon = webhook.icon;
          return (
            <Card key={webhook.name}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Icon className="w-5 h-5 mr-2" />
                  {webhook.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {webhook.description}
                </p>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Endpoint URL</label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={getFullUrl(webhook.endpoint)}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getFullUrl(webhook.endpoint), webhook.endpoint)}
                    >
                      {copiedEndpoint === webhook.endpoint ? 'Copied!' : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Method</label>
                  <Badge variant="outline">{webhook.method}</Badge>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Supported Events</label>
                  <div className="flex flex-wrap gap-2">
                    {webhook.events.map((event) => (
                      <Badge key={event} className={webhook.color}>
                        {event}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">GitHub Integration</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Go to your GitHub repository settings</li>
              <li>Navigate to "Webhooks" section</li>
              <li>Click "Add webhook"</li>
              <li>Set the Payload URL to the GitHub PR webhook endpoint</li>
              <li>Set Content type to "application/json"</li>
              <li>Select individual events: "Pull requests" and "Deployments"</li>
              <li>Save the webhook</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Required Payload</h3>
            <p className="text-sm text-muted-foreground">
              All webhooks require an <code className="bg-muted px-1 py-0.5 rounded">environment_id</code> parameter
              to specify which environment to run tests against.
            </p>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "environment_id": "your-environment-uuid",
  "custom_config": {
    "BASE_URL": "https://your-app.com",
    "TIMEOUT": 30000
  }
}`}
            </pre>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Security</h3>
            <p className="text-sm text-muted-foreground">
              Webhooks are currently open endpoints. Consider implementing authentication
              and request validation for production use.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Webhook Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Webhook Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No recent webhook activity</p>
            <p className="text-sm">Webhook logs will appear here once you start receiving requests</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}