import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Bot, 
  User, 
  Camera, 
  ExternalLink,
  Sparkles,
  Loader2
} from 'lucide-react';
import { TelegramBotStatus } from '../types.ts';

interface TelegramSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  botStatus: TelegramBotStatus | null;
  onExpenseAdded: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  imagePreview?: string;
  buttons?: Array<{ text: string; action: string }>;
}

export const TelegramSimulatorModal: React.FC<TelegramSimulatorModalProps> = ({
  isOpen,
  onClose,
  botStatus,
  onExpenseAdded,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-init',
      sender: 'bot',
      text: '👋 Привет! Я твой персональный трекер расходов в Telegram 🤖.\n\nЗапиши расход одним сообщением без регистрации:\n• `кофе 350`\n• `такси 900 работа`\n• `продукты 1850 супермаркет`\n• `50$ ужин` (мультивалютность)\n• `50 нону шир` / `150 алиф`\n\n📸 Или отправь фото чека (Alif mobi, DC Next, супермаркеты, АЗС) — сумма и категория распознаются автоматически с помощью ИИ!\n\n⚡ Команды: /today, /week, /month, /last, /delete, /panel, /limits',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      time,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/telegram-sim/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: data.reply || 'Паём коркард шуд',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      onExpenseAdded(); // Trigger dashboard refresh!
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: '⚠️ Ҳангоми фиристодани паём хатогӣ рӯй дод.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          sender: 'user',
          text: '📷 [Акси чек фиристода шуд]',
          imagePreview: base64,
          time,
        },
      ]);

      setIsLoading(true);

      try {
        const response = await fetch('/api/telegram-sim/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoBase64: base64 }),
        });

        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            sender: 'bot',
            text: data.reply || 'Чек коркард шуд',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        onExpenseAdded();
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const quickPrompts = [
    'қаҳва 25',
    'хӯрокворӣ 120',
    'такси 20 кор',
    'кофе 350',
    'coffee $5',
    '/today',
    '/month',
    '/limits',
  ];

  return (
    <div 
      id="telegram-simulator-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div 
        id="telegram-simulator-modal"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[620px] max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="bg-[#517da2] text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm leading-tight">
                  ExpenseBot Telegram
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              <p className="text-xs text-white/80">
                {botStatus?.botUsername ? `@${botStatus.botUsername}` : 'Ёрдамчии хароҷот (TJ / RU / EN ➔ TJ)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {botStatus?.botUrl && (
              <a
                href={botStatus.botUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Открыть в настоящем приложении Telegram"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              id="close-telegram-sim-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telegram Chat Wallpaper Area */}
        <div 
          id="telegram-chat-messages"
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e4e9ed] text-slate-800"
          style={{
            backgroundImage: 'radial-gradient(#d3dbe2 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        >
          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isBot ? 'justify-start' : 'justify-end'}`}
              >
                {isBot && (
                  <div className="w-7 h-7 rounded-full bg-[#517da2] text-white flex items-center justify-center shrink-0 self-end mb-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${
                    isBot
                      ? 'bg-white text-slate-800 rounded-bl-xs'
                      : 'bg-[#e3f2fd] text-slate-900 rounded-br-xs'
                  }`}
                >
                  {msg.imagePreview && (
                    <img
                      src={msg.imagePreview}
                      alt="Чек"
                      className="max-h-40 rounded-lg mb-2 object-cover"
                    />
                  )}
                  <div>{msg.text}</div>
                  <div className="text-[10px] text-slate-400 text-right mt-1">
                    {msg.time}
                  </div>
                </div>

                {!isBot && (
                  <div className="w-7 h-7 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 self-end mb-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-2 justify-start items-center">
              <div className="w-7 h-7 rounded-full bg-[#517da2] text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white rounded-2xl px-4 py-2 text-xs text-slate-500 shadow-xs flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#517da2]" />
                <span>Бот фикр карда истодааст...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-slate-100 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <span className="text-[11px] font-semibold text-slate-500 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Мисолҳо:
          </span>
          {quickPrompts.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={isLoading}
              className="text-[11px] font-medium bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 px-2 py-1 rounded-md border border-slate-200 shrink-0 transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0 flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          <button
            id="sim-upload-photo-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-[#517da2] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            title="Фиристодани акси чек"
          >
            <Camera className="w-5 h-5" />
          </button>

          <input
            id="sim-message-input"
            type="text"
            placeholder="«қаҳва 25», «кофе 350» ё «coffee $5» нависед..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={isLoading}
            className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#517da2] transition-all"
          />

          <button
            id="sim-send-message-btn"
            onClick={() => sendMessage()}
            disabled={isLoading || !inputText.trim()}
            className="p-2 bg-[#517da2] hover:bg-[#436785] disabled:opacity-40 text-white rounded-full transition-colors cursor-pointer"
            title="Отправить сообщение"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
