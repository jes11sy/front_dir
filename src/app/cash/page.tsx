import AuthGuard from "@/components/auth-guard"

function CashContent() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Касса</h1>
      {/* Пустая страница кассы */}
    </div>
  )
}

export default function CashPage() {
  return (
    <AuthGuard>
      <CashContent />
    </AuthGuard>
  )
}
