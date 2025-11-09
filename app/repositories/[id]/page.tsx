'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AIChat from '@/components/repository/AIChat';
import { 
  ArrowLeft, 
  Upload, 
  Share2, 
  FileText, 
  Download,
  Trash2,
  Lock,
  Globe,
  X,
  MessageSquare
} from 'lucide-react';

export default function RepositoryPage() {
  const params = useParams();
  const router = useRouter();
  const repositoryId = params.id as string;

  const [repository, setRepository] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [sharedWith, setSharedWith] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState('blood-test');
  const [fileDescription, setFileDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Share state
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareUsername, setShareUsername] = useState('');
  const [accessLevel, setAccessLevel] = useState('read');
  const [isSharing, setIsSharing] = useState(false);

  // AI Chat state
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  useEffect(() => {
    loadRepositoryData();
  }, [repositoryId]);

  async function loadRepositoryData() {
    try {
      const [repoRes, filesRes, shareRes] = await Promise.all([
        fetch(`/api/repositories/${repositoryId}`),
        fetch(`/api/repositories/${repositoryId}/files`),
        fetch(`/api/repositories/${repositoryId}/share`),
      ]);

      if (repoRes.ok) {
        const data = await repoRes.json();
        setRepository(data.repository);
      }

      if (filesRes.ok) {
        const data = await filesRes.json();
        setFiles(data.files || []);
      }

      if (shareRes.ok) {
        const data = await shareRes.json();
        setSharedWith(data.sharedAccess || []);
      }
    } catch (error) {
      console.error('Error loading repository:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload() {
    if (!selectedFile) {
      alert('Please select a file');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('repositoryId', repositoryId);
      formData.append('fileType', fileType);
      formData.append('description', fileDescription);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setFiles([data.file, ...files]);
        setSelectedFile(null);
        setFileDescription('');
        setIsUploadOpen(false);
        alert('File uploaded successfully!');
        loadRepositoryData(); // Reload to update stats
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('An error occurred while uploading');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleShare() {
    if (!shareUsername.trim()) {
      alert('Please enter a username');
      return;
    }

    setIsSharing(true);
    try {
      const res = await fetch(`/api/repositories/${repositoryId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: shareUsername.trim(),
          accessLevel,
        }),
      });

      if (res.ok) {
        alert('Repository shared successfully!');
        setShareUsername('');
        setIsShareOpen(false);
        loadRepositoryData(); // Reload to show new share
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to share repository');
      }
    } catch (error) {
      console.error('Error sharing repository:', error);
      alert('An error occurred while sharing');
    } finally {
      setIsSharing(false);
    }
  }

  async function handleRevokeAccess(accessId: string) {
    if (!confirm('Are you sure you want to revoke access?')) return;

    try {
      const res = await fetch(`/api/repositories/${repositoryId}/share?accessId=${accessId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSharedWith(sharedWith.filter(s => s._id !== accessId));
        alert('Access revoked successfully');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to revoke access');
      }
    } catch (error) {
      console.error('Error revoking access:', error);
      alert('An error occurred');
    }
  }

  async function handleDownload(fileId: string, fileName: string) {
    try {
      const res = await fetch(`/api/download?fileId=${fileId}`);
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('An error occurred while downloading');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#121212]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#03DAC6] mx-auto mb-4"></div>
          <p className="text-white">Loading repository...</p>
        </div>
      </div>
    );
  }

  if (!repository) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#121212]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-white">Repository not found</h2>
          <Link href="/dashboard">
            <Button className="btn-gradient">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] gradient-mesh">
      {/* Header */}
      <header className="glass border-b border-[#3c3c3c] shadow-sm sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="hover:bg-[#1e1e1e]">
                  <ArrowLeft className="h-5 w-5 text-gray-300" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">{repository.name}</h1>
                {repository.description && (
                  <p className="text-gray-400 text-sm">{repository.description}</p>
                )}
              </div>
              {repository.isPrivate ? (
                <Lock className="h-5 w-5 text-gray-400" />
              ) : (
                <Globe className="h-5 w-5 text-[#03DAC6]" />
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsAIChatOpen(true)}
                className="btn-gradient"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                AI Assistant
              </Button>

              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-gradient">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload File
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card border-[#3c3c3c]">
                  <DialogHeader>
                    <DialogTitle className="text-white">Upload Health Report</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Upload a file to this repository (encrypted automatically)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="file-upload" className="text-gray-300">Select File</Label>
                      <Input
                        id="file-upload"
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="mt-1 bg-[#1e1e1e] border-[#3c3c3c] text-white"
                      />
                      {selectedFile && (
                        <p className="text-sm text-gray-400 mt-1">
                          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="file-type" className="text-gray-300">File Type</Label>
                      <Select value={fileType} onValueChange={setFileType}>
                        <SelectTrigger className="mt-1 bg-[#1e1e1e] border-[#3c3c3c] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="blood-test">Blood Test</SelectItem>
                          <SelectItem value="x-ray">X-Ray</SelectItem>
                          <SelectItem value="mri">MRI Scan</SelectItem>
                          <SelectItem value="ct-scan">CT Scan</SelectItem>
                          <SelectItem value="prescription">Prescription</SelectItem>
                          <SelectItem value="vaccination">Vaccination Record</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="file-description" className="text-gray-300">Description (optional)</Label>
                      <Input
                        id="file-description"
                        placeholder="Brief description of this file"
                        value={fileDescription}
                        onChange={(e) => setFileDescription(e.target.value)}
                        className="mt-1 bg-[#1e1e1e] border-[#3c3c3c] text-white placeholder:text-gray-500"
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleFileUpload} disabled={isUploading || !selectedFile} className="flex-1 btn-gradient">
                        {isUploading ? 'Uploading...' : 'Upload'}
                      </Button>
                      <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={isUploading} className="border-[#3c3c3c] text-gray-300 hover:bg-[#2a2a2a] hover:text-white">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-gradient">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card border-[#3c3c3c]">
                  <DialogHeader>
                    <DialogTitle className="text-white">Share Repository</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Share this repository with other users
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="share-username" className="text-gray-300">Username</Label>
                      <Input
                        id="share-username"
                        placeholder="Enter username"
                        value={shareUsername}
                        onChange={(e) => setShareUsername(e.target.value)}
                        className="mt-1 bg-[#1e1e1e] border-[#3c3c3c] text-white placeholder:text-gray-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="access-level" className="text-gray-300">Access Level</Label>
                      <Select value={accessLevel} onValueChange={setAccessLevel}>
                        <SelectTrigger className="mt-1 bg-[#1e1e1e] border-[#3c3c3c] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">Read Only - Can view files</SelectItem>
                          <SelectItem value="write">Write - Can upload files</SelectItem>
                          <SelectItem value="admin">Admin - Full access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleShare} disabled={isSharing} className="flex-1 btn-gradient">
                        {isSharing ? 'Sharing...' : 'Share'}
                      </Button>
                      <Button variant="outline" onClick={() => setIsShareOpen(false)} disabled={isSharing} className="border-[#3c3c3c] text-gray-300 hover:bg-[#2a2a2a] hover:text-white">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Files Section */}
          <div className="lg:col-span-2">
            <Card className="glass-card border-[#3c3c3c]">
              <CardHeader>
                <CardTitle className="text-white">Files ({files.length})</CardTitle>
                <CardDescription className="text-gray-400">
                  All files are encrypted with AES-256-GCM
                </CardDescription>
              </CardHeader>
              <CardContent>
                {files.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">No files yet</p>
                    <Button onClick={() => setIsUploadOpen(true)} className="btn-gradient">
                      Upload Your First File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div
                        key={file._id}
                        className="flex items-center justify-between p-4 border border-[#3c3c3c] rounded-lg hover:bg-[#1e1e1e] transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-[#03DAC6]" />
                            <h3 className="font-semibold text-white">{file.name}</h3>
                            <span className="text-xs px-2 py-1 bg-[#03DAC6]/20 text-[#03DAC6] rounded">
                              {file.fileType}
                            </span>
                          </div>
                          {file.description && (
                            <p className="text-sm text-gray-400 mt-1">{file.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>{(file.size / 1024).toFixed(2)} KB</span>
                            <span>Uploaded {new Date(file.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file._id, file.name)}
                          className="hover:bg-[#1e1e1e] text-gray-300"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Repository Stats */}
            <Card className="glass-card border-[#3c3c3c]">
              <CardHeader>
                <CardTitle className="text-base text-white">Repository Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Files</span>
                  <span className="font-semibold text-white">{repository.filesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Size</span>
                  <span className="font-semibold text-white">
                    {(repository.totalSize / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Created</span>
                  <span className="font-semibold text-white">
                    {new Date(repository.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Updated</span>
                  <span className="font-semibold text-white">
                    {new Date(repository.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Shared With */}
            <Card className="glass-card border-[#3c3c3c]">
              <CardHeader>
                <CardTitle className="text-base text-white">Shared With ({sharedWith.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {sharedWith.length === 0 ? (
                  <p className="text-sm text-gray-400">Not shared with anyone</p>
                ) : (
                  <div className="space-y-2">
                    {sharedWith.map((access) => (
                      <div
                        key={access._id}
                        className="flex items-center justify-between p-2 border border-[#3c3c3c] rounded bg-[#1e1e1e]"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-white">
                            @{access.sharedWithUserId?.username || access.sharedWithUsername}
                          </p>
                          <p className="text-xs text-gray-400">{access.accessLevel}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeAccess(access._id)}
                          className="hover:bg-[#121212] text-gray-400"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* AI Chat Modal */}
      <AIChat
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        repositoryId={repositoryId}
        repositoryName={repository?.name || ''}
        availableFiles={files}
      />
    </div>
  );
}
