/**
 * 右侧悬空聊天面板
 * - 半圆触发器嵌在右壁/面板左侧，图标随开关态翻转
 * - 面板全高悬浮覆盖主内容，不挤压布局
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { ChevronsLeft, ChevronsRight, Send, X, Trash2 } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface Message {
  id: number;
  sender: "doctor" | "patient";
  text: string;
  time: string;
}

interface ChatPanelProps {
  patientName: string;
  patientId: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const MOCK_MESSAGES: Message[] = [
  { id: 1, sender: "doctor", text: "您好，最近康复训练感觉怎么样？", time: "10:30" },
  { id: 2, sender: "patient", text: "好一些了，每天坚持做呼吸训练", time: "10:32" },
  { id: 3, sender: "doctor", text: "很好，继续保持。有什么不舒服随时跟我说。", time: "10:33" },
  { id: 4, sender: "patient", text: "好的，谢谢医生！", time: "10:34" },
];

export default function ChatPanel({ patientName, patientId, open: controlledOpen, onOpenChange }: ChatPanelProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(true);
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem("chat-panel-width");
    return saved ? parseInt(saved, 10) : 400;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // 滚动到底部
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // 拖拽调宽
  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startWidth: panelWidth };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [panelWidth],
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const newWidth = Math.max(320, Math.min(700, dragRef.current.startWidth - (e.clientX - dragRef.current.startX)));
      setPanelWidth(newWidth);
      localStorage.setItem("chat-panel-width", String(newWidth));
    };
    const handleUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const newMsg: Message = {
      id: Date.now(),
      sender: "doctor",
      text: inputText.trim(),
      time,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearMessages = () => {
    setShowConfirmClear(true);
  };

  const handleConfirmClear = () => {
    setMessages([]);
    setShowConfirmClear(false);
  };

  return (
    <>
      {/* ===== 面板 ===== */}
      <div
        className={`fixed top-0 right-0 h-full z-50 bg-white border-l border-[#D9E2EC] shadow-[-4px_0_24px_rgba(0,0,0,0.08)] flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: panelWidth }}
      >
        {/* 拖拽手柄（左边缘） */}
        <div
          onMouseDown={startDrag}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#2F5D7C]/20 active:bg-[#2F5D7C]/30 transition-colors z-10"
        />

        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E7EDF3] shrink-0">
          <div>
            <p className="text-sm font-semibold text-[#243447]">{patientName}</p>
            <p className="text-[10px] text-[#8A97A6]">患者 ID: {patientId}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearMessages}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-[#8A97A6] hover:bg-[#FDE8E8] hover:text-[#D95C5C] transition-colors cursor-pointer"
              title="清除消息记录"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-[#8A97A6] hover:bg-[#F4F7FA] hover:text-[#243447] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {showConfirmClear && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[#FDF2F2] border border-[#F8D2D2] px-3 py-2.5">
              <span className="text-sm font-medium text-[#D95C5C]">确定清除所有聊天记录？</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(false)}
                  className="rounded-md border border-[#D9E2EC] px-3 py-1 text-xs font-medium text-[#5B6B7A] hover:bg-[#F4F7FA] transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  className="rounded-md bg-[#D95C5C] px-3 py-1 text-xs font-medium text-white hover:bg-[#C94A4A] transition-colors cursor-pointer"
                >
                  确认清除
                </button>
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "doctor" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.sender === "doctor"
                    ? "bg-[#2F5D7C] text-white rounded-br-md"
                    : "bg-[#F4F7FA] text-[#243447] border border-[#E7EDF3] rounded-bl-md"
                }`}
              >
                <p>{msg.text}</p>
                <p
                  className={`mt-1 text-right text-[10px] ${
                    msg.sender === "doctor" ? "text-white/60" : "text-[#8A97A6]"
                  }`}
                >
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <div className="px-4 py-3 border-t border-[#E7EDF3] bg-[#F8FAFC] shrink-0">
          <div className="flex items-center gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息..."
              className="flex-1 bg-white border-[#D9E2EC] text-sm py-2 h-9 rounded-lg focus-visible:border-[#2F5D7C]"
            />
            <Button
              onClick={handleSend}
              size="sm"
              disabled={!inputText.trim()}
              className="h-9 px-3 bg-[#2F5D7C] hover:bg-[#4F7A94] text-white rounded-lg"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ===== 触发器按钮（嵌在面板左侧/右壁） ===== */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`fixed z-[51] flex items-center justify-center w-7 h-16 bg-white border border-[#D9E2EC] shadow-md hover:bg-[#F4F7FA] transition-all duration-300 cursor-pointer ${
          open ? "rounded-r-full" : "rounded-l-full"
        }`}
        style={{
          top: "50%",
          transform: "translateY(-50%)",
          right: open ? panelWidth - 28 : 0,
        }}
      >
        {open ? (
          <ChevronsRight className="h-4 w-4 text-[#5B6B7A]" />
        ) : (
          <ChevronsLeft className="h-4 w-4 text-[#5B6B7A]" />
        )}
      </button>
    </>
  );
}