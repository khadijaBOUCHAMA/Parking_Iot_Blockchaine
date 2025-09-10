const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ParkingSystem", function () {
  let parkingSystem;
  let parkingOracle;
  let owner;
  let oracle;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, oracle, user1, user2] = await ethers.getSigners();

    // Déployer l'oracle d'abord
    const ParkingOracle = await ethers.getContractFactory("ParkingOracle");
    parkingOracle = await ParkingOracle.deploy(ethers.ZeroAddress);
    await parkingOracle.waitForDeployment();

    // Déployer le système de parking
    const ParkingSystem = await ethers.getContractFactory("ParkingSystem");
    parkingSystem = await ParkingSystem.deploy(await parkingOracle.getAddress());
    await parkingSystem.waitForDeployment();

    // Configurer l'oracle
    await parkingOracle.updateParkingSystemContract(await parkingSystem.getAddress());
    await parkingOracle.addOracleNode(oracle.address, "test-oracle");
  });

  describe("Déploiement", function () {
    it("Devrait définir le bon propriétaire", async function () {
      expect(await parkingSystem.owner()).to.equal(owner.address);
    });

    it("Devrait définir la bonne adresse oracle", async function () {
      expect(await parkingSystem.oracleAddress()).to.equal(oracle.address);
    });

    it("Devrait avoir les frais de plateforme par défaut", async function () {
      expect(await parkingSystem.platformFeePercentage()).to.equal(10);
    });
  });

  describe("Gestion des places de parking", function () {
    it("Devrait permettre au propriétaire de créer une place", async function () {
      const tx = await parkingSystem.createParkingSpot("A1", ethers.parseEther("0.01"));
      await tx.wait();

      const spot = await parkingSystem.getParkingSpot(1);
      expect(spot.location).to.equal("A1");
      expect(spot.hourlyRate).to.equal(ethers.parseEther("0.01"));
      expect(spot.isActive).to.be.true;
      expect(spot.isOccupied).to.be.false;
    });

    it("Ne devrait pas permettre aux non-propriétaires de créer une place", async function () {
      await expect(
        parkingSystem.connect(user1).createParkingSpot("A1", ethers.parseEther("0.01"))
      ).to.be.revertedWithCustomError(parkingSystem, "OwnableUnauthorizedAccount");
    });

    it("Devrait rejeter un tarif de 0", async function () {
      await expect(
        parkingSystem.createParkingSpot("A1", 0)
      ).to.be.revertedWith("Le tarif doit être supérieur à 0");
    });
  });

  describe("Réservations", function () {
    beforeEach(async function () {
      // Créer une place de parking
      await parkingSystem.createParkingSpot("A1", ethers.parseEther("0.01"));
    });

    it("Devrait permettre de réserver une place", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 3600; // Dans 1 heure
      const endTime = startTime + 3600; // 1 heure de durée
      const cost = ethers.parseEther("0.01"); // 1 heure * 0.01 ETH

      const tx = await parkingSystem.connect(user1).reserveSpot(
        1,
        startTime,
        endTime,
        { value: cost }
      );

      await expect(tx)
        .to.emit(parkingSystem, "ReservationCreated")
        .withArgs(1, user1.address, 1, startTime, endTime, cost);

      const reservation = await parkingSystem.getReservation(1);
      expect(reservation.user).to.equal(user1.address);
      expect(reservation.spotId).to.equal(1);
      expect(reservation.totalCost).to.equal(cost);
    });

    it("Devrait rejeter une réservation avec paiement insuffisant", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      const endTime = startTime + 3600;
      const insufficientPayment = ethers.parseEther("0.005"); // Moins que requis

      await expect(
        parkingSystem.connect(user1).reserveSpot(
          1,
          startTime,
          endTime,
          { value: insufficientPayment }
        )
      ).to.be.revertedWith("Paiement insuffisant");
    });

    it("Devrait rejeter une réservation dans le passé", async function () {
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // Il y a 1 heure
      const endTime = pastTime + 3600;

      await expect(
        parkingSystem.connect(user1).reserveSpot(
          1,
          pastTime,
          endTime,
          { value: ethers.parseEther("0.01") }
        )
      ).to.be.revertedWith("Heure de début invalide");
    });

    it("Devrait rembourser l'excédent de paiement", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      const endTime = startTime + 3600;
      const overpayment = ethers.parseEther("0.02"); // Double du requis

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      
      const tx = await parkingSystem.connect(user1).reserveSpot(
        1,
        startTime,
        endTime,
        { value: overpayment }
      );
      
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      // L'utilisateur devrait avoir payé seulement le coût réel + gas
      const expectedBalance = balanceBefore - ethers.parseEther("0.01") - gasUsed;
      expect(balanceAfter).to.be.closeTo(expectedBalance, ethers.parseEther("0.001"));
    });
  });

  describe("Gestion des réservations par l'oracle", function () {
    let reservationId;

    beforeEach(async function () {
      // Créer une place et une réservation
      await parkingSystem.createParkingSpot("A1", ethers.parseEther("0.01"));
      
      const startTime = Math.floor(Date.now() / 1000) + 3600;
      const endTime = startTime + 3600;
      
      await parkingSystem.connect(user1).reserveSpot(
        1,
        startTime,
        endTime,
        { value: ethers.parseEther("0.01") }
      );
      
      reservationId = 1;
    });

    it("Devrait permettre à l'oracle de démarrer une réservation", async function () {
      const tx = await parkingSystem.connect(oracle).startReservation(reservationId);
      
      await expect(tx)
        .to.emit(parkingSystem, "ReservationStarted")
        .withArgs(reservationId, await ethers.provider.getBlock('latest').then(b => b.timestamp));

      const spot = await parkingSystem.getParkingSpot(1);
      expect(spot.isOccupied).to.be.true;
      expect(spot.currentUser).to.equal(user1.address);
    });

    it("Devrait permettre à l'oracle de terminer une réservation", async function () {
      // Démarrer d'abord la réservation
      await parkingSystem.connect(oracle).startReservation(reservationId);
      
      // Terminer la réservation
      const tx = await parkingSystem.connect(oracle).completeReservation(reservationId);
      
      await expect(tx).to.emit(parkingSystem, "ReservationCompleted");

      const spot = await parkingSystem.getParkingSpot(1);
      expect(spot.isOccupied).to.be.false;
      expect(spot.currentUser).to.equal(ethers.ZeroAddress);
    });

    it("Ne devrait pas permettre aux non-oracles de gérer les réservations", async function () {
      await expect(
        parkingSystem.connect(user1).startReservation(reservationId)
      ).to.be.revertedWith("Seul l'oracle peut appeler cette fonction");
    });
  });

  describe("Annulation de réservations", function () {
    let reservationId;

    beforeEach(async function () {
      await parkingSystem.createParkingSpot("A1", ethers.parseEther("0.01"));
      
      const startTime = Math.floor(Date.now() / 1000) + 3600; // Dans 1 heure
      const endTime = startTime + 3600;
      
      await parkingSystem.connect(user1).reserveSpot(
        1,
        startTime,
        endTime,
        { value: ethers.parseEther("0.01") }
      );
      
      reservationId = 1;
    });

    it("Devrait permettre l'annulation avant le début", async function () {
      const balanceBefore = await ethers.provider.getBalance(user1.address);
      
      const tx = await parkingSystem.connect(user1).cancelReservation(reservationId);
      await expect(tx).to.emit(parkingSystem, "ReservationCancelled");

      // Vérifier le remboursement (95% du montant payé)
      const balanceAfter = await ethers.provider.getBalance(user1.address);
      const refundAmount = ethers.parseEther("0.01") * 95n / 100n; // 95%
      
      // Le solde devrait avoir augmenté d'environ le montant du remboursement
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Ne devrait pas permettre l'annulation par un autre utilisateur", async function () {
      await expect(
        parkingSystem.connect(user2).cancelReservation(reservationId)
      ).to.be.revertedWith("Pas autorisé");
    });
  });

  describe("Administration", function () {
    it("Devrait permettre de mettre à jour les frais de plateforme", async function () {
      await parkingSystem.updatePlatformFee(15);
      expect(await parkingSystem.platformFeePercentage()).to.equal(15);
    });

    it("Devrait rejeter des frais de plateforme trop élevés", async function () {
      await expect(
        parkingSystem.updatePlatformFee(25)
      ).to.be.revertedWith("Frais maximum 20%");
    });

    it("Devrait permettre de retirer les gains de la plateforme", async function () {
      // Créer une réservation et la compléter pour générer des revenus
      await parkingSystem.createParkingSpot("A1", ethers.parseEther("0.01"));
      
      const startTime = Math.floor(Date.now() / 1000) + 100;
      const endTime = startTime + 3600;
      
      await parkingSystem.connect(user1).reserveSpot(
        1,
        startTime,
        endTime,
        { value: ethers.parseEther("0.01") }
      );

      // Simuler le passage du temps et compléter la réservation
      await network.provider.send("evm_increaseTime", [3700]);
      await network.provider.send("evm_mine");

      await parkingSystem.connect(oracle).startReservation(1);
      await parkingSystem.connect(oracle).completeReservation(1);

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      await parkingSystem.withdrawPlatformEarnings();
      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });
});
