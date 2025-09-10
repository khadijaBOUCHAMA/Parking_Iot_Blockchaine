import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import {
  Car,
  MapPin,
  Clock,
  CreditCard,
  History,
  Search,
  Navigation,
  Wallet,
  Star,
  Calendar,
  TrendingUp,
  Settings,
  LogOut,
  Smartphone,
  Shield,
  Zap
} from "lucide-react"

interface ParkingSpot {
  id: string
  name: string
  location: string
  distance: string
  price: number
  available: boolean
  rating: number
  features: string[]
}

interface Reservation {
  id: string
  spotName: string
  location: string
  startTime: string
  endTime: string
  cost: number
  status: 'active' | 'completed' | 'upcoming'
}

const UserDashboard = () => {
  const { user, disconnectWallet } = useAuth()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeReservations, setActiveReservations] = useState<Reservation[]>([
    {
      id: "1",
      spotName: "Place A1",
      location: "Centre Commercial Beaulieu",
      startTime: "14:30",
      endTime: "16:30",
      cost: 4.0,
      status: "active"
    }
  ])

  const [availableSpots, setAvailableSpots] = useState<ParkingSpot[]>([
    {
      id: "1",
      name: "Place B3",
      location: "Gare Saint-Jean",
      distance: "0.2 km",
      price: 2.5,
      available: true,
      rating: 4.8,
      features: ["Couvert", "Sécurisé", "Recharge électrique"]
    },
    {
      id: "2",
      name: "Place C7",
      location: "Centre-ville",
      distance: "0.5 km",
      price: 3.0,
      available: true,
      rating: 4.6,
      features: ["Proche commerces", "24h/24"]
    },
    {
      id: "3",
      name: "Place D2",
      location: "Aéroport",
      distance: "12.3 km",
      price: 1.8,
      available: true,
      rating: 4.9,
      features: ["Longue durée", "Navette gratuite"]
    }
  ])

  const [recentHistory, setRecentHistory] = useState<Reservation[]>([
    {
      id: "h1",
      spotName: "Place A5",
      location: "Gare Matabiau",
      startTime: "09:00",
      endTime: "17:00",
      cost: 20.0,
      status: "completed"
    },
    {
      id: "h2",
      spotName: "Place B1",
      location: "Capitole",
      startTime: "14:00",
      endTime: "15:30",
      cost: 4.5,
      status: "completed"
    }
  ])

  const handleReserveSpot = (spotId: string) => {
    toast({
      title: "Réservation confirmée !",
      description: "Vous recevrez les détails par email",
    })
  }

  const handleNavigateToSpot = (spotId: string) => {
    toast({
      title: "Navigation démarrée",
      description: "Ouverture de l'application de navigation",
    })
  }

  const handleLogout = async () => {
    try {
      await disconnectWallet()
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt sur ParkSync !",
      })
      // Redirect to home page
      window.location.href = '/'
    } catch (error) {
      toast({
        title: "Erreur de déconnexion",
        description: "Une erreur s'est produite",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground'
      case 'completed': return 'bg-muted text-muted-foreground'
      case 'upcoming': return 'bg-accent text-accent-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'En cours'
      case 'completed': return 'Terminé'
      case 'upcoming': return 'À venir'
      default: return status
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/5">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Car className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                ParkSync
              </h1>
              <p className="text-xs text-muted-foreground">Smart Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {user?.address ? user.address.slice(0, 2).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium">Portefeuille connecté</p>
                <p className="text-xs text-muted-foreground">
                  {user?.address ? `${user.address.slice(0, 6)}...${user.address.slice(-4)}` : ''}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Statistiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-primary" />
                    <span className="text-sm">Réservations</span>
                  </div>
                  <span className="font-bold">24</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-accent" />
                    <span className="text-sm">Total dépensé</span>
                  </div>
                  <span className="font-bold">€156</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Note moyenne</span>
                  </div>
                  <span className="font-bold">4.8/5</span>
                </div>
              </CardContent>
            </Card>

            {/* Wallet */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Portefeuille
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">0.125 ETH</div>
                  <div className="text-sm text-muted-foreground">≈ €156.80</div>
                </div>
                <Button size="sm" className="w-full">
                  Recharger
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="search" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="search">Rechercher</TabsTrigger>
                <TabsTrigger value="active">Actives</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
                <TabsTrigger value="profile">Profil</TabsTrigger>
              </TabsList>

              {/* Search Tab */}
              <TabsContent value="search" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Trouver une place
                    </CardTitle>
                    <CardDescription>
                      Recherchez et réservez une place de parking en temps réel
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 mb-6">
                      <Input
                        placeholder="Où allez-vous ?"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1"
                      />
                      <Button>
                        <Search className="h-4 w-4 mr-2" />
                        Rechercher
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4">
                  {availableSpots.map((spot) => (
                    <Card key={spot.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{spot.name}</h3>
                            <p className="text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {spot.location}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {spot.distance} • Note: {spot.rating}/5
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              €{spot.price}/h
                            </div>
                            <Badge variant={spot.available ? "default" : "secondary"}>
                              {spot.available ? "Disponible" : "Occupé"}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {spot.features.map((feature, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            onClick={() => handleReserveSpot(spot.id)}
                            disabled={!spot.available}
                          >
                            <Car className="h-4 w-4 mr-2" />
                            Réserver
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleNavigateToSpot(spot.id)}
                          >
                            <Navigation className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Active Reservations Tab */}
              <TabsContent value="active" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Réservations actives
                    </CardTitle>
                    <CardDescription>
                      Gérez vos réservations en cours
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {activeReservations.map((reservation) => (
                      <Card key={reservation.id} className="border-success">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold">{reservation.spotName}</h3>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {reservation.location}
                              </p>
                            </div>
                            <Badge className={getStatusColor(reservation.status)}>
                              {getStatusText(reservation.status)}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Début</p>
                              <p className="font-medium">{reservation.startTime}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Fin</p>
                              <p className="font-medium">{reservation.endTime}</p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-primary">
                              €{reservation.cost.toFixed(2)}
                            </span>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Navigation className="h-3 w-3 mr-1" />
                                Naviguer
                              </Button>
                              <Button size="sm" variant="destructive">
                                Annuler
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {activeReservations.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucune réservation active</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Historique des réservations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentHistory.map((reservation) => (
                      <Card key={reservation.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold">{reservation.spotName}</h3>
                              <p className="text-sm text-muted-foreground">{reservation.location}</p>
                            </div>
                            <Badge className={getStatusColor(reservation.status)}>
                              {getStatusText(reservation.status)}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              {reservation.startTime} - {reservation.endTime}
                            </span>
                            <span className="font-bold">€{reservation.cost.toFixed(2)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Profil utilisateur
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        <AvatarFallback className="text-lg">
                          {user?.address ? user.address.slice(0, 2).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-bold">Portefeuille MetaMask</h3>
                        <p className="text-muted-foreground">
                          {user?.address ? `${user.address.slice(0, 10)}...${user.address.slice(-6)}` : ''}
                        </p>
                        <Badge variant="outline">Utilisateur Web3</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                          <div className="text-sm font-medium">Sécurité</div>
                          <div className="text-xs text-muted-foreground">Blockchain</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Zap className="h-8 w-8 mx-auto mb-2 text-accent" />
                          <div className="text-sm font-medium">IoT</div>
                          <div className="text-xs text-muted-foreground">Temps réel</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Smartphone className="h-8 w-8 mx-auto mb-2 text-success" />
                          <div className="text-sm font-medium">Mobile</div>
                          <div className="text-xs text-muted-foreground">Application</div>
                        </CardContent>
                      </Card>
                    </div>

                    <Button variant="outline" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Modifier le profil
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserDashboard