import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoaderCircle, Edit, Search, User, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";

// Validation schema for updating account
const updateAccountSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  firstName: z.string().min(1, "First name is required").trim(),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required").trim(),
  email: z.string().email("Invalid email address"),
  role: z.enum(["0", "1", "2"], {
    required_error: "Please select a role",
  }),
  isPasswordChange: z.boolean().optional(),
});

const roleOptions = [
  { value: "0", label: "Superadmin" },
  { value: "1", label: "Admin" },
  { value: "2", label: "Employee" },
];

export default function UpdateAccountPage() {
  const { userData: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const form = useForm({
    resolver: zodResolver(updateAccountSchema),
    defaultValues: {
      userId: "",
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      role: "",
      isPasswordChange: false,
    },
  });

  // Fetch users based on current user's role
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get("/user/all");
      
      if (response.data.success) {
        let filteredUsers = response.data.users;
        
        // Filter users based on current user's role
        if (currentUser?.role === "1") { // Admin can only see employees
          filteredUsers = filteredUsers.filter(user => user.role === "2");
        } else if (currentUser?.role === "0") { // Superadmin can see admin and employees
          filteredUsers = filteredUsers.filter(user => user.role === "1" || user.role === "2");
        }
        
        setUsers(filteredUsers);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch users";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsUpdateModalOpen(true);
    
    // Populate form with user data
    form.reset({
      userId: user._id,
      firstName: user.firstName,
      middleName: user.middleName || "",
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isPasswordChange: user.isPasswordChange || false,
    });
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setIsSubmitting(true);
      const response = await apiClient.delete(`/user/${userToDelete._id}`);
      
      if (response.data.success) {
        toast.success("User deleted successfully!");
        fetchUsers(); // Refresh the list
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to delete user";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      
      const response = await apiClient.put(`/user/${data.userId}`, data);
      
      if (response.data.success) {
        toast.success("Account updated successfully!");
        fetchUsers(); // Refresh the list
        setIsUpdateModalOpen(false);
        setSelectedUser(null);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to update account";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedUser(null);
    setIsUpdateModalOpen(false);
    form.reset();
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case "0":
        return "destructive";
      case "1":
        return "default";
      case "2":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "0":
        return "Superadmin";
      case "1":
        return "Admin";
      case "2":
        return "Employee";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="h-full bg-white dark:bg-black overflow-hidden rounded-lg">
      <div className="container mx-auto px-6 py-4 h-full flex flex-col">
        <div className="max-w-7xl mx-auto w-full h-full flex flex-col space-y-4">
          {/* Header */}
          <Card className="flex-shrink-0">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Edit className="h-6 w-6" />
                <CardTitle>Manage User Accounts</CardTitle>
              </div>
              <CardDescription>
                {currentUser?.role === "0" 
                  ? "View and manage admin and employee accounts" 
                  : "View and manage employee accounts"}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Users Table */}
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="flex-shrink-0">
              <CardTitle>User Accounts</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoaderCircle className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading users...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1" style={{ maxHeight: '24rem' }}>
                  <Table>
                    <TableHeader className="sticky top-0 bg-white dark:bg-gray-950 z-10">
                      <TableRow>
                        <TableHead className="bg-white dark:bg-gray-950">Full Name</TableHead>
                        <TableHead className="bg-white dark:bg-gray-950">Email</TableHead>
                        <TableHead className="bg-white dark:bg-gray-950">Role</TableHead>
                        <TableHead className="bg-white dark:bg-gray-950">Created At</TableHead>
                        <TableHead className="bg-white dark:bg-gray-950">Last Updated</TableHead>
                        <TableHead className="w-[50px] bg-white dark:bg-gray-950">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user._id}>
                          <TableCell className="font-medium">
                            {user.firstName} {user.middleName} {user.lastName}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {getRoleLabel(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {new Date(user.updatedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Update
                                </DropdownMenuItem>
                                {/* Only show delete action for superadmin */}
                                {currentUser?.role === "0" && (
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteUser(user)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            </CardContent>
          </Card>

        {/* Update Form Modal */}
        <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Edit className="h-6 w-6" />
                <DialogTitle>Update Account Information</DialogTitle>
              </div>
              <DialogDescription>
                {selectedUser && `Modify the account information for ${selectedUser.firstName} ${selectedUser.lastName}`}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="middleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Middle Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter middle name (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter email address" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4 pt-4">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-auto px-8"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Edit className="mr-2 h-4 w-4" />
                        Update Account
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    disabled={isSubmitting}
                    className="w-auto px-8"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the account for{" "}
                <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>
    </div>
  );
}
