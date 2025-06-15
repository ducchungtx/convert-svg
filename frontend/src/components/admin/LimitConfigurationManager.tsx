'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Save, RotateCcw, Settings, Users, Crown, Building } from 'lucide-react';

interface LimitConfiguration {
  id: number;
  subscriptionType: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  userType: 'USER' | 'GUEST';
  maxFilesPerConversion: number;
  maxFileSize: number;
  maxDailyConversions: number;
  maxMonthlyConversions: number | null;
  allowedFormats: string[];
  maxConcurrentJobs: number;
  priorityLevel: number;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const SUBSCRIPTION_TYPES = [
  { value: 'FREE', label: 'Free', icon: Users, color: 'bg-gray-100 text-gray-800' },
  { value: 'BASIC', label: 'Basic', icon: Users, color: 'bg-blue-100 text-blue-800' },
  { value: 'PREMIUM', label: 'Premium', icon: Crown, color: 'bg-purple-100 text-purple-800' },
  { value: 'ENTERPRISE', label: 'Enterprise', icon: Building, color: 'bg-green-100 text-green-800' }
];

const USER_TYPES = [
  { value: 'GUEST', label: 'Guest Users', color: 'bg-orange-100 text-orange-800' },
  { value: 'USER', label: 'Registered Users', color: 'bg-blue-100 text-blue-800' }
];

const AVAILABLE_FORMATS = [
  'png', 'jpg', 'jpeg', 'pdf', 'svg', 'webp', 'ico', 'bmp', 'tiff', 'eps', 'ai'
];

export default function LimitConfigurationManager() {
  const [configurations, setConfigurations] = useState<LimitConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<LimitConfiguration | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    try {
      const response = await fetch('/api/admin/limit-configs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConfigurations(data.data.configurations);
      } else {
        toast.error('Failed to fetch configurations');
      }
    } catch (error) {
      console.error('Error fetching configurations:', error);
      toast.error('Failed to fetch configurations');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultConfigs = async () => {
    setIsInitializing(true);
    try {
      const response = await fetch('/api/admin/limit-configs/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Default configurations initialized successfully');
        await fetchConfigurations();
      } else {
        toast.error('Failed to initialize configurations');
      }
    } catch (error) {
      console.error('Error initializing configurations:', error);
      toast.error('Failed to initialize configurations');
    } finally {
      setIsInitializing(false);
    }
  };

  const updateConfiguration = async (config: LimitConfiguration) => {
    const saveKey = `${config.subscriptionType}-${config.userType}`;
    setSaving(saveKey);

    try {
      const response = await fetch(
        `/api/admin/limit-configs/${config.subscriptionType}/${config.userType}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            maxFilesPerConversion: config.maxFilesPerConversion,
            maxFileSize: config.maxFileSize,
            maxDailyConversions: config.maxDailyConversions,
            maxMonthlyConversions: config.maxMonthlyConversions,
            allowedFormats: config.allowedFormats,
            maxConcurrentJobs: config.maxConcurrentJobs,
            priorityLevel: config.priorityLevel,
            rateLimitPerMinute: config.rateLimitPerMinute,
            rateLimitPerHour: config.rateLimitPerHour,
            isActive: config.isActive
          })
        }
      );

      if (response.ok) {
        toast.success('Configuration updated successfully');
        await fetchConfigurations();
        setEditingConfig(null);
      } else {
        toast.error('Failed to update configuration');
      }
    } catch (error) {
      console.error('Error updating configuration:', error);
      toast.error('Failed to update configuration');
    } finally {
      setSaving(null);
    }
  };

  const handleEditConfig = (config: LimitConfiguration) => {
    setEditingConfig({ ...config });
  };

  const handleSaveConfig = () => {
    if (editingConfig) {
      updateConfiguration(editingConfig);
    }
  };

  const formatFileSize = (bytes: number) => {
    return Math.round(bytes / 1024 / 1024) + ' MB';
  };

  const getSubscriptionIcon = (type: string) => {
    const sub = SUBSCRIPTION_TYPES.find(s => s.value === type);
    return sub ? sub.icon : Users;
  };

  const getSubscriptionColor = (type: string) => {
    const sub = SUBSCRIPTION_TYPES.find(s => s.value === type);
    return sub ? sub.color : 'bg-gray-100 text-gray-800';
  };

  const getUserTypeColor = (type: string) => {
    const userType = USER_TYPES.find(u => u.value === type);
    return userType ? userType.color : 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Limit Configuration Management</h2>
          <p className="text-gray-600">Manage conversion limits for different user types and subscription plans</p>
        </div>
        <Button
          onClick={initializeDefaultConfigs}
          disabled={isInitializing}
          variant="outline"
        >
          {isInitializing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RotateCcw className="h-4 w-4 mr-2" />
          )}
          Initialize Defaults
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {configurations.map((config) => {
          const Icon = getSubscriptionIcon(config.subscriptionType);
          const isEditing = editingConfig?.id === config.id;
          const isSaving = saving === `${config.subscriptionType}-${config.userType}`;

          return (
            <Card key={config.id} className={`${isEditing ? 'ring-2 ring-blue-500' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5" />
                    <CardTitle className="text-lg">{config.subscriptionType}</CardTitle>
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={getSubscriptionColor(config.subscriptionType)}>
                      {config.subscriptionType}
                    </Badge>
                    <Badge className={getUserTypeColor(config.userType)}>
                      {config.userType}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Max Files</Label>
                        <Input
                          type="number"
                          value={editingConfig.maxFilesPerConversion}
                          onChange={(e) => setEditingConfig({
                            ...editingConfig,
                            maxFilesPerConversion: parseInt(e.target.value) || 1
                          })}
                          min="1"
                          max="100"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">File Size (MB)</Label>
                        <Input
                          type="number"
                          value={Math.round(editingConfig.maxFileSize / 1024 / 1024)}
                          onChange={(e) => setEditingConfig({
                            ...editingConfig,
                            maxFileSize: (parseInt(e.target.value) || 1) * 1024 * 1024
                          })}
                          min="1"
                          max="1000"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Daily Limit</Label>
                        <Input
                          type="number"
                          value={editingConfig.maxDailyConversions}
                          onChange={(e) => setEditingConfig({
                            ...editingConfig,
                            maxDailyConversions: parseInt(e.target.value) || 1
                          })}
                          min="1"
                          max="10000"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Monthly Limit</Label>
                        <Input
                          type="number"
                          value={editingConfig.maxMonthlyConversions || ''}
                          onChange={(e) => setEditingConfig({
                            ...editingConfig,
                            maxMonthlyConversions: e.target.value ? parseInt(e.target.value) : null
                          })}
                          placeholder="Unlimited"
                          min="1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Allowed Formats</Label>
                      <Select
                        value={editingConfig.allowedFormats.join(',')}
                        onValueChange={(value) => setEditingConfig({
                          ...editingConfig,
                          allowedFormats: value.split(',').filter(Boolean)
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select formats" />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_FORMATS.map(format => (
                            <SelectItem key={format} value={format}>
                              {format.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Concurrent Jobs</Label>
                        <Input
                          type="number"
                          value={editingConfig.maxConcurrentJobs}
                          onChange={(e) => setEditingConfig({
                            ...editingConfig,
                            maxConcurrentJobs: parseInt(e.target.value) || 1
                          })}
                          min="1"
                          max="50"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Priority Level</Label>
                        <Input
                          type="number"
                          value={editingConfig.priorityLevel}
                          onChange={(e) => setEditingConfig({
                            ...editingConfig,
                            priorityLevel: parseInt(e.target.value) || 0
                          })}
                          min="0"
                          max="10"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingConfig.isActive}
                        onCheckedChange={(checked) => setEditingConfig({
                          ...editingConfig,
                          isActive: checked
                        })}
                      />
                      <Label className="text-xs">Active</Label>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={handleSaveConfig}
                        disabled={isSaving}
                        size="sm"
                        className="flex-1"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save
                      </Button>
                      <Button
                        onClick={() => setEditingConfig(null)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Max Files:</span>
                        <span className="font-medium ml-1">{config.maxFilesPerConversion}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">File Size:</span>
                        <span className="font-medium ml-1">{formatFileSize(config.maxFileSize)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Daily:</span>
                        <span className="font-medium ml-1">{config.maxDailyConversions}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Monthly:</span>
                        <span className="font-medium ml-1">
                          {config.maxMonthlyConversions || 'Unlimited'}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    <div className="text-sm">
                      <span className="text-gray-500">Formats:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {config.allowedFormats.map(format => (
                          <Badge key={format} variant="secondary" className="text-xs">
                            {format.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Jobs:</span>
                        <span className="font-medium ml-1">{config.maxConcurrentJobs}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Priority:</span>
                        <span className="font-medium ml-1">{config.priorityLevel}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant={config.isActive ? "default" : "secondary"}>
                        {config.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        onClick={() => handleEditConfig(config)}
                        variant="outline"
                        size="sm"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
