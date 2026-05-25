import { MdMessage, MdPerson } from "react-icons/md";

interface ChatMessageProps {
  message: string;
  sender: "mentor" | "student";
  timestamp?: string;
  isLoading?: boolean;
}

export function ChatMessage({
  message,
  sender,
  timestamp,
  isLoading,
}: ChatMessageProps) {
  const isMentor = sender === "mentor";

  return (
    <div className={`flex ${isMentor ? "justify-start" : "justify-end"} mb-4`}>
      <div
        className={`flex gap-2 max-w-xs ${
          isMentor ? "flex-row" : "flex-row-reverse"
        }`}
      >
        <div
          className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
            isMentor ? "bg-blue-600" : "bg-green-600"
          }`}
        >
          {isMentor ? (
            <MdMessage className="h-4 w-4 text-white" />
          ) : (
            <MdPerson className="h-4 w-4 text-white" />
          )}
        </div>
        <div className={`flex flex-col ${isMentor ? "items-start" : "items-end"}`}>
          <div
            className={`px-4 py-2 rounded-lg ${
              isMentor
                ? "bg-blue-600 text-white"
                : "bg-green-600 text-white"
            }`}
          >
            {isLoading ? (
              <div className="flex gap-1">
                <div className="h-2 w-2 bg-white rounded-full animate-bounce"></div>
                <div className="h-2 w-2 bg-white rounded-full animate-bounce delay-100"></div>
                <div className="h-2 w-2 bg-white rounded-full animate-bounce delay-200"></div>
              </div>
            ) : (
              <p className="text-sm">{message}</p>
            )}
          </div>
          {timestamp && (
            <span className="text-xs text-gray-400 mt-1">{timestamp}</span>
          )}
        </div>
      </div>
    </div>
  );
}
