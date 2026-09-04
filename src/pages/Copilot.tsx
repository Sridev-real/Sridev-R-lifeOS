import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  Sparkles,
  Send,
  RefreshCw,
  Paperclip,
  Camera,
  Mic,
  MicOff,
  X,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLifeOS } from '../context/LifeOSContext';
import { NavTab } from '../components/layout/Sidebar';
import { CopilotAttachment } from '../types';
import { OnePlaceExecutionModal, ExecutionPayload } from '../components/execution/OnePlaceExecutionModal';

interface CopilotProps {
  onNavigate: (tab: NavTab) => void;
}

export const Copilot: React.FC<CopilotProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const {
    copilotMessages,
    isCopilotLoading,
    sendCopilotMessage,
    clearCopilotChat
  } = useLifeOS();

  const [input, setInput] = useState<string>('');
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [executionPayload, setExecutionPayload] = useState<ExecutionPayload | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const SUGGESTED_PROMPTS = [
    'What should I do today?',
    'Explain this document',
    'Help me claim insurance',
    'Find what I\'m missing'
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [copilotMessages, isCopilotLoading]);

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          data: reader.result as string
        }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Microphone Speech-to-Text
  const toggleMicrophone = () => {
    setMediaError(null);

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setMediaError('Voice input is not supported by this browser. Try Chrome or another supported browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setMediaError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        setIsRecording(false);
        const errType = event.error;
        if (errType === 'not-allowed' || errType === 'permission-denied' || errType === 'service-not-allowed') {
          setMediaError('Microphone access was denied. Allow microphone access for LIFEOS in your browser settings and try again.');
        } else if (errType === 'no-speech') {
          setMediaError('No speech detected. Try again.');
        } else if (errType === 'audio-capture') {
          setMediaError('No microphone was found. Ensure your microphone is connected.');
        } else if (errType === 'network') {
          setMediaError('Network error occurred during speech recognition.');
        } else if (errType !== 'aborted') {
          setMediaError(`Voice input error: ${errType}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognition.start();
    } catch (err: any) {
      console.error('Speech recognition start failed:', err);
      setIsRecording(false);
      recognitionRef.current = null;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMediaError('Microphone access was denied. Allow microphone access for LIFEOS in your browser settings and try again.');
      } else {
        setMediaError('Voice input is not supported by this browser. Try Chrome or another supported browser.');
      }
    }
  };

  // Handle Camera Capture with desktop live stream or mobile fallback
  const startCamera = async () => {
    setMediaError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (mobileCameraInputRef.current) {
        mobileCameraInputRef.current.click();
        return;
      }
      setMediaError('Camera is not supported on this browser or device.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setCameraStream(stream);
      setShowCamera(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMediaError('Camera permission is required to take a photo.');
      } else {
        if (mobileCameraInputRef.current) {
          mobileCameraInputRef.current.click();
          return;
        }
        setMediaError('Camera is not supported or device is unavailable.');
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setAttachments(prev => [...prev, {
        name: `Camera_Capture_${new Date().toISOString().slice(0, 10)}.jpg`,
        type: 'image/jpeg',
        size: Math.round(dataUrl.length * 0.75),
        data: dataUrl
      }]);
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isCopilotLoading) return;
    const msg = input.trim();
    const atts = [...attachments];
    setInput('');
    setAttachments([]);
    await sendCopilotMessage(msg || 'Please analyze these attached documents/photos.', atts);
  };

  const handlePromptClick = async (promptText: string) => {
    if (isCopilotLoading) return;
    await sendCopilotMessage(promptText);
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto flex flex-col h-[calc(100vh-130px)] min-h-[500px]">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt"
        className="hidden"
      />

      {/* Hidden mobile camera input */}
      <input
        type="file"
        ref={mobileCameraInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Camera Modal Preview */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-4 space-y-4 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                <span>Take Document or Form Photo</span>
              </h3>
              <button
                type="button"
                onClick={stopCamera}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Ask LIFEOS
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Understand documents, solve problems, prepare applications, or ask anything with multimodal AI.
          </p>
        </div>

        <button
          type="button"
          onClick={clearCopilotChat}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
          title="Reset conversation"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Main Chat Box */}
      <div className="flex-1 min-h-0 bg-white dark:bg-[#111726] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {copilotMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-2xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                  isUser
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-indigo-600 text-white shadow-xs'
                }`}>
                  {isUser ? (user?.displayName?.slice(0, 1) || 'U') : 'L'}
                </div>

                <div className={`space-y-1.5 ${isUser ? 'items-end text-right' : 'items-start'}`}>
                  <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-tr-xs shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs'
                  }`}>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {msg.attachments.map((att, i) => (
                          <div key={i} className="flex items-center gap-1 bg-black/20 dark:bg-white/10 px-2 py-1 rounded-lg text-[11px] font-mono">
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[120px]">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="space-y-2 [&_h3]:font-bold [&_h3]:text-indigo-600 dark:[&_h3]:text-indigo-400 [&_h3]:text-xs sm:[&_h3]:text-sm [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:space-y-1 [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-white">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    )}
                  </div>

                  {!isUser && msg.executionPayload && (
                    <div className="pt-2">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Action Ready: {msg.executionPayload.title || 'Execute workflow'}</span>
                        </div>
                        <button 
                          onClick={() => setExecutionPayload(msg.executionPayload)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm"
                        >
                          Review & Execute
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1">
                      {msg.suggestedActions.map((action, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handlePromptClick(action)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-900/60"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 font-mono block px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}

          {isCopilotLoading && (
            <div className="flex gap-2.5 max-w-2xl mr-auto">
              <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                <span>LIFEOS is evaluating your profile, Vault, and documents...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Media Error / Permission Notice */}
        {mediaError && (
          <div className="mx-3 my-1.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{mediaError}</span>
            </div>
            <button
              type="button"
              onClick={() => setMediaError(null)}
              className="text-amber-700 dark:text-amber-400 hover:text-amber-950 dark:hover:text-white font-bold ml-2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick Prompts */}
        <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
            Try:
          </span>
          {SUGGESTED_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePromptClick(p)}
              disabled={isCopilotLoading}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-slate-500">Attachments ({attachments.length}):</span>
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-xs text-slate-700 dark:text-slate-300">
                <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate max-w-[140px] font-mono">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="text-slate-400 hover:text-rose-500 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Form with Multimodal Controls [Upload] [Camera] [Mic] */}
        <form onSubmit={handleSend} className="p-3 bg-white dark:bg-[#111726] border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            {/* Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Upload document or PDF"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Camera Button */}
            <button
              type="button"
              onClick={startCamera}
              className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Take photo using camera"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Mic Button */}
            <button
              type="button"
              onClick={toggleMicrophone}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isRecording ? 'Listening... Click to stop' : 'Speak using microphone'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isCopilotLoading}
            placeholder={isRecording ? 'Listening to your voice...' : 'Ask a question or upload document/photo...'}
            className={`flex-1 bg-slate-50 dark:bg-slate-900 border rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 ${
              isRecording ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200/80 dark:border-slate-700'
            }`}
          />

          <button
            type="submit"
            disabled={(!input.trim() && attachments.length === 0) || isCopilotLoading}
            className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </div>
  );
};

