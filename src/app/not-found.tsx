import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
      <div className="max-w-md w-full space-y-8 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="backdrop-blur-lg shadow-2xl border-0 rounded-2xl" style={{backgroundColor: '#15282f'}}>
          <CardHeader className="text-center pb-8">
            <div className="mx-auto mb-6">
              <div className="text-6xl font-bold text-white mb-4">404</div>
              <CardTitle className="text-2xl text-white">Страница не найдена</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-white/70">
              Запрашиваемая страница не существует или была перемещена.
            </p>
          </CardContent>
        </Card>
        
        <div className="text-center mt-8">
          <p className="text-white/70 text-sm">
            © 2025 Новые Схемы. Все права защищены.
          </p>
        </div>
      </div>
    </div>
  )
}
