'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { ChatMessage } from '@/types';
import { useToast } from '@/components/ToastProvider';

export default function AdminChatDrawer() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // Persisted across reloads — once a message ID is seen, never toast it again
  const lastSeenIdRef = useRef<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('pages_chat_last_seen_id') : null
  );
  const maraJoinedRef = useRef(false);
  const maraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const drawerContainerRef = useRef<HTMLDivElement>(null);
  const prevDrawerOpenRef = useRef<boolean>(false);
  const prevMsgCountRef = useRef<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.user || null))
      .catch(() => setCurrentUser(null));
  }, []);

  // Poll for messages when open or every 8s when closed for unread alerts
  useEffect(() => {
    if (!currentUser || currentUser.role === 'ADMIN') return;

    const fetchChat = () => {
      fetch('/api/chat')
        .then((r) => r.json())
        .then((data) => {
          if (data.messages) {
            setMessages((prev) => {
              // Avoid triggering re-renders if messages haven't changed
              if (
                prev.length === data.messages.length &&
                prev[prev.length - 1]?.id === data.messages[data.messages.length - 1]?.id
              ) {
                return prev;
              }
              return data.messages;
            });

            // Calculate unread admin messages
            const unread = data.messages.filter((m: ChatMessage) => m.sender_role === 'ADMIN' && !m.is_read).length;
            setUnreadCount(unread);

            // Only toast if this is a genuinely new admin message never seen before
            if (data.messages.length > 0) {
              const last = data.messages[data.messages.length - 1];
              if (
                last.sender_role === 'ADMIN' &&
                !last.is_read &&
                last.id !== lastSeenIdRef.current &&
                !isOpen
              ) {
                toast.info(`Mara: "${last.message.substring(0, 45)}..."`, 'New Support Message');
                // Persist — never show this toast again after reload
                lastSeenIdRef.current = last.id;
                localStorage.setItem('pages_chat_last_seen_id', last.id);
              }
            }
          }
        })
        .catch(() => {});
    };

    fetchChat();
    const interval = setInterval(fetchChat, isOpen ? 3000 : 8000);
    return () => clearInterval(interval);
  }, [currentUser, isOpen, toast]);

  // When drawer opens, mark all current messages as seen so they never toast again
  useEffect(() => {
    if (!isOpen || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.id !== lastSeenIdRef.current) {
      lastSeenIdRef.current = last.id;
      localStorage.setItem('pages_chat_last_seen_id', last.id);
    }
  }, [isOpen, messages]);

  // Listen for external trigger (e.g. from notifications page)
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, []);

  // When chat opens for the first time, show Mara's greeting after 30s
  useEffect(() => {
    if (!isOpen || maraJoinedRef.current) return;

    maraTimerRef.current = setTimeout(() => {
      maraJoinedRef.current = true;
      const greeting: ChatMessage = {
        id: `mara-greeting-${Date.now()}`,
        creator_id: '',
        sender_id: 'mara',
        sender_name: 'Mara',
        message: "Hi! I'm Mara from The Pink Room support team 👋 How can I help you today with your page-turning videos?",
        sender_role: 'ADMIN',
        is_read: true,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, greeting]);
    }, 30000);

    return () => {
      if (maraTimerRef.current) clearTimeout(maraTimerRef.current);
    };
  }, [isOpen]);

  // Handle controlled scrolling inside the drawer container without page jumping
  useEffect(() => {
    if (!isOpen) {
      prevDrawerOpenRef.current = false;
      return;
    }

    const container = drawerContainerRef.current;
    if (!container) return;

    // Just opened drawer: jump directly to bottom
    if (!prevDrawerOpenRef.current) {
      prevDrawerOpenRef.current = true;
      prevMsgCountRef.current = messages.length;
      container.scrollTop = container.scrollHeight;
      return;
    }

    // New messages arrived during polling
    if (messages.length > prevMsgCountRef.current) {
      prevMsgCountRef.current = messages.length;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      setMessages((prev) => [...prev, data.chatMessage]);

      // Scroll to bottom when user sends
      setTimeout(() => {
        if (drawerContainerRef.current) {
          drawerContainerRef.current.scrollTo({ top: drawerContainerRef.current.scrollHeight, behavior: 'smooth' });
        }
      }, 50);
    } catch (err: any) {
      toast.error(err.message || 'Error sending message', 'Chat Error');
    } finally {
      setSending(false);
    }
  };

  // Only show floating creator chat drawer if logged in as a Creator
  if (!currentUser || currentUser.role !== 'CREATOR') return null;

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-30">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex items-center gap-2.5 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full bg-[#fb1e4b] hover:bg-[#e0153f] text-white shadow-lg transition-all duration-200 group border border-[#fb1e4b]/40"
          title="Chat with Admin Support"
        >
          <MessageSquare className="w-5 h-5 text-white" />
          <span className="text-xs font-semibold hidden sm:inline">Support Chat</span>
          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-neutral-900 text-[10px] font-extrabold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div data-chat-container="true" className="chat-container fixed bottom-36 sm:bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-full max-w-sm sm:max-w-md bg-white !rounded-none rounded-none border border-neutral-200 shadow-xl overflow-hidden flex flex-col h-[480px] max-h-[calc(100vh-160px)] text-black">
          {/* Header */}
          <div className="bg-neutral-900 text-white p-4 flex items-center justify-between !rounded-none">
            <div className="flex items-center gap-3">
              <div data-avatar="true" className="relative w-9 h-9">
                <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 text-white flex items-center justify-center text-sm font-bold">
                  M
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-neutral-900" />
              </div>
              <div>
                <div className="font-serif text-sm font-bold text-white">
                  <span className="!text-white text-white">Mara</span>
                </div>
                <div className="text-[11px] !text-white text-white font-medium opacity-90">Support Desk • Page Turning</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-white/80 hover:text-white rounded-none hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message History */}
          <div ref={drawerContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-neutral-50">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-neutral-600 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto opacity-50 text-neutral-800" />
                <div className="text-xs">No messages yet. Send a question below to reach an administrator!</div>
              </div>
            ) : (
              messages.map((m) => {
                const isAdmin = m.sender_role === 'ADMIN';
                const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'} space-y-1`}
                  >
                    <div className="text-[10px] text-neutral-500 px-1 font-medium">
                      {isAdmin ? 'Mara' : 'You'} • {time}
                    </div>
                    <div
                      data-message-bubble={isAdmin ? 'admin' : 'user'}
                      className={`chat-bubble max-w-[82%] px-3.5 py-2.5 text-xs leading-relaxed shadow-sm !rounded-none rounded-none ${
                        isAdmin
                          ? 'bg-white border border-neutral-200 text-neutral-900'
                          : 'bg-neutral-900 text-white'
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

          {/* Compose Box */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-neutral-200 flex items-center gap-2 !rounded-none">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask about audition, book sounds guidelines, or payouts..."
              data-chat-input="true"
              className="chat-input flex-1 px-3.5 py-2.5 text-xs !rounded-none rounded-none border border-neutral-300 focus:outline-none focus:border-neutral-900 bg-neutral-50/50 text-black placeholder:text-neutral-500"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="p-2.5 !rounded-none rounded-none bg-neutral-900 text-white hover:bg-black disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
