import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Camera,
  Save,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/axios';
import { toast } from 'sonner';

const AccountPage = () => {
  const { userData, setUserData } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    avatar: '',
  });
  const [previewAvatar, setPreviewAvatar] = useState('');
  const fileInputRef = useRef(null);

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
        avatar: userData.avatar || '',
      });
      setPreviewAvatar(userData.avatar || '');
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
      avatar: userData?.avatar || '',
    });
    setPreviewAvatar(userData?.avatar || '');
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const formData = new FormData();
      formData.append('firstName', editData.firstName);
      formData.append('middleName', editData.middleName);
      formData.append('lastName', editData.lastName);
      formData.append('email', editData.email);

      if (
        previewAvatar &&
        previewAvatar !== userData?.avatar &&
        previewAvatar.startsWith('data:')
      ) {
        const response = await fetch(previewAvatar);
        const blob = await response.blob();
        const file = new File([blob], 'avatar.jpg', { type: blob.type });
        formData.append('avatar', file);
      }

      const response = await apiClient.put('/account/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        const baseURL = import.meta.env.VITE_BASE_URL || 'http://72.60.198.244:5000/api';
        const backendURL = baseURL.replace('/api', '');

        setUserData(prev => ({
          ...prev,
          ...response.data.user,
          avatar: response.data.user.avatar
            ? `${backendURL}/${response.data.user.avatar}`
            : prev.avatar,
        }));

        const updatedUserData = {
          ...response.data.user,
          avatar: response.data.user.avatar
            ? `${backendURL}/${response.data.user.avatar}`
            : '',
        };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));

        setIsEditModalOpen(false);
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

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)', {
          description: new Date().toLocaleString(),
        });
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('File size must be less than 5MB', {
          description: new Date().toLocaleString(),
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewAvatar(e.target.result);
        setEditData(prev => ({ ...prev, avatar: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarClick = () => {
    if (isEditModalOpen) {
      fileInputRef.current?.click();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white dark:bg-black overflow-hidden">
      <div className="container mx-auto px-6 py-3 h-full flex flex-col">
        <div className="max-w-7xl mx-auto w-full h-full flex flex-col space-y-3">
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
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-14 w-14">
                      <AvatarImage
                        src={
                          userData?.avatar?.startsWith('http')
                            ? userData.avatar
                            : (() => {
                                const baseURL =
                                  import.meta.env.VITE_BASE_URL || 'http://72.60.198.244:5000/api';
                                const backendURL = baseURL.replace('/api', '');
                                return userData?.avatar ? `${backendURL}/${userData.avatar}` : '';
                              })()
                        }
                        alt={userData?.email}
                      />
                      <AvatarFallback className="text-lg font-bold">
                        {(userData?.firstName || userData?.email)?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
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
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Account Created</p>
                      <p className="text-sm text-muted-foreground">
                        {userData?.createdAt
                          ? new Date(userData.createdAt).toLocaleDateString()
                          : userData?.dateCreated
                          ? new Date(userData.dateCreated).toLocaleDateString()
                          : new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Last Login</p>
                      <p className="text-sm text-muted-foreground">
                        {userData?.lastLogin
                          ? new Date(userData.lastLogin).toLocaleString()
                          : userData?.lastLoginDate
                          ? new Date(userData.lastLoginDate).toLocaleString()
                          : 'Currently Active'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Info */}
            <Card className="flex-shrink-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">System Information</CardTitle>
                <CardDescription>Your account status and system details</CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Account Status</p>
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    >
                      Active
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Permissions</p>
                    <p className="text-sm text-muted-foreground">
                      {userData?.role === '0' || userData?.role === 'superadmin'
                        ? 'Full Access'
                        : userData?.role === '1' || userData?.role === 'admin'
                        ? 'Administrative Access'
                        : 'Standard Access'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Session</p>
                    <p className="text-sm text-muted-foreground">
                      {userData?.sessionId ? 'Active Session' : 'No Active Session'}
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
                  Update your account information and profile picture
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage
                        src={
                          previewAvatar ||
                          (userData?.avatar?.startsWith('http')
                            ? userData.avatar
                            : (() => {
                                const baseURL =
                                  import.meta.env.VITE_BASE_URL || 'http://72.60.198.244:5000/api';
                                const backendURL = baseURL.replace('/api', '');
                                return userData?.avatar ? `${backendURL}/${userData.avatar}` : '';
                              })())
                        }
                        alt={editData.email || userData?.email}
                      />
                      <AvatarFallback className="text-lg font-bold">
                        {(editData.firstName ||
                          userData?.firstName ||
                          editData.email ||
                          userData?.email)
                          ?.charAt(0)
                          ?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 rounded-full p-0"
                        onClick={handleAvatarClick}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Profile Picture</p>
                    <p className="text-xs text-muted-foreground">
                      Click the camera icon to change
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="modalFirstName">First Name</Label>
                      <Input
                        id="modalFirstName"
                        value={editData.firstName}
                        onChange={(e) =>
                          setEditData((prev) => ({ ...prev, firstName: e.target.value }))
                        }
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="modalMiddleName">Middle Name</Label>
                      <Input
                        id="modalMiddleName"
                        value={editData.middleName}
                        onChange={(e) =>
                          setEditData((prev) => ({ ...prev, middleName: e.target.value }))
                        }
                        placeholder="Enter middle name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="modalLastName">Last Name</Label>
                      <Input
                        id="modalLastName"
                        value={editData.lastName}
                        onChange={(e) =>
                          setEditData((prev) => ({ ...prev, lastName: e.target.value }))
                        }
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="modalEmail">Email</Label>
                    <Input
                      id="modalEmail"
                      type="email"
                      value={editData.email}
                      onChange={(e) =>
                        setEditData((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleSave}
                    className="gap-2"
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="gap-2"
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
