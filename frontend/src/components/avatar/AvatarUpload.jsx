import React, { useState, useRef } from 'react';
import { Camera, Loader2, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/api/axios';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const AvatarUpload = ({ size = 'md', showControls = true, onUploadSuccess }) => {
  const { userData, setUserData } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Size configurations
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  // Get avatar URL with cache busting
  const getAvatarUrl = () => {
    if (previewUrl) return previewUrl;
    if (!userData?.avatar) return null;
    
    const baseURL = import.meta.env.VITE_BASE_URL || 'https://ltodatamanager.com/api';
    const backendURL = baseURL.replace('/api', '');
    
    // Check if already a full URL
    if (userData.avatar.startsWith('http')) {
      return userData.avatar;
    }
    
    return `${backendURL}/${userData.avatar}`;
  };

  // Get user initials for fallback
  const getUserInitials = () => {
    if (userData?.firstName) {
      return userData.firstName.charAt(0).toUpperCase();
    }
    if (userData?.email) {
      return userData.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Handle file selection
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Please select a JPEG, PNG, GIF, or WebP image.',
      });
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large', {
        description: 'Please select an image smaller than 5MB.',
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload immediately
    await uploadAvatar(file);
  };

  // Upload avatar to server
  const uploadAvatar = async (file) => {
    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append('avatar', file);

      const response = await apiClient.post('/avatar/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        const baseURL = import.meta.env.VITE_BASE_URL || 'https://ltodatamanager.com/api';
        const backendURL = baseURL.replace('/api', '');
        const avatarURL = `${backendURL}/${response.data.avatar}?t=${Date.now()}`;

        // Update user data with new avatar
        const updatedUserData = {
          ...userData,
          avatar: avatarURL,
        };

        setUserData(updatedUserData);
        localStorage.setItem('userData', JSON.stringify(updatedUserData));

        // Clear preview
        setPreviewUrl(null);

        toast.success('Avatar updated!', {
          description: 'Your profile picture has been updated successfully.',
        });

        // Callback if provided
        if (onUploadSuccess) {
          onUploadSuccess(avatarURL);
        }
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      setPreviewUrl(null);
      
      const errorMessage =
        error.response?.data?.message || 'Failed to upload avatar. Please try again.';
      toast.error('Upload failed', { description: errorMessage });
    } finally {
      setIsUploading(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle delete avatar
  const handleDeleteAvatar = async () => {
    try {
      setIsUploading(true);

      const response = await apiClient.delete('/avatar/delete');

      if (response.data.success) {
        // Update user data to remove avatar
        const updatedUserData = {
          ...userData,
          avatar: '',
        };

        setUserData(updatedUserData);
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        setPreviewUrl(null);

        toast.success('Avatar removed', {
          description: 'Your profile picture has been removed.',
        });
      }
    } catch (error) {
      console.error('Avatar delete error:', error);
      const errorMessage =
        error.response?.data?.message || 'Failed to remove avatar. Please try again.';
      toast.error('Delete failed', { description: errorMessage });
    } finally {
      setIsUploading(false);
    }
  };

  const avatarUrl = getAvatarUrl();

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar Display */}
      <div className="relative">
        <div
          className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20 flex items-center justify-center relative`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Failed to load avatar:', e.target.src);
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : null}
          
          {/* Fallback initials */}
          <div
            className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-primary"
            style={{ display: avatarUrl ? 'none' : 'flex' }}
          >
            {getUserInitials()}
          </div>

          {/* Loading overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className={`${iconSizes[size]} animate-spin text-white`} />
            </div>
          )}
        </div>

        {/* Upload button overlay */}
        {showControls && !isUploading && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-2 shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            title="Upload new avatar"
          >
            <Camera className="w-4 h-4" />
          </button>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {/* Delete button */}
      {showControls && avatarUrl && !isUploading && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteAvatar}
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Remove Avatar
        </Button>
      )}

      {/* Info text */}
      {showControls && (
        <p className="text-xs text-muted-foreground text-center max-w-[200px]">
          Click the camera icon to upload a new photo (max 5MB)
        </p>
      )}
    </div>
  );
};

export default AvatarUpload;

