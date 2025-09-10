const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Déploiement des contrats de parking IoT...\n");

  // Récupérer les comptes
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const oracle = signers.length > 1 ? signers[1] : deployer;
  const admin = signers.length > 2 ? signers[2] : deployer;
  
  console.log("📋 Configuration du déploiement:");
  console.log("Déployeur:", deployer.address);
  console.log("Oracle:", oracle.address);
  console.log("Admin:", admin.address);
  console.log("Balance déployeur:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 1. Déployer le contrat Oracle
  console.log("📡 Déploiement du contrat ParkingOracle...");
  const ParkingOracle = await ethers.getContractFactory("ParkingOracle");
  
  // Déployer avec une adresse temporaire, on mettra à jour après
  const parkingOracle = await ParkingOracle.deploy(ethers.ZeroAddress);
  await parkingOracle.waitForDeployment();
  
  const oracleAddress = await parkingOracle.getAddress();
  console.log("✅ ParkingOracle déployé à:", oracleAddress);

  // 2. Déployer le contrat principal ParkingSystem
  console.log("\n🏢 Déploiement du contrat ParkingSystem...");
  const ParkingSystem = await ethers.getContractFactory("ParkingSystem");
  const parkingSystem = await ParkingSystem.deploy(oracleAddress);
  await parkingSystem.waitForDeployment();
  
  const systemAddress = await parkingSystem.getAddress();
  console.log("✅ ParkingSystem déployé à:", systemAddress);

  // 3. Configurer l'oracle avec l'adresse du système
  console.log("\n🔧 Configuration de l'oracle...");
  await parkingOracle.updateParkingSystemContract(systemAddress);
  console.log("✅ Oracle configuré avec l'adresse du système");

  // 4. Ajouter le nœud oracle
  await parkingOracle.addOracleNode(oracle.address, "main-oracle-node");
  console.log("✅ Nœud oracle ajouté:", oracle.address);

  // 5. Créer quelques places de parking de test
  console.log("\n🅿️ Création des places de parking de test...");
  
  const testSpots = [
    { location: "A1", rate: ethers.parseEther("0.01") }, // 0.01 ETH/heure
    { location: "A2", rate: ethers.parseEther("0.01") },
    { location: "A3", rate: ethers.parseEther("0.015") }, // Place premium
    { location: "B1", rate: ethers.parseEther("0.01") },
    { location: "B2", rate: ethers.parseEther("0.01") },
    { location: "C1", rate: ethers.parseEther("0.008") }, // Place économique
    { location: "C2", rate: ethers.parseEther("0.008") },
    { location: "D1", rate: ethers.parseEther("0.02") }, // Place électrique
  ];

  for (const spot of testSpots) {
    const tx = await parkingSystem.createParkingSpot(spot.location, spot.rate);
    await tx.wait();
    console.log(`✅ Place ${spot.location} créée - ${ethers.formatEther(spot.rate)} ETH/heure`);
  }

  // 6. Vérifier le déploiement
  console.log("\n🔍 Vérification du déploiement...");
  
  // Vérifier le propriétaire
  const owner = await parkingSystem.owner();
  console.log("Propriétaire du système:", owner);
  
  // Vérifier l'oracle
  const configuredOracle = await parkingSystem.oracleAddress();
  console.log("Oracle configuré:", configuredOracle);
  
  // Vérifier les frais de plateforme
  const platformFee = await parkingSystem.platformFeePercentage();
  console.log("Frais de plateforme:", platformFee.toString() + "%");

  // 7. Sauvegarder les adresses de déploiement
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      ParkingSystem: {
        address: systemAddress,
        owner: owner,
        oracle: configuredOracle,
        platformFee: platformFee.toString()
      },
      ParkingOracle: {
        address: oracleAddress,
        mainNode: oracle.address
      }
    },
    testSpots: testSpots.map((spot, index) => ({
      spotId: index + 1,
      location: spot.location,
      hourlyRate: ethers.formatEther(spot.rate)
    })),
    gasUsed: {
      ParkingSystem: "Estimation: ~2,500,000 gas",
      ParkingOracle: "Estimation: ~1,800,000 gas"
    }
  };

  // Créer le dossier deployments s'il n'existe pas
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Sauvegarder les informations de déploiement
  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n💾 Informations de déploiement sauvegardées dans:", deploymentFile);

  // 8. Générer le fichier de configuration pour le frontend
  const frontendConfig = {
    contracts: {
      ParkingSystem: {
        address: systemAddress,
        abi: "ParkingSystem.json" // Le frontend devra importer l'ABI
      },
      ParkingOracle: {
        address: oracleAddress,
        abi: "ParkingOracle.json"
      }
    },
    network: {
      name: hre.network.name,
      chainId: hre.network.config.chainId || 31337,
      rpcUrl: hre.network.config.url || "http://localhost:8545"
    },
    testAccounts: {
      deployer: deployer.address,
      oracle: oracle.address,
      admin: admin.address
    }
  };

  const frontendConfigFile = path.join(__dirname, "../../frontend/src/config/contracts.json");
  const frontendConfigDir = path.dirname(frontendConfigFile);
  
  if (!fs.existsSync(frontendConfigDir)) {
    fs.mkdirSync(frontendConfigDir, { recursive: true });
  }
  
  fs.writeFileSync(frontendConfigFile, JSON.stringify(frontendConfig, null, 2));
  console.log("📱 Configuration frontend sauvegardée dans:", frontendConfigFile);

  // 9. Copier les ABIs pour le frontend
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");
  const frontendAbisDir = path.join(__dirname, "../../frontend/src/abis");
  
  if (!fs.existsSync(frontendAbisDir)) {
    fs.mkdirSync(frontendAbisDir, { recursive: true });
  }

  // Copier les ABIs
  const contracts = ["ParkingSystem", "ParkingOracle"];
  for (const contractName of contracts) {
    const artifactPath = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`);
    const abiPath = path.join(frontendAbisDir, `${contractName}.json`);
    
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
      console.log(`📄 ABI ${contractName} copié pour le frontend`);
    }
  }

  console.log("\n🎉 Déploiement terminé avec succès !");
  console.log("\n📋 Résumé:");
  console.log("=".repeat(50));
  console.log(`🏢 ParkingSystem: ${systemAddress}`);
  console.log(`📡 ParkingOracle: ${oracleAddress}`);
  console.log(`👤 Propriétaire: ${owner}`);
  console.log(`🤖 Oracle Node: ${oracle.address}`);
  console.log(`🅿️ Places créées: ${testSpots.length}`);
  console.log(`💰 Frais plateforme: ${platformFee}%`);
  console.log("=".repeat(50));
  
  console.log("\n🔧 Prochaines étapes:");
  console.log("1. Démarrer le backend: cd backend && npm run dev");
  console.log("2. Démarrer le simulateur IoT");
  console.log("3. Tester les réservations via le frontend");
  console.log("4. Monitorer les événements blockchain");

  return {
    parkingSystem: systemAddress,
    parkingOracle: oracleAddress,
    deployer: deployer.address,
    oracle: oracle.address
  };
}

// Gestion des erreurs
main()
  .then((result) => {
    console.log("\n✅ Déploiement réussi:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erreur lors du déploiement:", error);
    process.exit(1);
  });
