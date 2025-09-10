import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { Car, Shield, Zap, ArrowLeft, Wallet, ExternalLink } from "lucide-react"

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { connectWallet, isMetaMaskInstalled, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleConnectWallet = async () => {
    setIsLoading(true)

    try {
      const { error } = await connectWallet()
      if (error) throw error

      // Check if user is admin after connection
      const adminAddress = '0xE8D7d5C0B09bCb329e3E111dF2425f643B20990A'.toLowerCase()
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      const isAdmin = accounts[0]?.toLowerCase() === adminAddress

      toast({
        title: "Portefeuille connecté !",
        description: `Bienvenue sur ParkSync ${isAdmin ? '(Admin)' : ''}`,
      })

      // Redirect to appropriate dashboard
      navigate(isAdmin ? '/admin' : '/dashboard')
    } catch (error: any) {
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openMetaMaskDownload = () => {
    window.open('https://metamask.io/download/', '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'accueil
          </Button>

          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Car className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                ParkSync
              </h1>
              <p className="text-sm text-muted-foreground">Smart IoT Chain</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Connectez votre portefeuille</h2>
            <p className="text-muted-foreground text-sm">
              Utilisez MetaMask pour accéder à votre tableau de bord décentralisé
            </p>
          </div>
        </div>

        {/* MetaMask Connection */}
        <Card className="w-full shadow-glow border-border/50">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Wallet className="h-5 w-5" />
              Connexion Web3
            </CardTitle>
            <CardDescription>
              Connectez-vous de manière sécurisée avec votre portefeuille MetaMask
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {user ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Wallet className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-600">Portefeuille connecté !</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                  </p>
                </div>
                <Button onClick={() => navigate('/dashboard')} className="w-full">
                  Accéder au tableau de bord
                </Button>
              </div>
            ) : !isMetaMaskInstalled ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <ExternalLink className="h-8 w-8 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">MetaMask requis</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Installez MetaMask pour continuer
                  </p>
                </div>
                <Button onClick={openMetaMaskDownload} variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Installer MetaMask
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Wallet className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Connecter MetaMask</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cliquez pour connecter votre portefeuille
                  </p>
                </div>
                <Button
                  onClick={handleConnectWallet}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Connexion...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      Connecter MetaMask
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="w-full border-border/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <Shield className="h-8 w-8 text-primary mx-auto" />
                <div className="text-xs font-medium">Blockchain</div>
                <div className="text-xs text-muted-foreground">Sécurisé</div>
              </div>
              <div className="space-y-2">
                <Zap className="h-8 w-8 text-accent mx-auto" />
                <div className="text-xs font-medium">IoT</div>
                <div className="text-xs text-muted-foreground">Temps réel</div>
              </div>
              <div className="space-y-2">
                <Car className="h-8 w-8 text-success mx-auto" />
                <div className="text-xs font-medium">IA</div>
                <div className="text-xs text-muted-foreground">Intelligent</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Auth