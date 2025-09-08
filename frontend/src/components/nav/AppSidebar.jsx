"use client";
import logo from "@/assets/lto.svg";
import React, { useState } from "react";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Car,
  Circle,
  Command,
  Dot,
  Frame,
  GalleryVerticalEnd,
  List,
  Map,
  PieChart,
  PlaySquare,
  Plus,
  Settings2,
  SquareActivity,
  SquareChartGantt,
  SquareTerminal,
  TriangleAlert,
  User,
  Users,
  UserPlus,
  Edit,
  FileText,
  ChevronRight,
} from "lucide-react";

import { NavMain } from "@/components/nav/NavMain";
// import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav/NavUser";
// import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Playground",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        { title: "History", url: "#" },
        { title: "Starred", url: "#" },
        { title: "Settings", url: "#" },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        { title: "Genesis", url: "#" },
        { title: "Explorer", url: "#" },
        { title: "Quantum", url: "#" },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        { title: "Introduction", url: "#" },
        { title: "Get Started", url: "#" },
        { title: "Tutorials", url: "#" },
        { title: "Changelog", url: "#" },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        { title: "General", url: "#" },
        { title: "Team", url: "#" },
        { title: "Billing", url: "#" },
        { title: "Limits", url: "#" },
      ],
    },
  ],
};

export function AppSidebar(props) {
  const location = useLocation();
  const { userData } = useAuth();
  
  // State for managing collapsible sections
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isManageAccountOpen, setIsManageAccountOpen] = useState(false);
  
  // Handle dropdown state changes - close one when opening another
  const handleAnalyticsChange = (open) => {
    setIsAnalyticsOpen(open);
    if (open) {
      setIsManageAccountOpen(false);
    }
  };
  
  const handleManageAccountChange = (open) => {
    setIsManageAccountOpen(open);
    if (open) {
      setIsAnalyticsOpen(false);
    }
  };
  
  // Check user roles for different permissions
  const canManageAccounts = userData?.role === "0" || userData?.role === "1"; // Admin and superadmin
  const userRole = userData?.role;
  
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                <img src={logo} className="" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {"LTO WebSystem"}
                </span>
                <span className="truncate text-xs">
                  {"Land Transportation Office"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu className="">
            {/* Dashboard - accessible to all authenticated users */}
            <SidebarMenuItem >
              <SidebarMenuButton isActive={location.pathname === "/"} asChild>
                <Link to="/">
                  <SquareTerminal />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            {/* Management sections - accessible to all authenticated users */}
            <SidebarMenuItem>
              <SidebarMenuButton isActive={location.pathname === "/vehicle"} asChild>
                <Link to="/vehicle">
                  <Car />
                  <span>Manage Vehicles</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={location.pathname === "/driver"} asChild>
                <Link to="/driver">
                  <Users />
                  <span>Manage Drivers</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={location.pathname === "/violation"} asChild>
                <Link to="/violation">
                  <SquareChartGantt />
                  <span>Manage Violations</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={location.pathname === "/accident"} asChild>
                <Link to="/accident">
                  <SquareActivity />
                  <span>Manage Accidents</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Analytics</SidebarGroupLabel>
          <SidebarMenu>
            <Collapsible asChild className="group/collapsible" open={isAnalyticsOpen} onOpenChange={handleAnalyticsChange}>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="Analytics">
                    <PieChart />
                    <span>Analytics</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={location.pathname === "/analytics/registration"} asChild>
                        <Link to="/analytics/registration">
                          <BookOpen />
                          <span>Registration</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={location.pathname === "/analytics/violation"} asChild>
                        <Link to="/analytics/violation">
                          <SquareChartGantt />
                          <span>Violation</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={location.pathname === "/analytics/accident"} asChild>
                        <Link to="/analytics/accident">
                          <SquareActivity />
                          <span>Accident</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>

        {/* Manage Account Section - Only visible for Admin and Superadmin */}
        {canManageAccounts && (
          <SidebarGroup>
            <SidebarGroupLabel>Account Management</SidebarGroupLabel>
            <SidebarMenu>
              <Collapsible asChild className="group/collapsible" open={isManageAccountOpen} onOpenChange={handleManageAccountChange}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Manage Account">
                      <User />
                      <span>Manage Account</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={location.pathname === "/account/register"} asChild>
                        <Link to="/account/register">
                          <UserPlus />
                          <span>Register Account</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={location.pathname === "/account/update"} asChild>
                        <Link to="/account/update">
                          <Edit />
                          <span>Update Account</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={location.pathname === "/account/logs"} asChild>
                        <Link to="/account/logs">
                          <FileText />
                          <span>View Account Logs</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
