<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require __DIR__.'/../vendor/autoload.php';

use Kreait\Firebase\Factory;

try {
    $serviceAccountPath = __DIR__.'/../service-account.json'; // Chemin vers votre fichier service-account.json à créer
    if (!file_exists($serviceAccountPath)) {
        throw new Exception("Le fichier service-account.json est introuvable");
    }

    $factory = (new Factory)
        ->withServiceAccount($serviceAccountPath)
        ->withDatabaseUri(''); // Remplacez par l'URL de votre base de données Firebase

    $database = $factory->createDatabase();

    $scoresRef = $database->getReference('scores');
    $scoresSnapshot = $scoresRef->getSnapshot();

    $scores = [];

    if ($scoresSnapshot->exists()) {
        foreach ($scoresSnapshot->getValue() as $userId => $userScoreData) {
            $email = $userScoreData['lastUpdate']['email'] ?? 'Anonyme';
            $score = (int)($userScoreData['totalScore'] ?? 0);
            $timestamp = $userScoreData['lastUpdate']['timestamp'] ?? time();

            // Extract the username (part before the '@' in the email)
            $username = $email;
            if ($email !== 'Anonyme') {
                $atPos = strpos($email, '@');
                if ($atPos !== false) {
                    $username = substr($email, 0, $atPos);
                }
            }

            $scores[] = [
                'email' => $email, // Keeping the full email for reference if needed elsewhere
                'username' => $username, // Added username field for display
                'score' => $score,
                'timestamp' => $timestamp
            ];
        }

        // Tri par score décroissant
        usort($scores, function($a, $b) {
            return $b['score'] - $a['score'];
        });
    }

    echo json_encode([
        'success' => true,
        'scores' => $scores,
        'debug' => [
            'firebase_connection' => 'success',
            'scores_count' => count($scores)
        ]
    ]);

} catch (Exception $e) {
    error_log("ERREUR Firebase: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Erreur technique',
        'debug' => [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
}
?>