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
        <div className={`flex flex-col ${isMentor ? "items-start" : "items-end"}`}>
          <div
            className={`px-4 py-2 rounded-lg ${
              isMentor
                ? "bg-black text-white"
                : "bg-gray-200 text-black"
            }`}
          >
            {isLoading ? (
              <div className="flex gap-1">
                <div className="h-1 w-1 bg-white rounded-full animate-bounce"></div>
                <div className="h-1 w-1 bg-white rounded-full animate-bounce delay-100"></div>
                <div className="h-1 w-1 bg-white rounded-full animate-bounce delay-200"></div>
              </div>
            ) : (
              <p className="text-sm">{message}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
