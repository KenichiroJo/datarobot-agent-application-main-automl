import { useState, useRef, useEffect, FormEvent, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { createAgent } from '@/lib/agent';
import type { HttpAgent } from '@ag-ui/client';
import type {
  TextMessageStartEvent,
  TextMessageContentEvent,
  RunErrorEvent,
} from '@ag-ui/core';
import type { AgentSubscriberParams } from '@ag-ui/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function InlineChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const agentRef = useRef<HttpAgent | null>(null);
  const threadIdRef = useRef(uuid());
  const bufferRef = useRef('');

  useEffect(() => {
    agentRef.current = createAgent({ threadId: threadIdRef.current });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isRunning) return;

      const userMsg: Message = { id: uuid(), role: 'user', content: text };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsRunning(true);
      bufferRef.current = '';

      // Create a fresh agent per message
      const agent = createAgent({ threadId: threadIdRef.current });
      agentRef.current = agent;
      agent.messages = [{ id: uuid(), role: 'user', content: text }];

      const assistantId = uuid();

      const { unsubscribe } = agent.subscribe({
        onTextMessageStartEvent(_params: { event: TextMessageStartEvent } & AgentSubscriberParams) {
          bufferRef.current = '';
          setMessages((prev) => [
            ...prev,
            { id: assistantId, role: 'assistant', content: '' },
          ]);
        },
        onTextMessageContentEvent(
          params: { event: TextMessageContentEvent; textMessageBuffer: string } & AgentSubscriberParams,
        ) {
          bufferRef.current = params.textMessageBuffer;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: params.textMessageBuffer } : m,
            ),
          );
        },
        onTextMessageEndEvent() {
          // Final update already applied by content events
        },
        onRunFinishedEvent() {
          unsubscribe();
          setIsRunning(false);
        },
        onRunErrorEvent(params: { event: RunErrorEvent } & AgentSubscriberParams) {
          unsubscribe();
          setIsRunning(false);
          if (params.event.rawEvent?.name === 'AbortError') return;
          setMessages((prev) => [
            ...prev,
            {
              id: uuid(),
              role: 'assistant',
              content: `エラーが発生しました: ${params.event.message}`,
            },
          ]);
        },
      });

      try {
        await agent.runAgent({ tools: [] });
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error(err);
        setIsRunning(false);
      }
    },
    [isRunning],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-muted/30 border-b border-border hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">AI アシスタント</span>
          <span className="text-xs text-muted-foreground">— モデルについて質問できます</span>
        </div>
        {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {!isCollapsed && (
        <div className="flex flex-col h-80">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground mt-6">
                <p>モデルや予測結果について質問してください</p>
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {[
                    'このモデルの精度を教えて',
                    '最も重要な特徴量は？',
                    'ROC曲線の解釈を教えて',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:border-primary/30 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {isRunning && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-border p-3 flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              rows={1}
              className="flex-1 rounded-xl bg-muted px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              disabled={isRunning}
            />
            <button
              type="submit"
              disabled={!input.trim() || isRunning}
              className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
