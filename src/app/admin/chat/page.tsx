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
  RefreshCw,
  Search,
  ShieldAlert,
  Ban,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Columns,
  ExternalLink,
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
  const [messagesByCreator, setMessagesByCreator] = useState<Record<string, ChatMessage[]>>({});
  const [loadingByCreator, setLoadingByCreator] = useState<Record<string, boolean>>({});
  const [expandedCreators, setExpandedCreators] = useState<Record<string, boolean>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [sendingByCreator, setSendingByCreator] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'AUDITION' | 'APPROVED'>('ALL');
  const [viewMode, setViewMode] = useState<'accordion' | 'split'>('accordion');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (queryCreatorId) {
      setSelectedCreatorId(queryCreatorId);
      setExpandedCreators((prev) => ({ ...prev, [queryCreatorId]: true }));
      loadMessagesForCreator(queryCreatorId, true);
    }
  }, [queryCreatorId]);

  const loadConversations = async (targetId?: string) => {
    try {
      const res = await fetch('/api/chat?conversations=true');
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
        const activeId = targetId || selectedCreatorId || queryCreatorId;
        if (!activeId && data.conversations.length > 0 && !selectedCreatorId) {
          setSelectedCreatorId(data.conversations[0].creator.id);
        }
      }
    } catch (e) {
      console.error('Error loading conversations:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesForCreator = async (creatorId: string, markRead = false) => {
    try {
      if (!messagesByCreator[creatorId]) {
        setLoadingByCreator((prev) => ({ ...prev, [creatorId]: true }));
      }
      const url = markRead
        ? `/api/chat?creatorId=${encodeURIComponent(creatorId)}&markRead=true`
        : `/api/chat?creatorId=${encodeURIComponent(creatorId)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.messages) {
        setMessagesByCreator((prev) => {
          const current = prev[creatorId] || [];
          if (current.length === data.messages.length) {
            const isIdentical = current.every((m, i) => {
              const dm = data.messages[i];
              return dm && m.id === dm.id && m.is_read === dm.is_read && m.message === dm.message;
            });
            if (isIdentical) return prev;
          }
          return { ...prev, [creatorId]: data.messages };
        });

        if (markRead) {
          setConversations((prev) =>
            prev.map((c) => (c.creator.id === creatorId ? { ...c, unreadCount: 0 } : c))
          );
        }
      }
    } catch (e) {
      console.error(`Error loading messages for ${creatorId}:`, e);
    } finally {
      setLoadingByCreator((prev) => ({ ...prev, [creatorId]: false }));
    }
  };

  const toggleAccordion = (creatorId: string) => {
    setExpandedCreators((prev) => {
      const nextState = !prev[creatorId];
      if (nextState) {
        loadMessagesForCreator(creatorId, true);
        setSelectedCreatorId(creatorId);
      }
      return { ...prev, [creatorId]: nextState };
    });
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    filteredConversations.forEach((c) => {
      allExpanded[c.creator.id] = true;
      loadMessagesForCreator(c.creator.id, false);
    });
    setExpandedCreators(allExpanded);
  };

  const collapseAll = () => {
    setExpandedCreators({});
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    const openIds = Object.keys(expandedCreators).filter((id) => expandedCreators[id]);
    if (selectedCreatorId && !openIds.includes(selectedCreatorId)) {
      openIds.push(selectedCreatorId);
    }
    await Promise.all(openIds.map((id) => loadMessagesForCreator(id, false)));
    setTimeout(() => setRefreshing(false), 500);
  };

  // Poll conversations every 4s
  useEffect(() => {
    loadConversations();
    const interval = setInterval(() => loadConversations(), 4000);
    return () => clearInterval(interval);
  }, []);

  // Poll open accordions every 3s
  useEffect(() => {
    const openIds = Object.keys(expandedCreators).filter((id) => expandedCreators[id]);
    if (selectedCreatorId && viewMode === 'split' && !openIds.includes(selectedCreatorId)) {
      openIds.push(selectedCreatorId);
    }

    if (openIds.length === 0) return;

    const interval = setInterval(() => {
      openIds.forEach((id) => loadMessagesForCreator(id, false));
    }, 3000);

    return () => clearInterval(interval);
  }, [expandedCreators, selectedCreatorId, viewMode]);

  const handleSendReply = async (creatorId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = (replyTexts[creatorId] || '').trim();
    if (!text || sendingByCreator[creatorId]) return;

    setSendingByCreator((prev) => ({ ...prev, [creatorId]: true }));
    setReplyTexts((prev) => ({ ...prev, [creatorId]: '' }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          message: text,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      setMessagesByCreator((prev) => ({
        ...prev,
        [creatorId]: [...(prev[creatorId] || []), data.chatMessage],
      }));

      setConversations((prev) =>
        prev.map((c) => (c.creator.id === creatorId ? { ...c, unreadCount: 0 } : c))
      );
      loadConversations();

      setTimeout(() => {
        const endEl = messagesEndRefs.current[creatorId];
        if (endEl) {
          endEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    } catch (err: any) {
      toast.error(err.message || 'Error sending reply');
      setReplyTexts((prev) => ({ ...prev, [creatorId]: text }));
    } finally {
      setSendingByCreator((prev) => ({ ...prev, [creatorId]: false }));
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesName = c.creator.display_name.toLowerCase().includes(q);
      const matchesEmail = c.creator.email.toLowerCase().includes(q);
      const matchesCountry = (c.creator.country || '').toLowerCase().includes(q);
      if (!matchesName && !matchesEmail && !matchesCountry) return false;
    }

    if (statusFilter === 'UNREAD') return c.unreadCount > 0;
    if (statusFilter === 'APPROVED') return c.creator.sample_status === 'APPROVED';
    if (statusFilter === 'AUDITION') return c.creator.sample_status !== 'APPROVED';

    return true;
  });

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const activeConv = conversations.find((c) => c.creator.id === selectedCreatorId);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 text-black">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-[#9D174D] uppercase">
            PAGE TURNING LIVE SUPPORT
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-black flex items-center gap-2 mt-0.5">
            <span>Page Turning Direct Messages</span>
            {totalUnread > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold font-sans">
                {totalUnread} new
              </span>
            )}
          </h1>
          <p className="text-xs text-neutral-600 mt-1">
            Expand any creator's accordion dropdown below to review conversation history and send direct replies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-neutral-100 rounded-lg p-1 border border-neutral-300">
            <button
              type="button"
              onClick={() => setViewMode('accordion')}
              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors ${
                viewMode === 'accordion' ? 'bg-black text-white shadow-xs' : 'text-neutral-700 hover:text-black'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Accordion View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors ${
                viewMode === 'split' ? 'bg-black text-white shadow-xs' : 'text-neutral-700 hover:text-black'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="px-3 py-2 rounded-lg bg-white border border-neutral-300 text-xs font-bold text-black hover:bg-neutral-100 transition-colors flex items-center gap-1.5"
            title="Refresh conversations and messages"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            href="/admin/submissions"
            className="px-3.5 py-2 rounded-lg bg-white border border-neutral-300 text-xs font-bold text-black hover:bg-neutral-100 transition-colors"
          >
            Submissions
          </Link>
          <div className="text-xs bg-emerald-50 text-emerald-800 font-bold px-3 py-2 rounded-lg border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Chat Active</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-neutral-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creators by name, email, or country..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:border-black bg-neutral-50 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'UNREAD', 'AUDITION', 'APPROVED'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === tab
                  ? 'bg-black text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {tab === 'ALL' && 'All Creators'}
              {tab === 'UNREAD' && `Unread (${totalUnread})`}
              {tab === 'AUDITION' && 'Audition Stage'}
              {tab === 'APPROVED' && 'Verified'}
            </button>
          ))}

          {viewMode === 'accordion' && (
            <div className="flex items-center gap-1 pl-2 border-l border-neutral-200 ml-1">
              <button
                type="button"
                onClick={expandAll}
                className="px-2 py-1 text-[11px] font-bold text-neutral-600 hover:text-black hover:bg-neutral-100 rounded"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2 py-1 text-[11px] font-bold text-neutral-600 hover:text-black hover:bg-neutral-100 rounded"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Accordion View */}
      {viewMode === 'accordion' && (
        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center text-xs text-neutral-500 font-bold bg-white rounded-xl border border-neutral-200">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-neutral-400" />
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-500 font-medium bg-white rounded-xl border border-neutral-200">
              No page-turning conversations found matching your filter.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const creator = conv.creator;
              const isExpanded = Boolean(expandedCreators[creator.id]);
              const msgs = messagesByCreator[creator.id] || [];
              const isLoadingMsgs = Boolean(loadingByCreator[creator.id]);
              const isSending = Boolean(sendingByCreator[creator.id]);
              const replyText = replyTexts[creator.id] || '';
              const hasRealMessages = !conv.lastMessage.id.startsWith('empty-');
              const lastTime = hasRealMessages
                ? new Date(conv.lastMessage.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <div
                  key={creator.id}
                  className={`bg-white rounded-xl border transition-all overflow-hidden ${
                    isExpanded
                      ? 'border-neutral-900 shadow-md ring-1 ring-neutral-900'
                      : 'border-neutral-200 hover:border-neutral-400 shadow-xs'
                  }`}
                >
                  <div
                    onClick={() => toggleAccordion(creator.id)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50/70 transition-colors select-none"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {creator.display_name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-black truncate">
                            {creator.display_name}
                          </span>
                          {creator.sample_status === 'APPROVED' && <VerifiedBadge size={15} />}
                          {creator.sample_status === 'APPROVED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Verified
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Audition Stage
                            </span>
                          )}
                          <span className="text-[11px] text-neutral-500 font-medium">
                            • {creator.country || 'Global'}
                          </span>
                          <span className="text-[11px] text-neutral-400 font-mono hidden sm:inline">
                            ({creator.email})
                          </span>
                        </div>

                        <p className={`text-xs truncate max-w-2xl ${hasRealMessages ? 'text-neutral-800' : 'text-neutral-400 italic'}`}>
                          {hasRealMessages && conv.lastMessage.sender_role === 'ADMIN' && (
                            <span className="font-bold text-neutral-700">You: </span>
                          )}
                          {conv.lastMessage.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {conv.unreadCount > 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs">
                          <span>{conv.unreadCount}</span>
                          <span className="hidden sm:inline">new</span>
                        </span>
                      )}

                      {lastTime && (
                        <span className="text-[11px] font-bold text-neutral-500 hidden sm:inline">
                          {lastTime}
                        </span>
                      )}

                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 text-black text-xs font-bold border border-neutral-300 hover:bg-neutral-200 transition-colors">
                        <span>{isExpanded ? 'Close Chat' : 'View Chat'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-black" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-black" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-neutral-200 bg-neutral-50/50">
                      <div className="px-4 sm:px-6 py-2.5 bg-neutral-100/90 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-semibold text-neutral-600">
                            Email: <strong className="text-black font-mono">{creator.email}</strong>
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-neutral-600">
                            Date Joined: <strong className="text-black">{new Date(creator.created_at).toLocaleDateString()}</strong>
                          </span>
                          <Link
                            href={`/admin/submissions?creatorId=${creator.id}`}
                            className="text-[#9D174D] font-bold hover:underline flex items-center gap-1"
                          >
                            <span>Submissions</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      <div className="p-4 sm:p-6 max-h-[380px] overflow-y-auto space-y-3.5 bg-white">
                        {isLoadingMsgs ? (
                          <div className="p-8 text-center text-xs text-neutral-500 font-bold flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" />
                            <span>Loading conversation history...</span>
                          </div>
                        ) : msgs.length === 0 ? (
                          <div className="p-8 text-center text-xs text-neutral-500">
                            No messages exchanged with {creator.display_name} yet. Send a direct reply below.
                          </div>
                        ) : (
                          msgs.map((m) => {
                            const isAdmin = m.sender_role === 'ADMIN';
                            const msgTime = new Date(m.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            });

                            return (
                              <div
                                key={m.id}
                                className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} space-y-1`}
                              >
                                <div className="text-[10px] text-neutral-500 font-bold px-1">
                                  {isAdmin ? 'Admin Support' : creator.display_name} • {msgTime}
                                </div>
                                <div
                                  className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 text-xs leading-relaxed rounded-2xl ${
                                    isAdmin
                                      ? 'bg-black text-white rounded-br-xs shadow-xs'
                                      : 'bg-neutral-100 text-neutral-900 border border-neutral-200 rounded-bl-xs'
                                  }`}
                                >
                                  {m.message}
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div
                          ref={(el) => {
                            messagesEndRefs.current[creator.id] = el;
                          }}
                        />
                      </div>

                      <form
                        onSubmit={(e) => handleSendReply(creator.id, e)}
                        className="p-3 sm:p-4 bg-neutral-100/70 border-t border-neutral-200 flex items-center gap-2.5"
                      >
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) =>
                            setReplyTexts((prev) => ({ ...prev, [creator.id]: e.target.value }))
                          }
                          placeholder={`Reply directly to ${creator.display_name}...`}
                          className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-black bg-white"
                        />
                        <button
                          type="submit"
                          disabled={isSending || !replyText.trim()}
                          className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-40 transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSending ? 'Sending...' : 'Send'}</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Split View */}
      {viewMode === 'split' && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[640px] shadow-sm">
          <div className="md:col-span-4 border-r border-neutral-200 flex flex-col bg-neutral-50">
            <div className="p-3.5 border-b border-neutral-200 bg-neutral-100/60 font-bold text-xs text-neutral-700 flex items-center justify-between">
              <span>Page Turning Creators ({filteredConversations.length})</span>
              <span className="text-[10px] text-neutral-500">Click to select</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-neutral-200 font-medium max-h-[640px]">
              {loading ? (
                <div className="p-8 text-center text-xs text-black font-medium">Loading conversations...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-black font-medium">No active conversations found.</div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.creator.id === selectedCreatorId;
                  const hasRealMessages = !conv.lastMessage.id.startsWith('empty-');
                  const time = hasRealMessages
                    ? new Date(conv.lastMessage.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  return (
                    <button
                      key={conv.creator.id}
                      type="button"
                      onClick={() => {
                        setSelectedCreatorId(conv.creator.id);
                        loadMessagesForCreator(conv.creator.id, true);
                      }}
                      className={`w-full text-left p-4 transition-colors flex items-start justify-between gap-3 ${
                        isSelected ? 'bg-neutral-200/80 border-l-4 border-black' : 'hover:bg-neutral-100'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-sm text-black truncate flex items-center gap-1">
                            <span>{conv.creator.display_name}</span>
                            {conv.creator.sample_status === 'APPROVED' && <VerifiedBadge size={14} />}
                          </div>
                          {time && <span className="text-[10px] text-neutral-500 font-bold">{time}</span>}
                        </div>
                        <p className={`text-xs truncate ${hasRealMessages ? 'text-black' : 'text-neutral-500 italic'}`}>
                          {hasRealMessages && conv.lastMessage.sender_role === 'ADMIN' ? 'You: ' : ''}
                          {conv.lastMessage.message}
                        </p>
                        <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-neutral-600 font-medium">
                          <span>{conv.creator.country}</span>
                          <span>•</span>
                          <span className="font-bold text-black">
                            {conv.creator.sample_status || 'Audition Pending'}
                          </span>
                        </div>
                      </div>

                      {conv.unreadCount > 0 && (
                        <span className="shrink-0 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="md:col-span-8 flex flex-col h-full bg-white">
            {selectedCreatorId && activeConv ? (
              <>
                <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-black text-white font-bold flex items-center justify-center text-sm">
                      {activeConv.creator.display_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-serif text-lg font-bold text-black flex items-center gap-2">
                        <span>{activeConv.creator.display_name}</span>
                        {activeConv.creator.sample_status === 'APPROVED' && <VerifiedBadge size={18} />}
                      </div>
                      <div className="text-[11px] text-neutral-600 font-mono">
                        {activeConv.creator.email} • {activeConv.creator.country}
                      </div>
                    </div>
                  </div>
                </div>

                <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-neutral-50/40 max-h-[480px]">
                  {(messagesByCreator[selectedCreatorId] || []).length === 0 ? (
                    <div className="p-12 text-center text-neutral-500 text-xs">
                      No messages in this conversation yet. Send a message below.
                    </div>
                  ) : (
                    (messagesByCreator[selectedCreatorId] || []).map((m) => {
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
                          <div className="text-[10px] text-neutral-500 px-1 font-bold">
                            {isAdmin ? 'Admin Support' : activeConv.creator.display_name} • {time}
                          </div>
                          <div
                            className={`max-w-[75%] px-4 py-2.5 text-xs leading-relaxed rounded-2xl ${
                              isAdmin
                                ? 'bg-black text-white rounded-br-xs shadow-xs'
                                : 'bg-white border border-neutral-300 text-black rounded-bl-xs'
                            }`}
                          >
                            {m.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={(el) => { messagesEndRefs.current[selectedCreatorId] = el; }} />
                </div>

                <form
                  onSubmit={(e) => handleSendReply(selectedCreatorId, e)}
                  className="p-4 border-t border-neutral-200 bg-white flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={replyTexts[selectedCreatorId] || ''}
                    onChange={(e) =>
                      setReplyTexts((prev) => ({ ...prev, [selectedCreatorId]: e.target.value }))
                    }
                    placeholder={`Reply to ${activeConv.creator.display_name}...`}
                    className="flex-1 px-4 py-3 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-black bg-white"
                  />
                  <button
                    type="submit"
                    disabled={
                      Boolean(sendingByCreator[selectedCreatorId]) ||
                      !(replyTexts[selectedCreatorId] || '').trim()
                    }
                    className="px-5 py-3 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sendingByCreator[selectedCreatorId] ? 'Sending...' : 'Send'}</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-12 text-center text-neutral-500 font-medium text-xs">
                Select a conversation from the left to begin messaging.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PagesAdminChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-xs font-bold text-neutral-500">
          Loading Page Turning Direct Messages...
        </div>
      }
    >
      <PagesAdminChatContent />
    </Suspense>
  );
}
