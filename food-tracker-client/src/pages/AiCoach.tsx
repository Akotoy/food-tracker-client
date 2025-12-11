import { useState, useRef, useEffect } from "react";
import { Input, Button, Card, CardBody, ScrollShadow, Spinner, Avatar } from "@nextui-org/react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import WebApp from '@twa-dev/sdk';

export default function AiCoach() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: 'Привет! Я твой AI-нутрициолог. Я проанализировал твое питание. Спрашивай, что угодно! 🌱' }
  ]);

  // Автоскролл вниз
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    // Добавляем сообщение юзера
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    
    try {
        const localUser = JSON.parse(localStorage.getItem('user_data') || '{}');
        const userId = localUser.telegram_id || localUser.id;

        // Отправляем на сервер
        const response = await api.post('/api/ai-chat', {
            user_id: userId,
            message: userMsg.content,
            history: messages.slice(-10) // Шлем последние 10 сообщений для контекста
        });

        // Добавляем ответ бота
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
        try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e) {}

    } catch (e) {
        console.error(e);
        setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка связи с мозгом 🧠. Попробуй позже.' }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Шапка */}
      <div className="bg-white p-4 shadow-sm z-10 flex items-center gap-2">
        <Button isIconOnly size="sm" variant="light" onPress={() => navigate('/home')}>←</Button>
        <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-purple-500 to-blue-500 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs">AI</div>
            <span className="font-bold text-gray-800">AI Коуч</span>
        </div>
      </div>

      {/* Дисклеймер */}
      <div className="bg-yellow-50 p-2 text-center border-b border-yellow-100">
        <p className="text-[10px] text-yellow-800 uppercase font-bold tracking-wide">
            ⚠️ Не является медицинской рекомендацией
        </p>
      </div>

      {/* Область сообщений */}
      <ScrollShadow className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
        {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none shadow-sm'
                }`}>
                    {msg.content}
                </div>
            </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-bl-none shadow-sm">
                    <Spinner size="sm" color="default" />
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </ScrollShadow>

      {/* Ввод */}
      <div className="p-3 bg-white border-t border-gray-100 pb-8">
        <div className="flex gap-2">
            <Input 
                placeholder="Спроси совета..." 
                value={input} 
                onValueChange={setInput} 
                radius="lg"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button isIconOnly color="primary" radius="lg" onPress={handleSend} isLoading={isLoading}>
                ➤
            </Button>
        </div>
      </div>
    </div>
  );
}