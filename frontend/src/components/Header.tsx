import { Button } from "@/components/ui/button";
import { Menu, Car, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Header = () => {
  const navigate = useNavigate();
  const { user, connectWallet, isMetaMaskInstalled } = useAuth();

  const handleConnect = async () => {
    if (!isMetaMaskInstalled) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    if (user) {
      // Redirect to appropriate dashboard based on user role
      navigate(user.isAdmin ? '/admin' : '/dashboard');
    } else {
      await connectWallet();
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Car className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              ParkSync
            </h1>
            <p className="text-xs text-muted-foreground">Smart IoT Chain</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <a href="#home" className="text-sm font-medium hover:text-primary transition-colors">
            Accueil
          </a>
          <a href="#solutions" className="text-sm font-medium hover:text-primary transition-colors">
            Solutions
          </a>
          <a href="#technology" className="text-sm font-medium hover:text-primary transition-colors">
            Technologie
          </a>
          <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
            Tarifs
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="hero" size="sm" onClick={handleConnect}>
            {user ? (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                {user.isAdmin && <span className="ml-1 text-xs">(Admin)</span>}
              </>
            ) : !isMetaMaskInstalled ? (
              "Installer MetaMask"
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Connecter MetaMask
              </>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;