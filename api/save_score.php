<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require '../vendor/autoload.php';

use Kreait\Firebase\Factory;

function verifyFirebaseToken($idToken, $apiKey) {
    $url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=$apiKey";

    $data = [
        "idToken" => $idToken
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'response' => json_decode($response, true),
        'httpCode' => $httpCode
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $score = $input['score'] ?? null;
    $idToken = $input['idToken'] ?? '';

    if (empty($idToken) || $score === null) {
        echo json_encode([
            'success' => false,
            'message' => 'Token et score requis'
        ]);
        exit;
    }

    $apiKey = "";

    // Vérifier le token
    $tokenResult = verifyFirebaseToken($idToken, $apiKey);

    if ($tokenResult['httpCode'] !== 200 || !isset($tokenResult['response']['users'][0])) {
        echo json_encode([
            'success' => false,
            'message' => 'Token invalide'
        ]);
        exit;
    }

    $user = $tokenResult['response']['users'][0];
    $userId = $user['localId'];
    $email = $user['email'];

    try {
        $serviceAccountPath = '../service-account.json'; // Chemin vers votre fichier service-account.json à créer
        $databaseUrl = 'https://loldlenoa-default-rtdb.europe-west1.firebasedatabase.app';

        $factory = (new Factory)
            ->withServiceAccount($serviceAccountPath)
            ->withDatabaseUri($databaseUrl);

        $database = $factory->createDatabase();

        // Référence au score total de l'utilisateur
        $userScoreRef = $database->getReference('scores/'.$userId.'/totalScore');

        // Récupérer la valeur actuelle
        $currentScore = $userScoreRef->getValue();
        if ($currentScore === null) {
            $currentScore = 0;
        }

        // Ajouter le nouveau score
        $newScore = intval($score) + $currentScore;

        // Mettre à jour la base
        $userScoreRef->set($newScore);

        // Mettre à jour aussi la dernière date + email dans un autre noeud pour info
        $database->getReference('scores/'.$userId.'/lastUpdate')->set([
            'timestamp' => time(),
            'email' => $email
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Score enregistré et cumulé avec succès',
            'newScore' => $newScore
        ]);

    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Erreur lors de l\'enregistrement: ' . $e->getMessage()
        ]);
    }

} else {
    echo json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée'
    ]);
}
?>
