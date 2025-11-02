import React from 'react';
import { useAuth } from '@/context/AuthContext';

const Avatar = ({ size = 'md', className = '', user = null }) => {
  const { userData: contextUserData } = useAuth();
  const userData = user || contextUserData;

  // Size configurations
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl'
  };

  // Get avatar URL
  const getAvatarUrl = () => {
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
      const firstInitial = userData.firstName.charAt(0).toUpperCase();
      const lastInitial = userData.lastName ? userData.lastName.charAt(0).toUpperCase() : '';
      return firstInitial + lastInitial;
    }
    if (userData?.email) {
      return userData.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const avatarUrl = getAvatarUrl();
  const initials = getUserInitials();

  return (
    <div
      className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center relative ${className}`}
    >
      {avatarUrl ? (
        <img
          key={avatarUrl}
          src={avatarUrl}
          alt={userData?.email || 'User'}
          className="w-full h-full object-cover"
          onError={(e) => {
            console.error('Failed to load avatar:', e.target.src);
            e.target.style.display = 'none';
            if (e.target.nextElementSibling) {
              e.target.nextElementSibling.style.display = 'flex';
            }
          }}
        />
      ) : null}
      
      {/* Fallback initials */}
      <div
        className="absolute inset-0 flex items-center justify-center font-bold text-primary"
        style={{ display: avatarUrl ? 'none' : 'flex' }}
      >
        {initials}
      </div>
    </div>
  );
};

export default Avatar;

