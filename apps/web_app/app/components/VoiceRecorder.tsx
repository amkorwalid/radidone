import { Mic, Square } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

interface VoiceRecorderProps {
  onRecord: (blob: Blob) => void;
  isLoading?: boolean;
}

export function VoiceRecorder({ onRecord, isLoading }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        onRecord(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      const errorMessage =
        error instanceof Error && error.name === "NotAllowedError"
          ? "Microphone access denied. Please enable microphone permissions."
          : "Unable to access microphone. Please check your device settings.";
      toast.error(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-4">
      {isRecording ? (
        <>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-red-600 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-300">Recording...</span>
          </div>
          <button
            onClick={stopRecording}
            className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
            title="Stop recording"
          >
            <Square className="h-5 w-5" />
          </button>
        </>
      ) : (
        <button
          onClick={startRecording}
          disabled={isLoading}
          className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Start recording"
        >
          <Mic className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
