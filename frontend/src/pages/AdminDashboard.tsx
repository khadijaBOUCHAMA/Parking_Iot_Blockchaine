import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import {
  BarChart3,
  Car,
  MapPin,
  Clock,
  CreditCard,
  Users,
  Settings,
  LogOut,
  Activity,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Radio,
  Wifi,
  Camera,
  Shield,
  Zap,
  Database,
  Server
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

interface SensorData {
  id: string
  name: string
  type: 'ultrasonic' | 'magnetic' | 'camera'
  status: 'online' | 'offline' | 'warning'
  location: string
  lastUpdate: string
  accuracy: number
  isOccupied: boolean
}

interface RevenueData {
  month: string
  revenue: number
  reservations: number
}

interface OccupancyData {
  time: string
  occupied: number
  available: number
}

const AdminDashboard = () => {
  const { user, disconnectWallet } = useAuth()
  const { toast } = useToast()

  const [sensors, setSensors] = useState<SensorData[]>([
    {
      id: "s1",
      name: "Place A1",
      type: "ultrasonic",
      status: "online",
      location: "Zone A - Niveau 1",
      lastUpdate: "Il y a 2 min",
      accuracy: 99.2,
      isOccupied: true
    },
    {
      id: "s2",
      name: "Place A2",
      type: "magnetic",
      status: "online",
      location: "Zone A - Niveau 1",
      lastUpdate: "Il y a 1 min",
      accuracy: 98.8,
      isOccupied: false
    },
    {
      id: "s3",
      name: "Place B1",
      type: "camera",
      status: "warning",
      location: "Zone B - Niveau 2",
      lastUpdate: "Il y a 15 min",
      accuracy: 89.1,
      isOccupied: false
    },
    {
      id: "s4",
      name: "Place B2",
      type: "ultrasonic",
      status: "offline",
      location: "Zone B - Niveau 2",
      lastUpdate: "Il y a 2h",
      accuracy: 0,
      isOccupied: false
    }
  ])

  const revenueData: RevenueData[] = [
    { month: 'Jan', revenue: 4200, reservations: 120 },
    { month: 'Fév', revenue: 4800, reservations: 145 },
    { month: 'Mar', revenue: 5200, reservations: 168 },
    { month: 'Avr', revenue: 6100, reservations: 192 },
    { month: 'Mai', revenue: 5800, reservations: 178 },
    { month: 'Jun', revenue: 6800, reservations: 215 }
  ]

  const occupancyData: OccupancyData[] = [
    { time: '00:00', occupied: 12, available: 88 },
    { time: '04:00', occupied: 8, available: 92 },
    { time: '08:00', occupied: 65, available: 35 },
    { time: '12:00', occupied: 78, available: 22 },
    { time: '16:00', occupied: 82, available: 18 },
    { time: '20:00', occupied: 45, available: 55 },
    { time: '23:00', occupied: 28, available: 72 }
  ]

  const sensorDistribution = [
    { name: 'En ligne', value: 2, color: '#22c55e' },
    { name: 'Alerte', value: 1, color: '#f59e0b' },
    { name: 'Hors ligne', value: 1, color: '#ef4444' }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4 text-success" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'offline': return <XCircle className="h-4 w-4 text-destructive" />
      default: return <Radio className="h-4 w-4" />
    }
  }

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'ultrasonic': return <Radio className="h-4 w-4" />
      case 'magnetic': return <Zap className="h-4 w-4" />
      case 'camera': return <Camera className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'online': return 'default'
      case 'warning': return 'secondary'
      case 'offline': return 'destructive'
      default: return 'outline'
    }
  }

  const toggleSensorStatus = (sensorId: string) => {
    setSensors(sensors.map(sensor =>
      sensor.id === sensorId
        ? { ...sensor, status: sensor.status === 'online' ? 'offline' : 'online' }
        : sensor
    ))
    toast({
      title: "Capteur modifié",
      description: "Statut du capteur mis à jour"
    })
  }

  const handleLogout = async () => {
    try {
      await disconnectWallet()
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt sur ParkSync Admin !",
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

  const totalSensors = sensors.length
  const onlineSensors = sensors.filter(s => s.status === 'online').length
  const occupiedSpots = sensors.filter(s => s.isOccupied).length
  const availableSpots = totalSensors - occupiedSpots
  const averageAccuracy = sensors.filter(s => s.status === 'online').reduce((acc, s) => acc + s.accuracy, 0) / onlineSensors || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/5">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                ParkSync Admin
              </h1>
              <p className="text-xs text-muted-foreground">Tableau de bord gestionnaire</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {user?.address ? user.address.slice(0, 2).toUpperCase() : 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium">Administrateur</p>
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
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Places Totales</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSensors}</div>
              <p className="text-xs text-muted-foreground">
                {onlineSensors} capteurs en ligne
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux d'Occupation</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round((occupiedSpots / totalSensors) * 100)}%</div>
              <p className="text-xs text-muted-foreground">
                {occupiedSpots} occupées / {availableSpots} libres
              </p>
              <Progress value={(occupiedSpots / totalSensors) * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus Mensuel</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€6,800</div>
              <p className="text-xs text-success flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +17.2% vs mois dernier
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Précision IoT</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageAccuracy.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Fusion multi-capteurs
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="sensors">Capteurs IoT</TabsTrigger>
            <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Évolution des Revenus</CardTitle>
                  <CardDescription>Revenus et réservations par mois</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Occupation Journalière</CardTitle>
                  <CardDescription>Taux d'occupation par heure</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={occupancyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="occupied" fill="hsl(var(--primary))" />
                      <Bar dataKey="available" fill="hsl(var(--muted))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Répartition des Capteurs</CardTitle>
                <CardDescription>Statut actuel de tous les capteurs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={sensorDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {sensorDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sensors Tab */}
          <TabsContent value="sensors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Surveillance des Capteurs IoT
                </CardTitle>
                <CardDescription>
                  Monitoring en temps réel de tous les capteurs de parking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {sensors.map((sensor) => (
                    <Card key={sensor.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {getSensorIcon(sensor.type)}
                            <div>
                              <h3 className="font-semibold">{sensor.name}</h3>
                              <p className="text-sm text-muted-foreground">{sensor.location}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {getStatusIcon(sensor.status)}
                            <Badge variant={getStatusBadgeVariant(sensor.status)}>
                              {sensor.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              Précision: {sensor.accuracy}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {sensor.lastUpdate}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {sensor.isOccupied ? "Occupé" : "Libre"}
                            </span>
                            <Switch
                              checked={sensor.status === 'online'}
                              onCheckedChange={() => toggleSensorStatus(sensor.id)}
                            />
                          </div>
                        </div>
                      </div>

                      {sensor.status === 'online' && (
                        <div className="mt-4">
                          <Progress value={sensor.accuracy} className="h-2" />
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blockchain Tab */}
          <TabsContent value="blockchain" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Transactions Blockchain
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Transactions</span>
                    <span className="font-bold">1,247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Volume ETH</span>
                    <span className="font-bold">12.45 ETH</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Smart Contracts</span>
                    <span className="font-bold text-success">4 Actifs</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Gas Moyen</span>
                    <span className="font-bold">21,000 gwei</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Oracles IoT
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Oracles Actifs</span>
                    <span className="font-bold text-success">3/3</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Dernière MAJ</span>
                    <span className="font-bold">Il y a 2min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Fiabilité</span>
                    <span className="font-bold">99.8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Consensus</span>
                    <span className="font-bold text-success">Validé</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Transactions Récentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Réservation Place A1</div>
                      <div className="text-sm text-muted-foreground">0x742d...8f91</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">0.025 ETH</div>
                      <div className="text-sm text-success">Confirmé</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Paiement automatique</div>
                      <div className="text-sm text-muted-foreground">0x8a3c...1e2f</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">0.018 ETH</div>
                      <div className="text-sm text-success">Confirmé</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestion des Utilisateurs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-primary">156</div>
                      <div className="text-sm text-muted-foreground">Utilisateurs Actifs</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-accent">23</div>
                      <div className="text-sm text-muted-foreground">Nouveaux ce mois</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-success">98.5%</div>
                      <div className="text-sm text-muted-foreground">Satisfaction</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Input placeholder="Rechercher un utilisateur..." className="max-w-sm" />
                    <Button>Exporter</Button>
                  </div>

                  <div className="border rounded-lg">
                    <div className="grid grid-cols-4 gap-4 p-4 font-medium border-b bg-muted/50">
                      <div>Utilisateur</div>
                      <div>Réservations</div>
                      <div>Dépenses</div>
                      <div>Statut</div>
                    </div>
                    <div className="divide-y">
                      <div className="grid grid-cols-4 gap-4 p-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>JD</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">Jean Dupont</div>
                            <div className="text-sm text-muted-foreground">jean@email.com</div>
                          </div>
                        </div>
                        <div>24</div>
                        <div>€156.80</div>
                        <Badge>Premium</Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 p-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>MS</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">Marie Smith</div>
                            <div className="text-sm text-muted-foreground">marie@email.com</div>
                          </div>
                        </div>
                        <div>18</div>
                        <div>€92.50</div>
                        <Badge variant="outline">Standard</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Paramètres Système
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Configuration IoT</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Fréquence de collecte</span>
                        <span className="font-medium">30 secondes</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Seuil d'alerte</span>
                        <span className="font-medium">85%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Auto-calibration</span>
                        <Switch defaultChecked />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Configuration Blockchain</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Réseau</span>
                        <span className="font-medium">Ethereum Mainnet</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Gas Price</span>
                        <span className="font-medium">Auto</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Smart Contracts</span>
                        <Switch defaultChecked />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">Alertes capteurs</div>
                        <div className="text-sm text-muted-foreground">Notifications en cas de dysfonctionnement</div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">Rapports hebdomadaires</div>
                        <div className="text-sm text-muted-foreground">Résumé des performances</div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">Seuils de revenus</div>
                        <div className="text-sm text-muted-foreground">Objectifs atteints</div>
                      </div>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default AdminDashboard