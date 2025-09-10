import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, ArrowRight, Zap, Shield, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-parking.jpg";

const Hero = () => {
  const navigate = useNavigate();
  return (
    <section id="home" className="pt-24 pb-16 min-h-screen flex items-center bg-gradient-to-br from-background via-muted/20 to-accent/5">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-slide-in">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-primary/10 border border-primary/20">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Révolution IoT & Blockchain</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                L'Avenir du{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Parking Intelligent
                </span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed">
                Plateforme complète combinant <strong>IoT</strong>, <strong>Blockchain</strong> et <strong>IA</strong>
                pour automatiser et optimiser la gestion des parkings en temps réel.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="lg" className="group" onClick={() => navigate('/auth')}>
                Connecter MetaMask
                <Play className="h-5 w-5 ml-2 group-hover:scale-110 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" className="group" onClick={() => navigate('#technology')}>
                Voir la Technologie
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            <div className="flex items-center gap-8 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">99.9%</div>
                <div className="text-sm text-muted-foreground">Précision IoT</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">&lt; 3s</div>
                <div className="text-sm text-muted-foreground">Temps Réel</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">100%</div>
                <div className="text-sm text-muted-foreground">Automatique</div>
              </div>
            </div>
          </div>

          <div className="relative animate-slide-in">
            <div className="relative rounded-2xl overflow-hidden shadow-glow">
              <img
                src={heroImage}
                alt="Smart Parking System"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
            </div>

            {/* Floating cards */}
            <Card className="absolute top-4 -left-4 p-4 bg-background/90 backdrop-blur-sm border-success/20 animate-pulse-glow">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
                <div>
                  <div className="text-sm font-semibold text-success">Place A1</div>
                  <div className="text-xs text-muted-foreground">Libre - 2€/h</div>
                </div>
              </div>
            </Card>

            <Card className="absolute bottom-4 -right-4 p-4 bg-background/90 backdrop-blur-sm border-primary/20">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-primary" />
                <div>
                  <div className="text-sm font-semibold">Blockchain</div>
                  <div className="text-xs text-muted-foreground">Sécurisé & Transparent</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;