import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, BarChart3, Cpu, ArrowRight } from "lucide-react";
import mobileImage from "@/assets/mobile-app.jpg";
import dashboardImage from "@/assets/dashboard-pro.jpg";

const Solutions = () => {
  return (
    <section id="solutions" className="py-24 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold">
            3 Solutions pour{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Tous les Acteurs
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Notre plateforme révolutionnaire s'adresse aux utilisateurs, gestionnaires et capteurs IoT 
            avec des interfaces dédiées et une technologie de pointe.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Utilisateurs */}
          <Card className="group hover:shadow-primary transition-all duration-500 border-primary/20 overflow-hidden">
            <div className="aspect-video relative overflow-hidden">
              <img 
                src={mobileImage} 
                alt="Application Mobile Utilisateurs"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
              <div className="absolute top-4 left-4">
                <div className="bg-primary/20 backdrop-blur-sm rounded-lg p-2">
                  <Smartphone className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
            </div>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold mb-2">👤 Application Utilisateurs</h3>
                <p className="text-muted-foreground">
                  Interface intuitive pour chercher, réserver et payer des places de parking en temps réel.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-success rounded-full" />
                  <span>Réservation instantanée</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-success rounded-full" />
                  <span>Paiement blockchain automatique</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-success rounded-full" />
                  <span>Navigation GPS intégrée</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-success rounded-full" />
                  <span>Remboursement automatique</span>
                </div>
              </div>

              <Button variant="outline" className="w-full group">
                Tester l'App
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Gestionnaires */}
          <Card className="group hover:shadow-secondary transition-all duration-500 border-secondary/20 overflow-hidden">
            <div className="aspect-video relative overflow-hidden">
              <img 
                src={dashboardImage} 
                alt="Dashboard Professionnel"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-secondary/40 to-transparent" />
              <div className="absolute top-4 left-4">
                <div className="bg-secondary/20 backdrop-blur-sm rounded-lg p-2">
                  <BarChart3 className="h-6 w-6 text-secondary-foreground" />
                </div>
              </div>
            </div>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold mb-2">👨‍💼 Dashboard Gestionnaires</h3>
                <p className="text-muted-foreground">
                  Plateforme de supervision complète avec analytics et gestion automatisée des revenus.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-warning rounded-full" />
                  <span>Monitoring IoT temps réel</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-warning rounded-full" />
                  <span>Analytics prédictives avancées</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-warning rounded-full" />
                  <span>Revenus automatiques</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-warning rounded-full" />
                  <span>Rapports détaillés</span>
                </div>
              </div>

              <Button variant="secondary" className="w-full group">
                Voir le Dashboard
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Capteurs IoT */}
          <Card className="group hover:shadow-glow transition-all duration-500 border-accent/20 overflow-hidden">
            <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto animate-pulse-glow">
                  <Cpu className="h-10 w-10 text-primary-foreground" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-accent">Multi-Capteurs IoT</div>
                  <div className="text-xs text-muted-foreground">Détection tri-modalité</div>
                </div>
              </div>
            </div>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold mb-2">🤖 Système IoT Intelligent</h3>
                <p className="text-muted-foreground">
                  Capteurs avancés avec fusion de données IA pour une détection parfaite des véhicules.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  <span>Capteur ultrasonique</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  <span>Détecteur magnétique</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  <span>Caméra reconnaissance</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  <span>IA fusion de données</span>
                </div>
              </div>

              <Button variant="accent" className="w-full group">
                Découvrir l'IoT
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="mt-20 grid md:grid-cols-4 gap-8 text-center">
          <div className="space-y-2">
            <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">99.9%</div>
            <div className="text-sm text-muted-foreground">Précision de détection</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">&lt; 3s</div>
            <div className="text-sm text-muted-foreground">Temps de réponse</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">24/7</div>
            <div className="text-sm text-muted-foreground">Surveillance automatique</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">100%</div>
            <div className="text-sm text-muted-foreground">Paiements automatisés</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Solutions;