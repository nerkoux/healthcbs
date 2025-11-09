'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMarkdown } from '@/lib/markdown-formatter';
import { X, Send, Bot, User as UserIcon, FileText, Loader2, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  fileIds?: string[];
}

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  repositoryId: string;
  repositoryName: string;
  availableFiles: Array<{ _id: string; name: string; fileType: string }>;
}

export default function AIChat({ isOpen, onClose, repositoryId, repositoryName, availableFiles }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your AI health assistant for the "${repositoryName}" repository. I can help you analyze medical reports, answer questions about your health data, and provide insights. How can I assist you today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev: string[]) =>
      prev.includes(fileId)
        ? prev.filter((id: string) => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleSend = async () => {
    if (!input.trim() && selectedFiles.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim() || `Analyzing ${selectedFiles.length} selected file(s)...`,
      timestamp: new Date(),
      fileIds: selectedFiles.length > 0 ? selectedFiles : undefined,
    };

    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`/api/repositories/${repositoryId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          fileIds: selectedFiles.length > 0 ? selectedFiles : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(data.timestamp),
        };
        setMessages((prev: Message[]) => [...prev, assistantMessage]);
        setSelectedFiles([]);
      } else {
        const error = await res.json();
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error.error || 'Please try again.'}`,
          timestamp: new Date(),
        };
        setMessages((prev: Message[]) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered a network error. Please check your connection and try again.',
        timestamp: new Date(),
      };
      setMessages((prev: Message[]) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 dark:bg-gray-900 dark:border-gray-800">
        <DialogHeader className="px-6 py-4 border-b dark:border-gray-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="dark:text-white">AI Health Assistant</DialogTitle>
                <DialogDescription className="dark:text-gray-400">
                  Repository: {repositoryName}
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="dark:hover:bg-gray-800">
              <X className="h-5 w-5 dark:text-gray-400" />
            </Button>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-white dark:bg-gray-950">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              )}
              
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {message.fileIds && message.fileIds.length > 0 && (
                  <div className="mb-2 text-xs opacity-75 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {message.fileIds.length} file(s) attached
                  </div>
                )}
                <div className="break-words leading-relaxed">
                  {message.role === 'assistant' ? formatMarkdown(message.content) : <span className="whitespace-pre-wrap">{message.content}</span>}
                </div>
                <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-500 dark:text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-800 flex items-center justify-center flex-shrink-0 shadow-md">
                  <UserIcon className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <Sparkles className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div className="space-y-2 flex-1 max-w-[70%]">
                <Skeleton className="h-4 w-full dark:bg-gray-800" />
                <Skeleton className="h-4 w-5/6 dark:bg-gray-800" />
                <Skeleton className="h-4 w-4/6 dark:bg-gray-800" />
                <div className="flex items-center gap-2 pt-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">AI is analyzing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* File Selection Area */}
        {availableFiles.length > 0 && (
          <div className="px-6 py-3 border-t border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-900 max-h-32 overflow-y-auto">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Select files to analyze:
            </p>
            <div className="flex flex-wrap gap-2">
              {availableFiles.map((file) => (
                <button
                  key={file._id}
                  onClick={() => toggleFileSelection(file._id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all duration-200 transform hover:scale-105 ${
                    selectedFiles.includes(file._id)
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-400'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs opacity-75 px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                    {file.fileType}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-6 py-4 border-t dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                selectedFiles.length > 0
                  ? `Ask about ${selectedFiles.length} selected file(s)...`
                  : 'Ask a question about your health data...'
              }
              disabled={isLoading}
              className="flex-1 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && selectedFiles.length === 0)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Tip: Select files above to get AI analysis, or just ask questions about your health
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
