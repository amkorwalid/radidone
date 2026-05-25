export function ChatSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
          <div className="w-32 h-10 bg-zinc-700 rounded-lg animate-pulse"></div>
        </div>
      ))}
    </div>
  );
}

export function ImageUploadSkeleton() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-4">
      <div className="w-48 h-32 bg-zinc-700 rounded-lg animate-pulse"></div>
      <div className="w-32 h-6 bg-zinc-700 rounded animate-pulse"></div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-1">
      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
    </div>
  );
}
