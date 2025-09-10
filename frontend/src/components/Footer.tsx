import { Car, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Car className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-bold">ParkSync</h3>
                <p className="text-xs text-muted-foreground">Smart IoT Chain</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              La première plateforme de parking intelligent combinant IoT, Blockchain et IA 
              pour révolutionner la mobilité urbaine.
            </p>
          </div>

          {/* Solutions */}
          <div className="space-y-4">
            <h4 className="font-semibold">Solutions</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>Application Utilisateurs</div>
              <div>Dashboard Gestionnaires</div>
              <div>Capteurs IoT Intelligents</div>
              <div>Intégration Blockchain</div>
              <div>Analytics Prédictives</div>
            </div>
          </div>

          {/* Technologies */}
          <div className="space-y-4">
            <h4 className="font-semibold">Technologies</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>React & TypeScript</div>
              <div>Node.js & Express</div>
              <div>Ethereum & Solidity</div>
              <div>IoT Multi-Capteurs</div>
              <div>Intelligence Artificielle</div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold">Contact</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>contact@parksync.fr</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>+33 1 23 45 67 89</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Paris, France</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © 2024 ParkSync. Tous droits réservés.
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Mentions légales</a>
            <a href="#" className="hover:text-primary transition-colors">Confidentialité</a>
            <a href="#" className="hover:text-primary transition-colors">CGU</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;