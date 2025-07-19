import { useState } from 'react';
import { 
  GitBranch, 
  Github, 
  Slack, 
  Globe, 
  CheckCircle, 
  XCircle, 
  Settings,
  ExternalLink,
  Plus,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';

interface Integration {
  id: string;
  name: string;
  type: 'github' | 'slack' | 'webhook' | 'ci-cd';
  status: 'connected' | 'disconnected' | 'error';
  description: string;
  icon: any;
  color: string;
  lastSync?: string;
  config?: Record<string, any>;
}

export function IntegrationsPage() {
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  const availableIntegrations: Integration[] = [
    {
      id: 'github',
      name: 'GitHub',
      type: 'github',
      status: 'disconnected',
      description: 'Connect to GitHub for PR-based test triggers',
      icon: Github,
      color: 'bg-gray-800 text-white',
    },
    {
      id: 'slack',
      name: 'Slack',
      type: 'slack',
      status: 'disconnected',
      description: 'Send test results and notifications to Slack',
      icon: Slack,
      color: 'bg-purple-600 text-white',
    },
    {
      id: 'webhook',
      name: 'Custom Webhook',
      type: 'webhook',
      status: 'connected',
      description: 'Generic webhook integration for custom workflows',
      icon: Zap,
      color: 'bg-blue-600 text-white',
      lastSync: '2024-01-15T10:30:00Z',
    },
    {
      id: 'jenkins',
      name: 'Jenkins',
      type: 'ci-cd',
      status: 'disconnected',
      description: 'Integrate with Jenkins CI/CD pipeline',
      icon: Settings,
      color: 'bg-orange-600 text-white',
    },
  ];

  const connectedIntegrations = availableIntegrations.filter(i => i.status === 'connected');

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-500/10 text-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500/10 text-red-500">
            <XCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/10 text-gray-500">
            <XCircle className="w-3 h-3 mr-1" />
            Disconnected
          </Badge>
        );
    }
  };

  const handleConfigure = (integration: Integration) => {
    setSelectedIntegration(integration);
    setShowConfigDialog(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Connect your test orchestrator with external tools and services
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Integrations</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableIntegrations.length}</div>
            <p className="text-xs text-muted-foreground">
              Available integrations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedIntegrations.length}</div>
            <p className="text-xs text-muted-foreground">
              Active connections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhooks</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Webhook endpoints
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2m</div>
            <p className="text-xs text-muted-foreground">
              Ago
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Available Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Available Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableIntegrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <Card key={integration.id} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${integration.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                        </div>
                      </div>
                      {getStatusBadge(integration.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {integration.description}
                    </p>
                    
                    {integration.lastSync && (
                      <p className="text-xs text-muted-foreground mb-4">
                        Last sync: {new Date(integration.lastSync).toLocaleString()}
                      </p>
                    )}

                    <div className="flex space-x-2">
                      {integration.status === 'connected' ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConfigure(integration)}
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Configure
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Test
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleConfigure(integration)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Integration Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">GitHub Integration</h3>
            <p className="text-sm text-muted-foreground">
              Connect your GitHub repository to automatically trigger tests on pull requests and deployments.
              Requires webhook configuration in your repository settings.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Slack Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Receive test results and alerts directly in your Slack channels. Configure channels
              for different types of notifications (failures, successes, etc.).
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Custom Webhooks</h3>
            <p className="text-sm text-muted-foreground">
              Create custom integrations with your existing tools using webhook endpoints.
              Supports various trigger events and custom payloads.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">CI/CD Integration</h3>
            <p className="text-sm text-muted-foreground">
              Integrate with popular CI/CD tools like Jenkins, GitHub Actions, or GitLab CI
              to make test orchestration part of your deployment pipeline.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Configure {selectedIntegration?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedIntegration?.description}
            </p>
            
            {selectedIntegration?.type === 'github' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">GitHub Token</label>
                  <Input
                    placeholder="ghp_..."
                    type="password"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Repository</label>
                  <Input
                    placeholder="owner/repository"
                  />
                </div>
              </div>
            )}

            {selectedIntegration?.type === 'slack' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Slack Webhook URL</label>
                  <Input
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Channel</label>
                  <Input
                    placeholder="#general"
                  />
                </div>
              </div>
            )}

            {selectedIntegration?.type === 'webhook' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Webhook URL</label>
                  <Input
                    placeholder="https://your-service.com/webhook"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Secret</label>
                  <Input
                    placeholder="Optional webhook secret"
                    type="password"
                  />
                </div>
              </div>
            )}

            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                This integration is currently in development. Configuration options
                will be available in a future update.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancel
            </Button>
            <Button disabled>
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}