"use client"

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from "@/components/auth-guard"
import { apiClient, Order } from '@/lib/api'

interface Message {
  id: string
  type: string
  direction: 'in' | 'out'
  content: {
    text?: string
    [key: string]: any
  }
  author_id: string
  created: string
  read: boolean
  is_read?: boolean
}

function AvitoChatContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatData, setChatData] = useState<any>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = (instant = false) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: instant ? 'auto' : 'smooth',
        block: 'end'
      })
    }, 100)
  }

  useEffect(() => {
    loadChat()
  }, [resolvedParams.id])

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(isInitialLoad)
      if (isInitialLoad) {
        setIsInitialLoad(false)
      }
    }
  }, [messages])

  const loadChat = async () => {
    try {
      setLoading(true)
      setError(null)

      // Получаем данные заказа
      const orderData = await apiClient.getOrder(Number(resolvedParams.id))
      setOrder(orderData)

      // Получаем данные чата заказа
      const chatInfo = await apiClient.getOrderAvitoChat(Number(resolvedParams.id))
      
      if (!chatInfo) {
        setError('У этого заказа нет чата Авито')
        return
      }

      setChatData(chatInfo)

      // Загружаем сообщения
      const msgs = await apiClient.getAvitoMessages(
        chatInfo.chatId,
        chatInfo.avitoAccountName,
        100
      )

      // Проверяем что msgs это массив
      const messagesArray = Array.isArray(msgs) ? msgs : []

      // Сортируем по времени (старые сверху)
      const sortedMessages = messagesArray.sort((a: Message, b: Message) => 
        Number(a.created) - Number(b.created)
      )

      setMessages(sortedMessages)

      // Отмечаем чат как прочитанный
      await apiClient.markAvitoChatAsRead(chatInfo.chatId, chatInfo.avitoAccountName)

    } catch (err) {
      console.error('Error loading chat:', err)
      setError(err instanceof Error ? err.message : 'Ошибка загрузки чата')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatData || sending) return

    try {
      setSending(true)

      await apiClient.sendAvitoMessage(
        chatData.chatId,
        newMessage.trim(),
        chatData.avitoAccountName
      )

      setNewMessage('')
      
      // Перезагружаем сообщения
      await loadChat()

    } catch (err) {
      console.error('Error sending message:', err)
      alert(err instanceof Error ? err.message : 'Ошибка отправки сообщения')
    } finally {
      setSending(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-2 sm:px-4 py-8">
          <div className="text-center py-8 animate-fade-in">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-700 text-lg">Загрузка чата...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !chatData) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-2 sm:px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 animate-slide-in-left">
            <p className="text-red-600">{error || 'Чат не найден'}</p>
          </div>
          <button
            onClick={() => router.push(`/orders/${resolvedParams.id}`)}
            className="px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md font-medium"
          >
            ← Назад к заказу
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8 max-w-6xl">
        {/* Заголовок с информацией о заказе */}
        <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-8 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl mb-6 animate-fade-in" style={{borderColor: '#114643'}}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 animate-slide-down">Чат Авито</h1>
            <button
              onClick={() => router.push(`/orders/${resolvedParams.id}`)}
              className="px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md font-medium"
            >
              ← Назад к заказу
            </button>
          </div>
          
          {/* Информация о заказе */}
          {order && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 font-medium">Заказ №:</span>
                <span className="ml-2 text-gray-800">{order.id}</span>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Адрес:</span>
                <span className="ml-2 text-gray-800">{order.address || 'Не указан'}</span>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Направление:</span>
                <span className="ml-2 text-gray-800">{order.typeEquipment || 'Не указано'}</span>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Имя аккаунта авито:</span>
                <span className="ml-2 text-gray-800">{chatData.avitoAccountName}</span>
              </div>
            </div>
          )}
        </div>

        {/* Сообщения */}
        <div className="backdrop-blur-lg shadow-2xl rounded-2xl border bg-white/95 overflow-hidden flex flex-col animate-slide-in-left" style={{height: 'calc(100vh - 340px)', borderColor: '#114643'}}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Нет сообщений в этом чате
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 shadow-md ${
                      msg.direction === 'out'
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {msg.content.text || '[Не текстовое сообщение]'}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.direction === 'out' ? 'text-teal-100' : 'text-gray-500'
                      }`}
                    >
                      {formatTimestamp(msg.created)}
                      {msg.direction === 'out' && msg.is_read && ' • Прочитано'}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Поле ввода */}
          <div className="border-t p-4" style={{borderColor: '#114643'}}>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Введите сообщение..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                disabled={sending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {sending ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AvitoChatPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AuthGuard>
      <AvitoChatContent params={params} />
    </AuthGuard>
  )
}

