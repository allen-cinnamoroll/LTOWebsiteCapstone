import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Clock,
  Edit,
  Camera,
  Save,
  X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const AccountPage = () => {
  const { userData } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    avatar: ''
  });
  const [previewAvatar, setPreviewAvatar] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    // Initialize edit data with current user data
    if (userData) {
      setEditData({
        firstName: userData.firstName || '',
        middleName: userData.middleName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        avatar: userData.avatar || ''
      });
      setPreviewAvatar(userData.avatar || '');
    }
  }, [userData]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      firstName: userData?.firstName || '',
      middleName: userData?.middleName || '',
      lastName: userData?.lastName || '',
      email: userData?.email || '',
      avatar: userData?.avatar || ''
    });
    setPreviewAvatar(userData?.avatar || '');
  };

  const handleSave = () => {
    // Here you would typically make an API call to update the user data
    console.log('Saving user data:', editData);
    // For now, we'll just simulate saving
    setIsEditing(false);
    // You could update the userData in context here
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewAvatar(e.target.result);
        setEditData(prev => ({
          ...prev,
          avatar: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarClick = () => {
    if (isEditing) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account</h1>
          <p className="text-muted-foreground">
            Manage your account information and settings
          </p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={handleEdit} variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
              <Button onClick={handleCancel} variant="outline" className="gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-1">
        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Your personal account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar and Basic Info */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={previewAvatar || userData?.avatar} alt={editData.email || userData?.email} />
                  <AvatarFallback className="text-lg font-bold">
                    {(editData.firstName || userData?.firstName || editData.email || userData?.email)?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
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
                )}
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={editData.firstName}
                          onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                          placeholder="Enter first name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="middleName">Middle Name</Label>
                        <Input
                          id="middleName"
                          value={editData.middleName}
                          onChange={(e) => setEditData(prev => ({ ...prev, middleName: e.target.value }))}
                          placeholder="Enter middle name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={editData.lastName}
                          onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))}
                          placeholder="Enter last name"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={editData.email}
                        onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {userData?.role === '1' ? 'Admin' : 
                       userData?.role === '2' ? 'Employee' : 
                       userData?.role === '0' ? 'Super Admin' :
                       userData?.role || 'Employee'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold">
                      {userData?.firstName && userData?.lastName 
                        ? `${userData.firstName}${userData.middleName ? ` ${userData.middleName}` : ''} ${userData.lastName}`.trim()
                        : userData?.email || 'User'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {userData?.role === '1' ? 'Admin' : 
                       userData?.role === '2' ? 'Employee' : 
                       userData?.role === '0' ? 'Super Admin' :
                       userData?.role || 'Employee'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Account Details */}
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Full Name</p>
                      <p className="text-sm text-muted-foreground">
                        {`${editData.firstName || ''} ${editData.middleName || ''} ${editData.lastName || ''}`.trim() || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">
                        {editData.email || userData?.email || 'N/A'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Full Name</p>
                      <p className="text-sm text-muted-foreground">
                        {userData?.firstName && userData?.lastName 
                          ? `${userData.firstName}${userData.middleName ? ` ${userData.middleName}` : ''} ${userData.lastName}`.trim()
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
                </>
              )}

              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Role</p>
                  <Badge variant="secondary" className="mt-1">
                    {userData?.role === '1' ? 'Admin' : 
                     userData?.role === '2' ? 'Employee' : 
                     userData?.role === '0' ? 'Super Admin' :
                     userData?.role || 'Employee'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Account Created</p>
                  <p className="text-sm text-muted-foreground">
                    {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 
                     userData?.dateCreated ? new Date(userData.dateCreated).toLocaleDateString() :
                     new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Last Login</p>
                  <p className="text-sm text-muted-foreground">
                    {userData?.lastLogin ? new Date(userData.lastLogin).toLocaleString() : 
                     userData?.lastLoginDate ? new Date(userData.lastLoginDate).toLocaleString() :
                     'Currently Active'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* System Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            Your account status and system details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Account Status</p>
              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Active
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Permissions</p>
              <p className="text-sm text-muted-foreground">
                {userData?.role === '0' || userData?.role === 'superadmin' ? 'Full Access' : 
                 userData?.role === '1' || userData?.role === 'admin' ? 'Administrative Access' : 
                 'Standard Access'}
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
  );
};

export default AccountPage;
