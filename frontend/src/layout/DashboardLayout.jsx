"use client";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import React from "react";
import Header from "../components/nav/Header";
import { AppSidebar } from "@/components/nav/AppSidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { ModeToggle } from "@/components/theme/mode-toggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Function to get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    
    // Handle dynamic routes with patterns
    if (path.includes('/driver/') && path.includes('/edit')) {
      return 'Edit Owner';
    }
    if (path.includes('/vehicle/') && path.includes('/edit')) {
      return 'Edit Vehicle';
    }
    if (path.includes('/violation/') && path.includes('/edit')) {
      return 'Edit Violation';
    }
    if (path.includes('/accident/') && path.includes('/edit')) {
      return 'Edit Accident';
    }
    
    // Handle driver profile pages (e.g., /driver/123) - return null to hide breadcrumb
    if (path.match(/^\/driver\/[a-zA-Z0-9]+$/)) {
      return null;
    }
    
    switch (path) {
      case '/':
        return 'Overview';
      case '/driver':
        return 'Owners';
      case '/vehicle':
        return 'Vehicles';
      case '/violation':
        return 'Violations';
      case '/accident':
        return 'Accidents';
      case '/analytics/registration':
        return 'Registration Analytics';
      case '/analytics/violation':
        return 'Violation Analytics';
      case '/analytics/accident':
        return 'Accident Analytics';
      case '/account':
        return 'Account';
      case '/account/register':
        return 'Register Account';
      case '/account/update':
        return 'Update Account';
      case '/account/logs':
        return 'Account Logs';
      case '/trained-models/vehicle/mv-prediction':
        return 'MV Prediction Model';
      default:
        return 'Overview';
    }
  };
  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex justify-between border-b h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-white dark:bg-black border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              {getPageTitle() && (
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="/dashboard">
                        Dashboard
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              )}
            </div>
            <div className="px-4 md:px-8">
              <ModeToggle />
            </div>
          </header>
          <main className="md:p-4 h-full flex flex-col overflow-hidden">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
};

export default DashboardLayout;
