import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Cpu, 
  Shield, 
  Zap, 
  Globe, 
  Brain, 
  Wifi,
  Database,
  Smartphone,
  BarChart3
} from "lucide-react";

const Technology = () => {
  return (
    <section id="technology" className="py-24 bg-gradient-to-b from-muted/20 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="border-primary/20 text-primary">
            Innovation Technologique
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold">
            Architecture{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Révolutionnaire
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Notre plateforme combine les technologies les plus avancées pour créer 
            l'écosystème de parking intelligent le plus sophistiqué au monde.
          </p>
        </div>

        {/* Architecture Diagram */}
        <div className="mb-20">
          <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5 overflow-hidden">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-8">
                {/* Layer 1: Frontend */}
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Smartphone className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="font-bold text-lg">Frontend Layer</h3>
                    <p className="text-sm text-muted-foreground">Interfaces Utilisateurs</p>
                  </div>
                  
                  <div className="space-y-3">
                    <Card className="p-3 border-primary/10">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">App Mobile React</span>
                      </div>
                    </Card>
                    <Card className="p-3 border-primary/10">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Dashboard Pro</span>
                      </div>
                    </Card>
                    <Card className="p-3 border-primary/10">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">WebSocket Real-time</span>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Layer 2: Backend */}
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-secondary rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Database className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <h3 className="font-bold text-lg">Backend Layer</h3>
                    <p className="text-sm text-muted-foreground">API & Intelligence</p>
                  </div>
                  
                  <div className="space-y-3">
                    <Card className="p-3 border-secondary/10">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-secondary" />
                        <span className="text-sm font-medium">Node.js Express</span>
                      </div>
                    </Card>
                    <Card className="p-3 border-secondary/10">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-secondary" />
                        <span className="text-sm font-medium">IA Fusion Données</span>
                      </div>
                    </Card>
                    <Card className="p-3 border-secondary/10">
                      <div className="flex items-center gap-2">
                        <Wifi className="h-4 w-4 text-secondary" />
                        <span className="text-sm font-medium">Oracles IoT</span>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Layer 3: Blockchain */}
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Shield className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="font-bold text-lg">Blockchain Layer</h3>
                    <p className="text-sm text-muted-foreground">Sécurité & Décentralisation</p>
                  </div>
                  
                  <div className="space-y-3">
                    <Card className="p-3 border-accent/10">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-accent" />
                        <span className="text-sm font-medium">Ethereum Mainnet</span>
                      </div>
                    </Card>
                    <Card className="p-3 border-accent/10">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-accent" />
                        <span className="text-sm font-medium">Smart Contracts</span>
                      </div>
                    </Card>
                    <Card className="p-3 border-accent/10">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-accent" />
                        <span className="text-sm font-medium">Paiements Auto</span>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>

              {/* Connection Lines */}
              <div className="hidden md:block mt-8">
                <div className="flex items-center justify-center space-x-8">
                  <div className="w-16 h-0.5 bg-gradient-primary"></div>
                  <div className="text-xs text-primary font-medium">API REST</div>
                  <div className="w-16 h-0.5 bg-gradient-primary"></div>
                  <div className="text-xs text-primary font-medium">Web3</div>
                  <div className="w-16 h-0.5 bg-gradient-primary"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Technology Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="group hover:shadow-primary transition-all duration-300 border-primary/20">
            <CardHeader className="text-center pb-3">
              <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Cpu className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-lg">IoT Multi-Capteurs</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Fusion intelligente de 3 technologies de détection pour une précision parfaite.
              </p>
              <div className="space-y-1">
                <div className="text-xs text-center text-primary">Ultrasonique + Magnétique + Caméra</div>
                <div className="w-full bg-muted rounded-full h-1">
                  <div className="bg-gradient-primary h-1 rounded-full w-[99%]"></div>
                </div>
                <div className="text-xs text-center text-muted-foreground">99.9% Précision</div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-secondary transition-all duration-300 border-secondary/20">
            <CardHeader className="text-center pb-3">
              <div className="w-16 h-16 bg-gradient-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Brain className="h-8 w-8 text-secondary-foreground" />
              </div>
              <CardTitle className="text-lg">Intelligence Artificielle</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Algorithmes avancés pour prédictions et optimisation automatique.
              </p>
              <div className="space-y-1">
                <div className="text-xs text-center text-secondary">Machine Learning & Prédictions</div>
                <div className="w-full bg-muted rounded-full h-1">
                  <div className="bg-gradient-secondary h-1 rounded-full w-[95%]"></div>
                </div>
                <div className="text-xs text-center text-muted-foreground">Optimisation Continue</div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-glow transition-all duration-300 border-accent/20">
            <CardHeader className="text-center pb-3">
              <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Shield className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-lg">Blockchain Ethereum</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Smart contracts pour transparence et paiements automatisés.
              </p>
              <div className="space-y-1">
                <div className="text-xs text-center text-accent">Solidity + Web3 + MetaMask</div>
                <div className="w-full bg-muted rounded-full h-1">
                  <div className="bg-gradient-primary h-1 rounded-full w-[100%]"></div>
                </div>
                <div className="text-xs text-center text-muted-foreground">100% Sécurisé</div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-card transition-all duration-300 border-success/20">
            <CardHeader className="text-center pb-3">
              <div className="w-16 h-16 bg-gradient-success rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Zap className="h-8 w-8 text-success-foreground" />
              </div>
              <CardTitle className="text-lg">Temps Réel</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                WebSocket et notifications instantanées pour une expérience fluide.
              </p>
              <div className="space-y-1">
                <div className="text-xs text-center text-success">Socket.io + Push Notifications</div>
                <div className="w-full bg-muted rounded-full h-1">
                  <div className="bg-gradient-success h-1 rounded-full w-[98%]"></div>
                </div>
                <div className="text-xs text-center text-muted-foreground">&lt; 3s Latence</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Technology;