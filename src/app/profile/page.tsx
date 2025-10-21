import AuthGuard from "@/components/auth-guard"

function ProfileContent() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Профиль</h1>
      {/* Пустая страница профиля */}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  )
}
