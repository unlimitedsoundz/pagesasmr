'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  MessageSquare,
  Send,
  User,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Search,
} from 'lucide-react';
import { ChatMessage, Profile } from '@/types';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useToast } from '@/components/ToastProvider';

interface ConversationItem {
  creator: Profile;
  lastMessage: ChatMessage;
  unreadCount: number;
}

function PagesAdminChatContent() {
  const searchParams = useSearchParams();
  const queryCreatorId = searchParams.get('creatorId');

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(queryCreatorId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [creatorName, setCreatorName] = useState('Creator');
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevCreatorIdRef = useRef<string | null>(null);
  const prevMsgCountRef = useRef<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    if (queryCreatorId && queryCreatorId !== selectedCreatorId) {
      setSelectedCreatorId(queryCreatorId);
    }
  }, [queryCreatorId]);

  const loadConversations = async (targetId?: string) => {
    try {
      const res = await fetch('/api/chat?conversations=true');
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
        const activeId = targetId || selectedCreatorId || queryCreatorId;
        if (!activeId && data.conversations.length > 0) {
          setSelectedCreatorId(data.conversations[0].creator.id);
        } else if (activeId && !selectedCreatorId) {
          setSelectedCreatorId(activeId);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (creatorId: string, markRead = false) => {
    try {
      const url = markRead
        ? `/api/chat?creatorId=${encodeURIComponent(creatorId)}&markRead=true`
        : `/api/chat?creatorId=${encodeURIComponent(creatorId)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.messages) {
        setMessages((prev) => {
          if (prev.length === data.messages.length) {
            const isIdentical = prev.every((m, i) => {
              const dm = data.messages[i];
              return dm && m.id === dm.id && m.is_read === dm.is_read && m.message === dm.message;
            });
            if (isIdentical) return prev;
          }
          return data.messages;
        });
        setCreatorName(data.creatorName || 'Creator');

        // Immediately zero out the unread badge in local state
        if (markRead) {
          setConversations((prev) =>
            prev.map((c) =>
              c.creator.id === creatorId ? { ...c, unreadCount: 0 } : c
            )
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    if (selectedCreatorId) {
      await loadMessages(selectedCreatorId, true);
    }
    setTimeout(() => setRefreshing(false), 500);
  };

  const selectConversation = (creatorId: string) => {
    if (creatorId === selectedCreatorId) return;
    setSelectedCreatorId(creatorId);
    setMessages([]);
  };

  useEffect(() => {
    loadConversations();
    const interval = setInterval(() => loadConversations(), 3500);
    return () => clearInterval(interval);
  }, [selectedCreatorId]);

  useEffect(() => {
    if (selectedCreatorId) {
      loadMessages(selectedCreatorId, true);
      const interval = setInterval(() => loadMessages(selectedCreatorId), 2500);
      return () => clearInterval(interval);
    }
  }, [selectedCreatorId]);

  // Handle controlled scrolling inside the chat container without hijacking the whole page
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    // If switched conversation, jump straight to bottom
    if (selectedCreatorId !== prevCreatorIdRef.current) {
      prevCreatorIdRef.current = selectedCreatorId;
      prevMsgCountRef.current = messages.length;
      container.scrollTop = container.scrollHeight;
      return;
    }

    // If new messages arrived during polling
    if (messages.length > prevMsgCountRef.current) {
      prevMsgCountRef.current = messages.length;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
      if (isNearBottom) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages, selectedCreatorId]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedCreatorId || sending) return;

    const text = replyText.trim();
    setReplyText('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: selectedCreatorId,
          message: text,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      setMessages((prev) => [...prev, data.chatMessage]);
      setConversations((prev) =>
        prev.map((c) =>
          c.creator.id === selectedCreatorId ? { ...c, unreadCount: 0 } : c
        )
      );
      loadConversations();

      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
        }
      }, 50);
    } catch (err: any) {
      toast.error(err.message || 'Error sending reply');
      setReplyText(text);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.creator.display_name.toLowerCase().includes(q) ||
      c.creator.email.toLowerCase().includes(q)
    );
  });

  const activeConv = conversations.find((c) => c.creator.id === selectedCreatorId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-black">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-black">
            Creator Direct Messages
          </h1>
          <p className="text-xs text-neutral-600 font-medium mt-1">
            Real-time support channel for page-turning ASMR creators
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-none bg-white border border-neutral-300 text-xs font-bold text-black hover:bg-neutral-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Refresh conversations and messages"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <Link
            href="/admin/submissions"
            className="px-4 py-2 rounded-none bg-white border border-neutral-300 text-xs font-bold text-black hover:bg-neutral-100 transition-colors"
          >
            Review Submissions
          </Link>
          <div className="text-xs bg-neutral-100 text-black font-bold px-3 py-2 rounded-none border border-neutral-300">
            Live Support Active
          </div>
        </div>
      </div>

      {/* Main Chat Hub Container */}
      <div data-chat-container="true" className="chat-container bg-white rounded-none border border-neutral-200 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
        {/* Left Sidebar: Conversations List */}
        <div className="md:col-span-4 border-r border-neutral-200 flex flex-col bg-neutral-50">
          <div className="p-4 border-b border-neutral-200 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-black absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter creators..."
                data-chat-input="true"
                className="chat-input w-full pl-9 pr-3 py-2 text-xs rounded-none border border-neutral-300 focus:outline-none focus:border-black bg-white text-black placeholder:text-neutral-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-200 font-medium">
            {loading ? (
              <div className="p-8 text-center text-xs text-black font-medium">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-black font-medium">No active conversations found.</div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.creator.id === selectedCreatorId;
                const time = new Date(conv.lastMessage.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <button
                    key={conv.creator.id}
                    type="button"
                    onClick={() => selectConversation(conv.creator.id)}
                    data-chat-conversation="true"
                    className={`chat-conversation-item w-full text-left p-4 transition-colors flex items-start justify-between gap-3 rounded-none cursor-pointer ${
                      isSelected ? 'bg-neutral-200 border-l-4 border-black' : 'hover:bg-neutral-100'
                    }`}
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-black text-sm truncate flex items-center gap-1.5">
                          <span>{conv.creator.display_name}</span>
                          {conv.creator.sample_status === 'APPROVED' && <VerifiedBadge size={15} />}
                        </div>
                        <span className="text-[10px] text-black font-bold">{time}</span>
                      </div>
                      <p className="text-xs text-black truncate">
                        {conv.lastMessage.sender_role === 'ADMIN' ? 'You: ' : ''}
                        {conv.lastMessage.message}
                      </p>
                      <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-black font-medium">
                        <span>{conv.creator.country}</span>
                        <span>•</span>
                        <span className="font-bold text-black">
                          {conv.creator.sample_status || 'Audition Pending'}
                        </span>
                      </div>
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="shrink-0 w-5 h-5 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat Conversation */}
        <div className="md:col-span-8 flex flex-col h-full bg-white">
          {selectedCreatorId ? (
            <>
              {/* Active Conversation Header */}
              <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div data-avatar="true" className="w-10 h-10 rounded-full bg-black text-white font-bold flex items-center justify-center text-sm">
                    {creatorName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-serif text-lg font-bold text-black flex items-center gap-2">
                      <span>{creatorName}</span>
                      {activeConv?.creator.sample_status === 'APPROVED' && <VerifiedBadge size={18} />}
                    </div>
                    <div className="text-[11px] text-black font-medium">
                      Direct Creator Channel
                    </div>
                  </div>
                </div>

                {activeConv && (
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] uppercase font-bold text-black">Status</span>
                    <div className="text-xs font-bold text-black flex items-center gap-1.5 justify-end">
                      {activeConv.creator.sample_status === 'APPROVED' ? (
                        <>
                          <VerifiedBadge size={14} />
                          <span>Verified Creator</span>
                        </>
                      ) : (
                        'Audition Stage'
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Messages Flow */}
              <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-neutral-50/50">
                {messages.length === 0 ? (
                  <div className="p-12 text-center text-black text-xs">
                    No messages in this conversation yet. Send a message below.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isAdmin = m.sender_role === 'ADMIN';
                    const time = new Date(m.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        <div className="text-[10px] text-black px-1 font-bold">
                          {isAdmin ? 'Admin' : creatorName} • {time}
                        </div>
                        <div
                          data-message-bubble={isAdmin ? 'user' : 'other'}
                          className={`chat-bubble max-w-[75%] px-4 py-3 text-xs leading-relaxed rounded-none ${
                            isAdmin
                              ? 'bg-black text-white'
                              : 'bg-white border border-neutral-300 text-black'
                          }`}
                        >
                          {m.message}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input Bar */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-neutral-200 bg-white flex items-center gap-3 rounded-none">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${creatorName}...`}
                  data-chat-input="true"
                  className="chat-input flex-1 px-4 py-3 text-xs rounded-none border border-neutral-300 focus:outline-none focus:border-black bg-white text-black placeholder:text-neutral-500"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="px-5 py-3 rounded-none bg-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{sending ? 'Sending...' : 'Send'}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-12 text-center text-black font-medium text-xs">
              Select a conversation from the left to begin messaging.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-xs font-bold text-neutral-500">
          Loading Creator Direct Messages...
        </div>
      }
    >
      <PagesAdminChatContent />
    </Suspense>
  );
}
