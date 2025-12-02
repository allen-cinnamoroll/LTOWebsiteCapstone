"use client";
import logo from "@/assets/lto_logo.png";
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
  Brain,
  TrendingUp,
  ClipboardCheck,
  Archive,
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
  useSidebar,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const auth = useAuth();
  const { userData } = auth || {};
  const { state } = useSidebar();
  
  // State for managing collapsible sections
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isTrainedModelsOpen, setIsTrainedModelsOpen] = useState(false);
  const [isManageAccountOpen, setIsManageAccountOpen] = useState(false);
  
  // Check if sidebar is collapsed
  const isCollapsed = state === "collapsed";
  
  // Handle dropdown state changes - close one when opening another
  const handleAnalyticsChange = (open) => {
    setIsAnalyticsOpen(open);
    if (open) {
      setIsTrainedModelsOpen(false);
      setIsManageAccountOpen(false);
    }
  };
  
  const handleTrainedModelsChange = (open) => {
    setIsTrainedModelsOpen(open);
    if (open) {
      setIsAnalyticsOpen(false);
      setIsManageAccountOpen(false);
    }
  };
  
  const handleManageAccountChange = (open) => {
    setIsManageAccountOpen(open);
    if (open) {
      setIsAnalyticsOpen(false);
      setIsTrainedModelsOpen(false);
    }
  };
  
  // Check user roles for different permissions
  const canManageAccounts = userData?.role === "0" || userData?.role === "1"; // Admin and superadmin
  const isSuperAdmin = userData?.role === "0"; // Superadmin only
  const userRole = userData?.role;
  
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="LTO WebSystem" className="group-data-[collapsible=icon]:justify-center">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground group-data-[collapsible=icon]:size-6">
                <img 
                  src={logo} 
                  className="h-7 w-7 object-contain group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6" 
                  alt="LTO Logo"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
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
              <SidebarMenuButton isActive={location.pathname === "/dashboard" || location.pathname === "/"} asChild>
                <Link to="/dashboard">
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
              <SidebarMenuButton isActive={location.pathname === "/owner"} asChild>
                <Link to="/owner">
                  <Users />
                  <span>Manage Owners</span>
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
            
            {/* Report Archive - Only visible for Admin and Superadmin */}
            {canManageAccounts && (
              <SidebarMenuItem>
                <SidebarMenuButton isActive={location.pathname === "/report-archive"} asChild>
                  <Link to="/report-archive">
                    <Archive />
                    <span>Report Archive</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Analytics</SidebarGroupLabel>
          <SidebarMenu>
            {isCollapsed ? (
              // Dropdown menu for collapsed state
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton tooltip="Analytics">
                      <PieChart />
                      <span>Analytics</span>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/analytics/registration" className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>MV Registration</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/analytics/violation" className="flex items-center gap-2">
                        <SquareChartGantt className="h-4 w-4" />
                        <span>Violation</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/analytics/accident" className="flex items-center gap-2">
                        <SquareActivity className="h-4 w-4" />
                        <span>Accident</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ) : (
              // Collapsible for expanded state
              <Collapsible asChild className="group/collapsible" open={isAnalyticsOpen} onOpenChange={handleAnalyticsChange}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
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
                            <span>MV Registration</span>
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
            )}
          </SidebarMenu>
        </SidebarGroup>

        {/* Trained Models Section - Only visible for SuperAdmin */}
        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Trained Models</SidebarGroupLabel>
            <SidebarMenu>
            {isCollapsed ? (
              // Dropdown menu for collapsed state
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton tooltip="Trained Models">
                      <Brain />
                      <span>Trained Models</span>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link to="/trained-models/vehicle" className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        <span>Vehicle Model – View Accuracy</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/trained-models/vehicle/mv-prediction" className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        <span>MV Prediction Model (Retrain)</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/trained-models/accident" className="flex items-center gap-2">
                        <SquareActivity className="h-4 w-4" />
                        <span>Accident Model</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ) : (
              // Collapsible for expanded state
              <Collapsible asChild className="group/collapsible" open={isTrainedModelsOpen} onOpenChange={handleTrainedModelsChange}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <Brain />
                      <span>Trained Models</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {/* Vehicle Model - accuracy view */}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton isActive={location.pathname === "/trained-models/vehicle"} asChild>
                          <Link to="/trained-models/vehicle">
                            <Car />
                            <span>Vehicle Model</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      {/* Vehicle Model - retrain page */}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton isActive={location.pathname === "/trained-models/vehicle/mv-prediction"} asChild>
                          <Link to="/trained-models/vehicle/mv-prediction">
                            <Car />
                            <span>MV Prediction Model</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      {/* Accident Model */}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton isActive={location.pathname === "/trained-models/accident"} asChild>
                          <Link to="/trained-models/accident">
                            <SquareActivity />
                            <span>Accident Model</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )}
          </SidebarMenu>
        </SidebarGroup>
        )}

        {/* Manage Account Section - Only visible for Admin and Superadmin */}
        {canManageAccounts && (
          <SidebarGroup>
            <SidebarGroupLabel>Account Management</SidebarGroupLabel>
            <SidebarMenu>
              {isCollapsed ? (
                // Dropdown menu for collapsed state
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton tooltip="Manage Account">
                        <User />
                        <span>Manage Account</span>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link to="/account/register" className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          <span>Register Account</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/account/update" className="flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          <span>Update Account</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/account/logs" className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>View Account Logs</span>
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ) : (
                // Collapsible for expanded state
                <Collapsible asChild className="group/collapsible" open={isManageAccountOpen} onOpenChange={handleManageAccountChange}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
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
              )}
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
