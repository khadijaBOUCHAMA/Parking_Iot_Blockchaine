import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, Crown } from "lucide-react";

const Pricing = () => {
  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="border-accent/20 text-accent">
            Modèle Économique
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold">
            Tarification{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Transparente
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Des solutions adaptées à chaque besoin, du petit parking privé 
            aux grandes infrastructures urbaines.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Starter */}
          <Card className="border-border hover:shadow-card transition-all duration-300">
            <CardHeader className="text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">Starter</CardTitle>
                <p className="text-muted-foreground">Petit parking privé</p>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold">49€</div>
                <div className="text-sm text-muted-foreground">/mois + 5% commission</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">Jusqu'à 50 places</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">Capteurs IoT inclus</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">App mobile basique</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">Dashboard simple</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">Support email</span>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Commencer l'essai
              </Button>
            </CardContent>
          </Card>

          {/* Professional */}
          <Card className="border-primary/30 hover:shadow-primary transition-all duration-300 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-primary text-primary-foreground">
                <Star className="h-3 w-3 mr-1" />
                Populaire
              </Badge>
            </div>
            <CardHeader className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto">
                <Star className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">Professional</CardTitle>
                <p className="text-muted-foreground">Centre commercial</p>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold">199€</div>
                <div className="text-sm text-muted-foreground">/mois + 3% commission</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">Jusqu'à 500 places</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">Multi-capteurs IA avancés</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">App mobile complète</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">Analytics avancées</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">Support prioritaire 24/7</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">API intégration</span>
                </div>
              </div>
              <Button variant="hero" className="w-full">
                Choisir Professional
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise */}
          <Card className="border-accent/30 hover:shadow-glow transition-all duration-300">
            <CardHeader className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto">
                <Crown className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <p className="text-muted-foreground">Infrastructure urbaine</p>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold">Sur mesure</div>
                <div className="text-sm text-muted-foreground">Tarif négocié</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">Places illimitées</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">IA personnalisée</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">White-label complet</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">Intégration sur mesure</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">Account manager dédié</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-sm">SLA 99.99%</span>
                </div>
              </div>
              <Button variant="accent" className="w-full">
                Nous contacter
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ROI Section */}
        <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-4">
                Retour sur Investissement{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Garantie
                </span>
              </h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Nos clients constatent en moyenne une augmentation de 40% de leurs revenus 
                grâce à l'optimisation automatique et la réduction des coûts opérationnels.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 text-center">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">+40%</div>
                <div className="text-sm text-muted-foreground">Revenus parking</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-success">-60%</div>
                <div className="text-sm text-muted-foreground">Coûts opérationnels</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-accent">95%</div>
                <div className="text-sm text-muted-foreground">Taux d'occupation</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-warning">&lt; 6 mois</div>
                <div className="text-sm text-muted-foreground">Retour investissement</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default Pricing;