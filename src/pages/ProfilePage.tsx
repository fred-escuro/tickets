import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { PageWrapper, PageSection } from '@/components/PageWrapper';
import { ArrowLeft, User as UserIcon, Mail, Phone, MapPin, Building, Shield, Calendar, Edit, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserService, type User } from '@/lib/services/userService';
import { AuthService } from '@/lib/services/authService';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { apiCall } = useApi();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    location: '',
    department: '',
    avatar: ''
  });



  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const currentUser = AuthService.getCurrentUser();
             if (currentUser) {
         // Get fresh user data from database
         const response = await UserService.getUser(currentUser.id);
         
                  if (response.success && response.data) {
            const freshUser = response.data;
           
                       // Update localStorage with fresh data
            AuthService.setCurrentUser(freshUser);
            
            setUser(freshUser);
            const newFormData = {
              firstName: freshUser.firstName,
              lastName: freshUser.lastName,
              middleName: freshUser.middleName || '',
              email: freshUser.email,
              phone: freshUser.phone || '',
              location: freshUser.location || '',
              department: freshUser.department || '',
              avatar: freshUser.avatar || ''
            };
            setFormData(newFormData);
                 } else {
           // Fallback to localStorage data if API fails
           setUser(currentUser);
          setFormData({
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            middleName: currentUser.middleName || '',
            email: currentUser.email,
            phone: currentUser.phone || '',
            location: currentUser.location || '',
            department: currentUser.department || '',
            avatar: currentUser.avatar || ''
          });
        }
      } else {
        toast.error('No user data found');
      }
    } catch (error) {
      toast.error('Failed to load profile');
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!user) {
        toast.error('No user data available');
        return;
      }

      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName || undefined,
        phone: formData.phone || undefined,
        avatar: formData.avatar || undefined,
        location: formData.location || undefined
      };
      
             const response = await UserService.updateUser(user.id, updateData);

             if (response.success && response.data) {
         // Update local storage with new user data
         const updatedUser = { ...user, ...response.data };
         AuthService.setCurrentUser(updatedUser);
         setUser(updatedUser);
         setIsEditing(false);
         toast.success('Profile updated successfully');
         
         // Dispatch custom event to notify other components (like header) to refresh
         window.dispatchEvent(new Event('auth-change'));
       } else {
         toast.error(response.error || 'Failed to update profile');
       }
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

     const handleCancel = () => {
     if (user) {
       setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName || '',
        email: user.email,
        phone: user.phone || '',
        location: user.location || '',
        department: user.departmentEntity?.name || '',
                 avatar: user.avatar || ''
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Failed to load profile</p>
          <Button onClick={fetchUserProfile}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageWrapper className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <PageSection index={0}>
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
                             {!isEditing && (
                 <div className="flex gap-2">
                   <Button 
                     onClick={() => setIsEditing(true)} 
                     className="gap-2"
                   >
                     <Edit className="h-4 w-4" />
                     Edit Profile
                   </Button>
                   
                 </div>
               )}
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
              <p className="text-muted-foreground">
                Manage your account information and preferences
              </p>
            </div>
          </div>
        </PageSection>

        {/* Profile Content */}
        <PageSection index={1}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="text-center">
                  {/* Avatar Section */}
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      {formData.avatar ? (
                        <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-primary/20">
                          <img 
                            src={formData.avatar} 
                            alt={`${formData.firstName} ${formData.lastName}`}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // Hide the image and show initials on error
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const initialsDiv = target.parentElement?.querySelector('.avatar-initials') as HTMLElement;
                              if (initialsDiv) {
                                initialsDiv.style.display = 'flex';
                              }
                            }}
                          />
                          {/* Fallback initials - hidden by default when image is present */}
                          <div 
                            className="avatar-initials h-full w-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-2xl font-bold"
                            style={{ display: 'none' }}
                          >
                            {formData.firstName?.charAt(0)?.toUpperCase()}{formData.lastName?.charAt(0)?.toUpperCase()}
                          </div>
                        </div>
                      ) : (
                        /* Show initials when no avatar is set */
                        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-2xl font-bold border-4 border-primary/20">
                          {formData.firstName?.charAt(0)?.toUpperCase()}{formData.lastName?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <CardTitle className="text-xl">
                    {formData.middleName ? `${formData.firstName} ${formData.middleName} ${formData.lastName}` : `${formData.firstName} ${formData.lastName}`}
                  </CardTitle>
                  <div className="space-y-2">
                    <Badge variant="secondary" className="text-sm">
                      {user.role === 'admin' ? 'System Administrator' : user.role}
                    </Badge>
                    {user.departmentEntity?.name && (
                      <Badge variant="outline" className="text-sm">
                        {user.departmentEntity.name}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{formData.email}</span>
                  </div>
                  {formData.phone && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{formData.phone}</span>
                    </div>
                  )}
                  {formData.location && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{formData.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Member since {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Profile Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isEditing ? (
                    <form className="space-y-4">
                                                                                          <div className="space-y-2">
                         <Label htmlFor="avatar">Avatar URL</Label>
                         <p className="text-xs text-muted-foreground">
                           Enter a direct image URL or use the buttons below to generate one
                         </p>
                         <div className="flex gap-2">
                           <Input
                             id="avatar"
                             type="url"
                             placeholder="https://example.com/avatar.jpg"
                             value={formData.avatar}
                             onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                             className="flex-1"
                           />
                                                        <Button
                               type="button"
                               variant="outline"
                               size="sm"
                               onClick={() => {
                                 const generatedAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formData.firstName + ' ' + formData.lastName)}&backgroundColor=1f2937&textColor=ffffff`;
                                 setFormData({ ...formData, avatar: generatedAvatar });
                               }}
                               title="Generate avatar with your initials"
                             >
                               Generate
                             </Button>

                           </div>
                                                                                                      {formData.avatar && (
                             <div className="flex items-center gap-2 mt-2">
                               <span className="text-sm text-muted-foreground">Preview:</span>
                               <div className="relative">
                                 <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-border">
                                   <img 
                                     src={formData.avatar} 
                                     alt="Avatar preview"
                                     className="h-full w-full object-cover"
                                     onError={(e) => {
                                       // Hide the image and show initials on error
                                       const target = e.target as HTMLImageElement;
                                       target.style.display = 'none';
                                       const initialsDiv = target.parentElement?.querySelector('.preview-initials') as HTMLElement;
                                       if (initialsDiv) {
                                         initialsDiv.style.display = 'flex';
                                       }
                                     }}
                                   />
                                   {/* Fallback initials for preview */}
                                   <div 
                                     className="preview-initials h-full w-full bg-muted flex items-center justify-center border-2 border-border"
                                     style={{ display: 'none' }}
                                   >
                                     <div className="text-xs font-bold text-muted-foreground">
                                       {formData.firstName?.charAt(0)?.toUpperCase()}{formData.lastName?.charAt(0)?.toUpperCase()}
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             </div>
                           )}
                       </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="middleName">Middle Name</Label>
                        <Input
                          id="middleName"
                          value={formData.middleName}
                          onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleCancel}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button 
                          type="button" 
                          onClick={handleSave}
                          disabled={saving}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">First Name</Label>
                          <p className="text-sm">{formData.firstName}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Last Name</Label>
                          <p className="text-sm">{formData.lastName}</p>
                        </div>
                      </div>
                      
                      {formData.middleName && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Middle Name</Label>
                          <p className="text-sm">{formData.middleName}</p>
                        </div>
                      )}

                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                        <p className="text-sm">{formData.email}</p>
                      </div>

                      {formData.phone && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                          <p className="text-sm">{formData.phone}</p>
                        </div>
                      )}

                      {formData.location && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                          <p className="text-sm">{formData.location}</p>
                        </div>
                      )}

                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Department</Label>
                        <p className="text-sm">{formData.department || 'Not specified'}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </PageSection>
      </PageWrapper>
    </div>
  );
};
