export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-pulse">
        <div className="w-8 h-8 bg-primary/20 rounded-full animate-ping"></div>
      </div>
    </div>
  )
}