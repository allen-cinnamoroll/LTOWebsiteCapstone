import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  User,
  Mail,
  Shield,
  Calendar,
  Clock,
  Edit,
  Save,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/axios';
import { toast } from 'sonner';
import AvatarUpload from '@/components/avatar/AvatarUpload';
import Avatar from '@/components/avatar/Avatar';

const AccountPage = () => {
  const { userData } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
  });

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
    }, 500);

    // Initialize edit data
    if (userData) {
      setEditData({
        firstName: userData.firstName || '',
        middleName: userData.middleName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
      });
    }
  }, [userData]);

  const handleEdit = () => setIsEditModalOpen(true);

  const handleCancel = () => {
    setIsEditModalOpen(false);
    setEditData({
      firstName: userData?.firstName || '',
      middleName: userData?.middleName || '',
      lastName: userData?.lastName || '',
      email: userData?.email || '',
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const response = await apiClient.put('/account/profile', {
        firstName: editData.firstName,
        middleName: editData.middleName,
        lastName: editData.lastName,
        email: editData.email,
      });

      if (response.data.success) {
        // Note: Avatar is NOT updated here anymore - it has its own endpoint
        // Just update the profile fields
        const updatedUserData = {
          ...userData,
          firstName: editData.firstName,
          middleName: editData.middleName,
          lastName: editData.lastName,
          email: editData.email,
        };

        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        
        // Force page reload to refresh all user data
        window.location.reload();
        
        toast.success('Profile updated successfully!', {
          description: new Date().toLocaleString(),
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage =
        error.response?.data?.message || 'Failed to update profile. Please try again.';
      toast.error(errorMessage, { description: new Date().toLocaleString() });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Account</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account information and settings
          </p>
        </div>
        <Button onClick={handleEdit} variant="outline" className="gap-2">
          <Edit className="h-4 w-4" /> Edit Profile
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid gap-4 md:grid-cols-1 flex-1 min-h-0">
        {/* Profile Card */}
        <Card className="flex-shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" /> Profile Information
            </CardTitle>
            <CardDescription>Your personal account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-4">
            <div className="flex items-start gap-4">
              {/* Avatar Upload Component */}
              <AvatarUpload size="lg" showControls={true} />
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {userData?.firstName && userData?.lastName
                    ? `${userData.firstName}${
                        userData.middleName ? ` ${userData.middleName}` : ''
                      } ${userData.lastName}`.trim()
                    : userData?.email || 'User'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {userData?.role === '1'
                    ? 'Admin'
                    : userData?.role === '2'
                    ? 'Employee'
                    : userData?.role === '0'
                    ? 'Super Admin'
                    : userData?.role || 'Employee'}
                </p>
              </div>
            </div>

            <Separator />
            {/* Account Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Full Name</p>
                  <p className="text-sm text-muted-foreground">
                    {userData?.firstName && userData?.lastName
                      ? `${userData.firstName}${
                          userData.middleName ? ` ${userData.middleName}` : ''
                        } ${userData.lastName}`.trim()
                      : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {userData?.email || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Role</p>
                  <Badge variant="secondary" className="mt-1">
                    {userData?.role === '1'
                      ? 'Admin'
                      : userData?.role === '2'
                      ? 'Employee'
                      : userData?.role === '0'
                      ? 'Super Admin'
                      : userData?.role || 'Employee'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Activity Card */}
        <Card className="flex-shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" /> Account Activity
            </CardTitle>
            <CardDescription>Recent account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Account Created</p>
                <p className="text-sm text-muted-foreground">
                  {userData?.createdAt
                    ? new Date(userData.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Last Updated</p>
                <p className="text-sm text-muted-foreground">
                  {userData?.updatedAt
                    ? new Date(userData.updatedAt).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Edit className="h-6 w-6" />
              <DialogTitle>Edit Profile</DialogTitle>
            </div>
            <DialogDescription>
              Update your account information (Avatar can be changed directly on the profile)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={editData.firstName}
                  onChange={(e) =>
                    setEditData({ ...editData, firstName: e.target.value })
                  }
                  placeholder="Enter your first name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  value={editData.middleName}
                  onChange={(e) =>
                    setEditData({ ...editData, middleName: e.target.value })
                  }
                  placeholder="Enter your middle name (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={editData.lastName}
                  onChange={(e) =>
                    setEditData({ ...editData, lastName: e.target.value })
                  }
                  placeholder="Enter your last name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={editData.email}
                  onChange={(e) =>
                    setEditData({ ...editData, email: e.target.value })
                  }
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountPage;
