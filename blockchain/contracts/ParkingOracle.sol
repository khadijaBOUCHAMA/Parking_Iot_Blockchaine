// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ParkingOracle
 * @dev Oracle pour transmettre les données IoT vers la blockchain
 */
contract ParkingOracle is Ownable, Pausable {
    
    // Structure pour les données de capteurs
    struct SensorData {
        uint256 spotId;
        bool isOccupied;
        uint256 confidence; // Pourcentage de confiance (0-100)
        uint256 timestamp;
        string sensorType; // "ultrasonic", "magnetic", "camera", "fusion"
        bytes32 dataHash; // Hash des données complètes
    }

    // Structure pour les oracles autorisés
    struct OracleNode {
        address nodeAddress;
        bool isActive;
        uint256 reputation; // Score de réputation (0-1000)
        uint256 totalUpdates;
        uint256 lastUpdate;
        string nodeId;
    }

    // Variables d'état
    mapping(address => OracleNode) public oracleNodes;
    mapping(uint256 => SensorData) public latestSensorData;
    mapping(uint256 => SensorData[]) public sensorHistory;
    mapping(bytes32 => bool) public processedDataHashes;
    
    address[] public activeOracles;
    address public parkingSystemContract;
    
    uint256 public constant MIN_CONFIDENCE = 70; // Confiance minimale 70%
    uint256 public constant MAX_HISTORY_SIZE = 100;
    uint256 public constant UPDATE_COOLDOWN = 30 seconds;
    
    // Événements
    event OracleNodeAdded(address indexed nodeAddress, string nodeId);
    event OracleNodeRemoved(address indexed nodeAddress);
    event OracleNodeUpdated(address indexed nodeAddress, bool isActive, uint256 reputation);
    event SensorDataUpdated(
        uint256 indexed spotId,
        bool isOccupied,
        uint256 confidence,
        address indexed oracle,
        string sensorType
    );
    event ParkingSystemUpdated(address newContract);
    event DataValidationFailed(address indexed oracle, uint256 spotId, string reason);

    // Modificateurs
    modifier onlyAuthorizedOracle() {
        require(oracleNodes[msg.sender].isActive, unicode"Oracle non autorisé");
        _;
    }

    modifier validSpotId(uint256 _spotId) {
        require(_spotId > 0, unicode"ID de place invalide");
        _;
    }

    modifier cooldownPassed(uint256 _spotId) {
        require(
            block.timestamp >= latestSensorData[_spotId].timestamp + UPDATE_COOLDOWN,
            unicode"Cooldown non écoulé"
        );
        _;
    }

    constructor(address _parkingSystemContract) Ownable(msg.sender) {
        parkingSystemContract = _parkingSystemContract;
    }

    /**
     * @dev Ajouter un nouveau nœud oracle
     */
    function addOracleNode(
        address _nodeAddress,
        string memory _nodeId
    ) external onlyOwner {
        require(_nodeAddress != address(0), unicode"Adresse invalide");
        require(!oracleNodes[_nodeAddress].isActive, unicode"Oracle déjà actif");

        oracleNodes[_nodeAddress] = OracleNode({
            nodeAddress: _nodeAddress,
            isActive: true,
            reputation: 500, // Réputation initiale moyenne
            totalUpdates: 0,
            lastUpdate: 0,
            nodeId: _nodeId
        });

        activeOracles.push(_nodeAddress);
        
        emit OracleNodeAdded(_nodeAddress, _nodeId);
    }

    /**
     * @dev Supprimer un nœud oracle
     */
    function removeOracleNode(address _nodeAddress) external onlyOwner {
        require(oracleNodes[_nodeAddress].isActive, "Oracle non actif");
        
        oracleNodes[_nodeAddress].isActive = false;
        
        // Retirer de la liste des oracles actifs
        for (uint256 i = 0; i < activeOracles.length; i++) {
            if (activeOracles[i] == _nodeAddress) {
                activeOracles[i] = activeOracles[activeOracles.length - 1];
                activeOracles.pop();
                break;
            }
        }
        
        emit OracleNodeRemoved(_nodeAddress);
    }

    /**
     * @dev Mettre à jour les données de capteur
     */
    function updateSensorData(
        uint256 _spotId,
        bool _isOccupied,
        uint256 _confidence,
        string memory _sensorType,
        bytes32 _dataHash
    ) external 
        onlyAuthorizedOracle 
        whenNotPaused 
        validSpotId(_spotId)
        cooldownPassed(_spotId)
    {
        require(_confidence >= MIN_CONFIDENCE, unicode"Confiance insuffisante");
        require(!processedDataHashes[_dataHash], unicode"Données déjà traitées");
        require(bytes(_sensorType).length > 0, unicode"Type de capteur requis");

        // Validation des données
        if (!_validateSensorData(_spotId, _isOccupied, _confidence, _sensorType)) {
            emit DataValidationFailed(msg.sender, _spotId, unicode"Validation échouée");
            _penalizeOracle(msg.sender);
            return;
        }

        // Créer la nouvelle donnée de capteur
        SensorData memory newData = SensorData({
            spotId: _spotId,
            isOccupied: _isOccupied,
            confidence: _confidence,
            timestamp: block.timestamp,
            sensorType: _sensorType,
            dataHash: _dataHash
        });

        // Mettre à jour les données
        latestSensorData[_spotId] = newData;
        processedDataHashes[_dataHash] = true;

        // Ajouter à l'historique
        sensorHistory[_spotId].push(newData);
        if (sensorHistory[_spotId].length > MAX_HISTORY_SIZE) {
            // Supprimer les anciennes données (garder les 100 dernières)
            for (uint256 i = 0; i < sensorHistory[_spotId].length - MAX_HISTORY_SIZE; i++) {
                sensorHistory[_spotId][i] = sensorHistory[_spotId][i + 1];
            }
            sensorHistory[_spotId].pop();
        }

        // Mettre à jour les statistiques de l'oracle
        OracleNode storage oracle = oracleNodes[msg.sender];
        oracle.totalUpdates++;
        oracle.lastUpdate = block.timestamp;
        _rewardOracle(msg.sender);

        // Notifier le contrat de parking si changement d'état
        if (_shouldNotifyParkingSystem(_spotId, _isOccupied)) {
            _notifyParkingSystem(_spotId, _isOccupied);
        }

        emit SensorDataUpdated(_spotId, _isOccupied, _confidence, msg.sender, _sensorType);
    }

    /**
     * @dev Valider les données de capteur
     */
    function _validateSensorData(
        uint256 _spotId,
        bool _isOccupied,
        uint256 _confidence,
        string memory _sensorType
    ) internal view returns (bool) {
        // Vérifications de base
        if (_confidence < MIN_CONFIDENCE || _confidence > 100) {
            return false;
        }

        // Vérifier la cohérence avec les données précédentes
        SensorData memory lastData = latestSensorData[_spotId];
        if (lastData.timestamp > 0) {
            // Si changement d'état, vérifier la confiance
            if (lastData.isOccupied != _isOccupied && _confidence < 80) {
                return false;
            }
            
            // Vérifier que ce n'est pas trop fréquent
            if (block.timestamp - lastData.timestamp < UPDATE_COOLDOWN) {
                return false;
            }
        }

        return true;
    }

    /**
     * @dev Vérifier si le système de parking doit être notifié
     */
    function _shouldNotifyParkingSystem(uint256 _spotId, bool _isOccupied) 
        internal 
        view 
        returns (bool) 
    {
        SensorData memory lastData = latestSensorData[_spotId];
        
        // Notifier si c'est la première donnée ou si l'état a changé
        return lastData.timestamp == 0 || lastData.isOccupied != _isOccupied;
    }

    /**
     * @dev Notifier le contrat de parking
     */
    function _notifyParkingSystem(uint256 _spotId, bool _isOccupied) internal {
        if (parkingSystemContract != address(0)) {
            // Interface simplifiée - dans un vrai système, utiliser une interface
            // IParkingSystem(parkingSystemContract).updateSpotStatus(_spotId, _isOccupied);
        }
    }

    /**
     * @dev Récompenser un oracle pour de bonnes données
     */
    function _rewardOracle(address _oracle) internal {
        OracleNode storage oracle = oracleNodes[_oracle];
        if (oracle.reputation < 1000) {
            oracle.reputation += 1;
        }
    }

    /**
     * @dev Pénaliser un oracle pour de mauvaises données
     */
    function _penalizeOracle(address _oracle) internal {
        OracleNode storage oracle = oracleNodes[_oracle];
        if (oracle.reputation > 10) {
            oracle.reputation -= 10;
        }
        
        // Désactiver l'oracle si réputation trop basse
        if (oracle.reputation < 100) {
            oracle.isActive = false;
            emit OracleNodeUpdated(_oracle, false, oracle.reputation);
        }
    }

    // Fonctions de lecture
    function getLatestSensorData(uint256 _spotId) 
        external 
        view 
        returns (SensorData memory) 
    {
        return latestSensorData[_spotId];
    }

    function getSensorHistory(uint256 _spotId) 
        external 
        view 
        returns (SensorData[] memory) 
    {
        return sensorHistory[_spotId];
    }

    function getOracleNode(address _oracle) 
        external 
        view 
        returns (OracleNode memory) 
    {
        return oracleNodes[_oracle];
    }

    function getActiveOracles() external view returns (address[] memory) {
        return activeOracles;
    }

    // Fonctions d'administration
    function updateParkingSystemContract(address _newContract) external onlyOwner {
        require(_newContract != address(0), "Adresse invalide");
        parkingSystemContract = _newContract;
        emit ParkingSystemUpdated(_newContract);
    }

    function updateOracleReputation(address _oracle, uint256 _newReputation) 
        external 
        onlyOwner 
    {
        require(_newReputation <= 1000, unicode"Réputation maximale 1000");
        require(oracleNodes[_oracle].nodeAddress != address(0), unicode"Oracle inexistant");
        
        oracleNodes[_oracle].reputation = _newReputation;
        emit OracleNodeUpdated(_oracle, oracleNodes[_oracle].isActive, _newReputation);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
