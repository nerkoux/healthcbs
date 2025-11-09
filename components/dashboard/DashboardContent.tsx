'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FolderOpen, 
  Plus, 
  Share2, 
  Activity, 
  FileText,
  LogOut,
  Settings,
  TrendingUp
} from 'lucide-react';

interface DashboardContentProps {
  user: any;
}

export default function DashboardContent({ user }: DashboardContentProps) {
  const [repositories, setRepositories] = useState<any>({ owned: [], shared: [] });
  const [healthAnalysis, setHealthAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // New repository dialog state
  const [isNewRepoOpen, setIsNewRepoOpen] = useState(false);
  const [repoName, setRepoName] = useState('');
  const [repoDescription, setRepoDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Edit profile dialog state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    age: user.age,
    height: user.height,
    weight: user.weight,
    bloodGroup: user.bloodGroup,
    gender: user.gender,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Health insights dialog state
  const [isHealthInsightsOpen, setIsHealthInsightsOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [reposRes, analysisRes] = await Promise.all([
        fetch('/api/repositories'),
        fetch('/api/health/analyze', { method: 'POST' }),
      ]);

      if (reposRes.ok) {
        const reposData = await reposRes.json();
        setRepositories(reposData);
      }

      if (analysisRes.ok) {
        const analysisData = await analysisRes.json();
        setHealthAnalysis(analysisData.analysis);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleCreateRepository = async () => {
    if (!repoName.trim()) {
      alert('Please enter a repository name');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: repoName.trim(),
          description: repoDescription.trim(),
          isPrivate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRepositories((prev: any) => ({
          ...prev,
          owned: [data.repository, ...prev.owned],
        }));
        setRepoName('');
        setRepoDescription('');
        setIsPrivate(true);
        setIsNewRepoOpen(false);
        alert('Repository created successfully!');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create repository');
      }
    } catch (error) {
      console.error('Error creating repository:', error);
      alert('An error occurred while creating the repository');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local user data
        Object.assign(user, profileData);
        setIsEditProfileOpen(false);
        alert('Profile updated successfully!');
        // Reload health analysis
        loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('An error occurred while updating profile');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] gradient-mesh">
      {/* Header */}
      <header className="glass border-b border-[#3c3c3c] sticky top-0 z-10 shadow-sm backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold gradient-text text-white">
                HealthVault
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={user.picture} />
                <AvatarFallback className="bg-[#1e1e1e] text-white">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-white">{user.name}</p>
                <p className="text-sm text-gray-400">@{user.username}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => window.location.href = '/auth/logout'}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card border-[#3c3c3c]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">
                My Repositories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{repositories.owned.length}</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-[#3c3c3c]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">
                Shared with Me
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{repositories.shared.length}</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-[#3c3c3c]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">
                BMI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {healthAnalysis?.bmi || 'N/A'}
              </div>
              <p className="text-sm text-gray-400">{healthAnalysis?.bmiCategory}</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-[#3c3c3c]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">
                Blood Group
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{user.bloodGroup}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Repositories Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card border-[#3c3c3c]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>My Repositories</CardTitle>
                    <CardDescription>
                      Organize your health reports like code repositories
                    </CardDescription>
                  </div>
                  <Dialog open={isNewRepoOpen} onOpenChange={setIsNewRepoOpen}>
                    <DialogTrigger asChild>
                      <Button className="btn-gradient">
                        <Plus className="mr-2 h-4 w-4" />
                        New Repository
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card border-[#3c3c3c]">
                      <DialogHeader>
                        <DialogTitle className="text-white">Create New Repository</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          Create a new repository to organize your health reports
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <Label htmlFor="repo-name" className="text-gray-300">Repository Name</Label>
                          <Input
                            id="repo-name"
                            placeholder="e.g., blood-tests-2024"
                            value={repoName}
                            onChange={(e) => setRepoName(e.target.value)}
                            className="mt-1 bg-[#1e1e1e] border-[#3c3c3c] text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="repo-description" className="text-gray-300">Description (optional)</Label>
                          <Input
                            id="repo-description"
                            placeholder="Brief description of this repository"
                            value={repoDescription}
                            onChange={(e) => setRepoDescription(e.target.value)}
                            className="mt-1 bg-[#1e1e1e] border-[#3c3c3c] text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="repo-visibility" className="text-gray-300">Visibility</Label>
                          <Select value={isPrivate ? 'private' : 'public'} onValueChange={(v) => setIsPrivate(v === 'private')}>
                            <SelectTrigger className="mt-1 bg-[#1e1e1e] border-[#3c3c3c] text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="private">Private - Only you and people you share with</SelectItem>
                              <SelectItem value="public">Public - Anyone can view</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button onClick={handleCreateRepository} disabled={isCreating} className="flex-1 btn-gradient">
                            {isCreating ? 'Creating...' : 'Create Repository'}
                          </Button>
                          <Button variant="outline" onClick={() => setIsNewRepoOpen(false)} disabled={isCreating} className="border-[#3c3c3c] text-gray-300 hover:bg-[#1e1e1e]">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center text-white py-8">Loading...</p>
                ) : repositories.owned.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">No repositories yet</p>
                    <Button onClick={() => setIsNewRepoOpen(true)} className="btn-gradient">
                      Create Your First Repository
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {repositories.owned.map((repo: any) => (
                      <Link
                        key={repo._id}
                        href={`/repositories/${repo._id}`}
                        className="block"
                      >
                        <div className="flex items-center justify-between p-4 border border-[#3c3c3c] rounded-lg hover:bg-[#1e1e1e] transition-colors cursor-pointer">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-5 w-5 text-[#03DAC6]" />
                              <h3 className="font-semibold text-white">{repo.name}</h3>
                            </div>
                            {repo.description && (
                              <p className="text-sm text-gray-400 mt-1">{repo.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              <span>{repo.filesCount} files</span>
                              <span>Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {repositories.shared.length > 0 && (
              <Card className="glass-card border-[#3c3c3c]">
                <CardHeader>
                  <CardTitle>Shared with Me</CardTitle>
                  <CardDescription>
                    Repositories others have shared with you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {repositories.shared.map((repo: any) => (
                      <Link
                        key={repo._id}
                        href={`/repositories/${repo._id}`}
                        className="block"
                      >
                        <div className="flex items-center justify-between p-4 border border-[#3c3c3c] rounded-lg hover:bg-[#1e1e1e] transition-colors cursor-pointer">
                          <div>
                            <div className="flex items-center gap-2">
                                <FolderOpen className="h-5 w-5 text-[#03DAC6]" />
                                <h3 className="font-semibold text-white">{repo.name}</h3>
                            </div>
                              <p className="text-sm text-gray-400 mt-1">
                                by @{repo.ownerUsername}
                              </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Health Insights Sidebar */}
          <div className="space-y-6">
            <Card className="glass-card border-[#3c3c3c]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Activity className="h-5 w-5 text-[#03DAC6]" />
                    Health Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {healthAnalysis ? (
                    <>
                      <div>
                        <h4 className="font-semibold mb-2 text-sm text-white">Risk Assessment</h4>
                        <ul className="space-y-1 text-sm text-gray-400">
                          {healthAnalysis.riskAssessment.slice(0, 3).map((risk: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-red-400">•</span>
                              <span className="text-sm text-gray-300">{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2 text-sm text-white">Recommendations</h4>
                        <ul className="space-y-1 text-sm text-gray-400">
                          {healthAnalysis.recommendations.slice(0, 3).map((rec: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-[#03DAC6]">•</span>
                              <span className="text-sm text-gray-300">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button variant="outline" className="w-full btn-gradient" size="sm" onClick={() => setIsHealthInsightsOpen(true)}>
                        View Full Analysis
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">Loading health insights...</p>
                  )}
                </CardContent>
              </Card>

            <Card className="glass-card border-[#3c3c3c]">
              <CardHeader>
                <CardTitle className="text-base">Health Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Age</span>
                  <span className="font-semibold text-white">{user.age} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Height</span>
                  <span className="font-semibold text-white">{user.height} cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Weight</span>
                  <span className="font-semibold text-white">{user.weight} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Gender</span>
                  <span className="font-semibold text-white">{user.gender}</span>
                </div>
                <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full mt-4 btn-gradient" size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-card border-[#3c3c3c]">
                    <DialogHeader>
                      <DialogTitle className="text-white">Edit Health Profile</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Update your health information for better insights
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="edit-age" className="text-gray-300">Age</Label>
                        <Input
                          id="edit-age"
                          type="number"
                          placeholder="Enter your age"
                          value={profileData.age}
                          onChange={(e) => setProfileData({ ...profileData, age: parseInt(e.target.value) || 0 })}
                          className="mt-1 bg-[#1e1e1e] border-[#3c3c3c] text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-height" className="text-gray-300">Height (cm)</Label>
                        <Input
                          id="edit-height"
                          type="number"
                          placeholder="Enter height in cm"
                          value={profileData.height}
                          onChange={(e) => setProfileData({ ...profileData, height: parseInt(e.target.value) || 0 })}
                          className="mt-1 bg-[#1e1e1e] border-[#3c3c3c] text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-weight" className="text-gray-300">Weight (kg)</Label>
                        <Input
                          id="edit-weight"
                          type="number"
                          placeholder="Enter weight in kg"
                          value={profileData.weight}
                          onChange={(e) => setProfileData({ ...profileData, weight: parseInt(e.target.value) || 0 })}
                          className="mt-1 bg-[#1e1e1e] border-[#3c3c3c] text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-blood-group" className="text-gray-300">Blood Group</Label>
                        <Select value={profileData.bloodGroup} onValueChange={(v) => setProfileData({ ...profileData, bloodGroup: v })}>
                          <SelectTrigger className="mt-1 bg-[#1e1e1e] border-[#3c3c3c] text-white">
                            <SelectValue placeholder="Select blood group" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A-">A-</SelectItem>
                            <SelectItem value="B+">B+</SelectItem>
                            <SelectItem value="B-">B-</SelectItem>
                            <SelectItem value="AB+">AB+</SelectItem>
                            <SelectItem value="AB-">AB-</SelectItem>
                            <SelectItem value="O+">O+</SelectItem>
                            <SelectItem value="O-">O-</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="edit-gender" className="text-gray-300">Gender</Label>
                        <Select value={profileData.gender} onValueChange={(v) => setProfileData({ ...profileData, gender: v })}>
                          <SelectTrigger className="mt-1 bg-[#1e1e1e] border-[#3c3c3c] text-white">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button onClick={handleUpdateProfile} disabled={isUpdating} className="flex-1 btn-gradient">
                          {isUpdating ? 'Updating...' : 'Update Profile'}
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditProfileOpen(false)} disabled={isUpdating} className="border-[#3c3c3c] text-gray-300 hover:bg-[#1e1e1e]">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Health Insights Full Analysis Dialog */}
      <Dialog open={isHealthInsightsOpen} onOpenChange={setIsHealthInsightsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto glass-card border-[#3c3c3c]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Activity className="h-5 w-5 text-[#03DAC6]" />
                Complete Health Analysis
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                AI-powered health insights based on your profile
              </DialogDescription>
            </DialogHeader>
            {healthAnalysis ? (
              <div className="space-y-6 pt-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-white">Health Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-[#1e1e1e] rounded-lg border border-[#3c3c3c]">
                      <p className="text-sm text-gray-400">BMI</p>
                      <p className="text-2xl font-bold text-white">{healthAnalysis.bmi}</p>
                      <p className="text-sm text-gray-400">{healthAnalysis.bmiCategory}</p>
                    </div>
                    <div className="p-3 bg-[#1e1e1e] rounded-lg border border-[#3c3c3c]">
                      <p className="text-sm text-gray-400">Health Score</p>
                      <p className="text-2xl font-bold text-[#03DAC6]">Good</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-white">Risk Assessment</h3>
                  <ul className="space-y-2">
                    {healthAnalysis.riskAssessment.map((risk: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 p-3 bg-[#1e1e1e] rounded-lg border border-[#3c3c3c]">
                        <span className="text-red-400 mt-0.5">⚠️</span>
                        <span className="text-sm text-gray-300">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-white">Recommendations</h3>
                  <ul className="space-y-2">
                    {healthAnalysis.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 p-3 bg-[#1e1e1e] rounded-lg border border-[#3c3c3c]">
                        <span className="text-[#03DAC6] mt-0.5">✓</span>
                        <span className="text-sm text-gray-300">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-[#1e1e1e] rounded-lg border border-[#3c3c3c]">
                  <p className="text-sm text-gray-300">
                    💡 <strong>Note:</strong> This AI analysis is for informational purposes only and should not replace professional medical advice. Please consult with a healthcare provider for personalized recommendations.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-gray-400">Loading health analysis...</p>
              </div>
            )}
          </DialogContent>
      </Dialog>
    </div>
  );
}
