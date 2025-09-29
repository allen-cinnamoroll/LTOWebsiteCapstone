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
    switch (path) {
      case '/':
        return 'Overview';
      case '/driver':
        return 'Drivers';
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
      case '/account/register':
        return 'Register Account';
      case '/account/update':
        return 'Update Account';
      case '/account/logs':
        return 'Account Logs';
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
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/">
                      Dashboard
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="px-4 md:px-8">
              <ModeToggle />
            </div>
          </header>
          <main className="md:p-4 ">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
};

export default DashboardLayout;
