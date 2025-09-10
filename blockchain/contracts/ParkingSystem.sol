// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ParkingSystem
 * @dev Smart contract pour la gestion décentralisée des parkings IoT
 */
contract ParkingSystem is Ownable, ReentrancyGuard, Pausable {

    // Structures de données
    struct ParkingSpot {
        uint256 spotId;
        string location; // "A1", "B2", etc.
        uint256 hourlyRate; // Prix en wei par heure
        bool isActive;
        bool isOccupied;
        address currentUser;
        uint256 reservationEnd;
        uint256 totalEarnings;
        uint256 totalOccupations;
    }

    struct Reservation {
        uint256 reservationId;
        address user;
        uint256 spotId;
        uint256 startTime;
        uint256 endTime;
        uint256 totalCost;
        uint256 paidAmount;
        ReservationStatus status;
        uint256 actualStartTime;
        uint256 actualEndTime;
    }

    enum ReservationStatus {
        Active,
        Completed,
        Cancelled,
        Expired
    }

    // Variables d'état
    mapping(uint256 => ParkingSpot) public parkingSpots;
    mapping(uint256 => Reservation) public reservations;
    mapping(address => uint256[]) public userReservations;
    mapping(uint256 => bool) public spotExists;
    
    uint256 public nextSpotId = 1;
    uint256 public nextReservationId = 1;
    uint256 public platformFeePercentage = 10; // 10%
    uint256 public totalPlatformEarnings;
    
    address public oracleAddress;
    uint256 public constant MIN_RESERVATION_TIME = 1 hours;
    uint256 public constant MAX_RESERVATION_TIME = 24 hours;

    // Événements
    event SpotCreated(uint256 indexed spotId, string location, uint256 hourlyRate);
    event SpotUpdated(uint256 indexed spotId, uint256 newRate, bool isActive);
    event ReservationCreated(
        uint256 indexed reservationId,
        address indexed user,
        uint256 indexed spotId,
        uint256 startTime,
        uint256 endTime,
        uint256 totalCost
    );
    event ReservationStarted(uint256 indexed reservationId, uint256 actualStartTime);
    event ReservationCompleted(
        uint256 indexed reservationId,
        uint256 actualEndTime,
        uint256 actualCost,
        uint256 refundAmount
    );
    event ReservationCancelled(uint256 indexed reservationId, uint256 refundAmount);
    event SpotOccupancyChanged(uint256 indexed spotId, bool isOccupied, address user);
    event PlatformFeeUpdated(uint256 newFeePercentage);
    event OracleUpdated(address newOracle);

    // Modificateurs
    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "Seul l'oracle peut appeler cette fonction");
        _;
    }

    modifier spotExistsModifier(uint256 _spotId) {
        require(spotExists[_spotId], unicode"Place de parking inexistante");
        _;
    }

    modifier validReservation(uint256 _reservationId) {
        require(_reservationId < nextReservationId, unicode"Réservation inexistante");
        _;
    }

    constructor(address _oracleAddress) Ownable(msg.sender) {
        oracleAddress = _oracleAddress;
    }

    /**
     * @dev Créer une nouvelle place de parking
     */
    function createParkingSpot(
        string memory _location,
        uint256 _hourlyRate
    ) external onlyOwner {
        require(_hourlyRate > 0, unicode"Le tarif doit être supérieur à 0");
        
        uint256 spotId = nextSpotId++;
        
        parkingSpots[spotId] = ParkingSpot({
            spotId: spotId,
            location: _location,
            hourlyRate: _hourlyRate,
            isActive: true,
            isOccupied: false,
            currentUser: address(0),
            reservationEnd: 0,
            totalEarnings: 0,
            totalOccupations: 0
        });
        
        spotExists[spotId] = true;
        
        emit SpotCreated(spotId, _location, _hourlyRate);
    }

    /**
     * @dev Réserver une place de parking
     */
    function reserveSpot(
        uint256 _spotId,
        uint256 _startTime,
        uint256 _endTime
    ) external payable nonReentrant whenNotPaused spotExistsModifier(_spotId) {
        ParkingSpot storage spot = parkingSpots[_spotId];
        
        require(spot.isActive, unicode"Place de parking inactive");
        require(!spot.isOccupied, unicode"Place déjà occupée");
        require(_startTime >= block.timestamp, unicode"Heure de début invalide");
        require(_endTime > _startTime, unicode"Heure de fin invalide");
        require(
            _endTime - _startTime >= MIN_RESERVATION_TIME,
            unicode"Durée minimale non respectée"
        );
        require(
            _endTime - _startTime <= MAX_RESERVATION_TIME,
            unicode"Durée maximale dépassée"
        );
        require(
            _startTime >= spot.reservationEnd,
            unicode"Place déjà réservée pour cette période"
        );

        uint256 duration = _endTime - _startTime;
        uint256 totalCost = (duration * spot.hourlyRate) / 1 hours;
        
        require(msg.value >= totalCost, "Paiement insuffisant");

        uint256 reservationId = nextReservationId++;
        
        reservations[reservationId] = Reservation({
            reservationId: reservationId,
            user: msg.sender,
            spotId: _spotId,
            startTime: _startTime,
            endTime: _endTime,
            totalCost: totalCost,
            paidAmount: msg.value,
            status: ReservationStatus.Active,
            actualStartTime: 0,
            actualEndTime: 0
        });

        userReservations[msg.sender].push(reservationId);
        spot.reservationEnd = _endTime;

        // Remboursement du surplus
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        emit ReservationCreated(
            reservationId,
            msg.sender,
            _spotId,
            _startTime,
            _endTime,
            totalCost
        );
    }

    /**
     * @dev L'oracle signale l'arrivée d'un véhicule
     */
    function startReservation(uint256 _reservationId) 
        external 
        onlyOracle 
        validReservation(_reservationId) 
    {
        Reservation storage reservation = reservations[_reservationId];
        require(reservation.status == ReservationStatus.Active, unicode"Réservation non active");
        require(reservation.actualStartTime == 0, unicode"Réservation déjà commencée");
        
        ParkingSpot storage spot = parkingSpots[reservation.spotId];
        
        reservation.actualStartTime = block.timestamp;
        spot.isOccupied = true;
        spot.currentUser = reservation.user;
        spot.totalOccupations = spot.totalOccupations + 1;

        emit ReservationStarted(_reservationId, block.timestamp);
        emit SpotOccupancyChanged(reservation.spotId, true, reservation.user);
    }

    /**
     * @dev L'oracle signale le départ d'un véhicule
     */
    function completeReservation(uint256 _reservationId) 
        external 
        onlyOracle 
        validReservation(_reservationId) 
    {
        Reservation storage reservation = reservations[_reservationId];
        require(reservation.status == ReservationStatus.Active, unicode"Réservation non active");
        require(reservation.actualStartTime > 0, unicode"Réservation non commencée");
        require(reservation.actualEndTime == 0, unicode"Réservation déjà terminée");
        
        ParkingSpot storage spot = parkingSpots[reservation.spotId];
        
        reservation.actualEndTime = block.timestamp;
        reservation.status = ReservationStatus.Completed;
        spot.isOccupied = false;
        spot.currentUser = address(0);

        // Calcul du coût réel basé sur l'utilisation effective
        uint256 actualDuration = reservation.actualEndTime - reservation.actualStartTime;
        uint256 actualCost = (actualDuration * spot.hourlyRate) / 1 hours;

        // Calcul des frais de plateforme
        uint256 platformFee = (actualCost * platformFeePercentage) / 100;
        uint256 spotEarnings = actualCost - platformFee;

        spot.totalEarnings = spot.totalEarnings + spotEarnings;
        totalPlatformEarnings = totalPlatformEarnings + platformFee;

        // Remboursement si l'utilisateur a payé plus que nécessaire
        uint256 refundAmount = 0;
        if (reservation.totalCost > actualCost) {
            refundAmount = reservation.totalCost - actualCost;
            payable(reservation.user).transfer(refundAmount);
        }

        emit ReservationCompleted(_reservationId, block.timestamp, actualCost, refundAmount);
        emit SpotOccupancyChanged(reservation.spotId, false, address(0));
    }

    /**
     * @dev Annuler une réservation
     */
    function cancelReservation(uint256 _reservationId) 
        external 
        nonReentrant 
        validReservation(_reservationId) 
    {
        Reservation storage reservation = reservations[_reservationId];
        require(reservation.user == msg.sender, unicode"Pas autorisé");
        require(reservation.status == ReservationStatus.Active, unicode"Réservation non active");
        require(reservation.actualStartTime == 0, unicode"Impossible d'annuler après le début");
        require(block.timestamp < reservation.startTime, unicode"Trop tard pour annuler");

        reservation.status = ReservationStatus.Cancelled;
        
        ParkingSpot storage spot = parkingSpots[reservation.spotId];
        spot.reservationEnd = 0;

        // Remboursement (moins les frais d'annulation de 5%)
        uint256 cancellationFee = (reservation.totalCost * 5) / 100;
        uint256 refundAmount = reservation.totalCost - cancellationFee;

        totalPlatformEarnings = totalPlatformEarnings + cancellationFee;
        
        payable(msg.sender).transfer(refundAmount);

        emit ReservationCancelled(_reservationId, refundAmount);
    }

    // Fonctions de lecture
    function getParkingSpot(uint256 _spotId)
        external
        view
        spotExistsModifier(_spotId)
        returns (ParkingSpot memory)
    {
        return parkingSpots[_spotId];
    }

    function getReservation(uint256 _reservationId) 
        external 
        view 
        validReservation(_reservationId) 
        returns (Reservation memory) 
    {
        return reservations[_reservationId];
    }

    function getUserReservations(address _user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userReservations[_user];
    }

    // Fonctions d'administration
    function updatePlatformFee(uint256 _newFeePercentage) external onlyOwner {
        require(_newFeePercentage <= 20, "Frais maximum 20%");
        platformFeePercentage = _newFeePercentage;
        emit PlatformFeeUpdated(_newFeePercentage);
    }

    function updateOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Adresse oracle invalide");
        oracleAddress = _newOracle;
        emit OracleUpdated(_newOracle);
    }

    function withdrawPlatformEarnings() external onlyOwner {
        uint256 amount = totalPlatformEarnings;
        totalPlatformEarnings = 0;
        payable(owner()).transfer(amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Fonction de secours
    receive() external payable {
        revert(unicode"Paiements directs non autorisés");
    }
}
