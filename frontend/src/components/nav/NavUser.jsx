"use client"

import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
  Loader2,
} from "lucide-react"
import { Link } from "react-router-dom"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext";
import { getAvatarURL } from "@/utils/urlUtils";

export function NavUser() {
  const { isMobile } = useSidebar()
  const auth = useAuth();
  const { logout, userData } = auth || {};
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutTimeoutRef = useRef(null);
  
  // Ensure avatar URL is normalized (HTTPS, no localhost)
  const normalizedAvatar = userData?.avatar ? getAvatarURL(userData.avatar) : '';

  // Handle logout after loading state is set
  useEffect(() => {
    if (isLoggingOut && logoutTimeoutRef.current === null) {
      logoutTimeoutRef.current = setTimeout(async () => {
        try {
          await logout();
        } catch (error) {
          console.error('Logout error:', error);
          setIsLoggingOut(false);
          setShowLogoutDialog(false);
        } finally {
          logoutTimeoutRef.current = null;
        }
      }, 1000); // Wait 1 second to show loading state
    }

    return () => {
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
        logoutTimeoutRef.current = null;
      }
    };
  }, [isLoggingOut, logout]);

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = (e) => {
    // Prevent default to ensure we control the flow
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Set loading state - useEffect will handle the actual logout
    setIsLoggingOut(true);
  };

  const handleLogoutCancel = () => {
    setShowLogoutDialog(false);
  };
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg" key={normalizedAvatar || 'default'}>
                <AvatarImage key={`nav-${normalizedAvatar || 'default-img'}`} src={normalizedAvatar} alt={userData.email} />
                <AvatarFallback className="rounded-lg font-bold">{userData.email.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{userData.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg" key={normalizedAvatar || 'default'}>
                  <AvatarImage key={`dropdown-${normalizedAvatar || 'default-img'}`} src={normalizedAvatar} alt={userData.email} />
                  <AvatarFallback className="rounded-lg font-bold">{userData.email.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{userData.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/account" className="flex items-center gap-2">
                  <BadgeCheck />
                  Account
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogoutClick}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      {/* Logout Confirmation Dialog */}
      <AlertDialog 
        open={showLogoutDialog} 
        onOpenChange={(open) => {
          // Prevent closing dialog while logging out
          if (!isLoggingOut) {
            setShowLogoutDialog(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Do you really want to logout?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of your account and redirected to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleLogoutCancel} disabled={isLoggingOut}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isLoggingOut) {
                  handleLogoutConfirm(e);
                }
              }}
              disabled={isLoggingOut}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-white"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Logging out...
                </>
              ) : (
                'Logout'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarMenu>
  )
}
