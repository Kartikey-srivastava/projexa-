import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  CheckCircle2,
  Droplets,
  Layers,
  ArrowRight,
  HelpCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { ZoneInfo, SensorReading, ChatMessage } from '../../types';
import { api } from '../../services/api';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedZone: ZoneInfo;
  currentReading?: SensorReading;
  activeAlertCount: number;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  selectedZone,
  currentReading,
  activeAlertCount,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello Farmer! I am your **AI Agronomist Assistant**, actively synchronized with **${selectedZone.name}** (${selectedZone.crop}). How can I assist you with yield forecasts, irrigation schedules, or fertilizer tuning today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = [
    `Why did my predicted yield drop in ${selectedZone.crop}?`,
    `How much should I irrigate ${selectedZone.name.split('-')[0]} today?`,
    `What fertilizer ratio does my soil need right now?`,
    `Explain the SHAP impact on my crop yield.`,
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (messageText: string) => {
    const textToSend = messageText.trim();
    if (!textToSend || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const res = await api.askAssistant({
        zone_id: selectedZone.id,
        message: textToSend,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        key_factors: res.key_factors,
        suggested_actions: res.suggested_actions,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Apologies, I encountered a connection glitch. Here is a localized assessment for ${selectedZone.name}: Moisture is ${currentReading?.soil_moisture.toFixed(1) || 50}%, Temperature is ${currentReading?.air_temperature.toFixed(1) || 24}°C. Maintain optimal irrigation to safeguard yield.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/30 backdrop-blur-xs transition-opacity animate-fadeIn">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-800 to-emerald-700 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight">AI Farm Assistant</h3>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-emerald-200">
                Context: {selectedZone.name} ({selectedZone.crop})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Context Capsule */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-2 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-blue-600" />
              {currentReading ? `${currentReading.soil_moisture.toFixed(1)}%` : '--'}
            </span>
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              pH {currentReading ? currentReading.soil_ph.toFixed(1) : '--'}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Alerts: <strong className={activeAlertCount > 0 ? 'text-rose-600' : 'text-emerald-600'}>{activeAlertCount}</strong>
          </span>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-emerald-700 text-white rounded-br-none shadow-xs'
                    : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/60'
                }`}
              >
                {/* Simple Markdown Rendering */}
                <div className="space-y-1.5 whitespace-pre-line">
                  {msg.content.split('\n').map((line, idx) => {
                    // Check bold
                    let formatted = line;
                    return <p key={idx}>{formatted}</p>;
                  })}
                </div>

                {/* Key Factors Chips */}
                {msg.key_factors && msg.key_factors.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Core Agronomic Factors:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {msg.key_factors.map((factor, fi) => (
                        <span
                          key={fi}
                          className="text-[10px] bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Action Chips */}
                {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                      Recommended Field Action:
                    </span>
                    {msg.suggested_actions.map((act, ai) => (
                      <div
                        key={ai}
                        className="flex items-start gap-1.5 text-[11px] text-emerald-900 font-semibold bg-emerald-50 border border-emerald-200 p-1.5 rounded-lg"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-2xl w-fit">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
              <span>Analyzing live telemetry and SHAP vectors...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 overflow-x-auto">
          <div className="flex gap-2">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={isThinking}
                className="shrink-0 text-[11px] font-medium text-slate-700 bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 hover:border-emerald-200 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Field */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask AI about ${selectedZone.crop} in ${selectedZone.name.split('-')[0]}...`}
              className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-emerald-600 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="p-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
