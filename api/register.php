<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function firebaseRegister($email, $password, $apiKey) {
    $url = "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$apiKey";

    $data = [
        "email" => $email,
        "password" => $password,
        "returnSecureToken" => true
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    return [
        'response' => json_decode($response, true),
        'httpCode' => $httpCode,
        'curlError' => $curlError
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';

    if (empty($email) || empty(trim($password))) {
        echo json_encode([
            'success' => false,
            'message' => 'Email et mot de passe requis'
        ]);
        exit;
    }

    $apiKey = "";
    $result = firebaseRegister($email, $password, $apiKey);

    if ($result['httpCode'] === 200 && isset($result['response']['localId'])) {
        echo json_encode([
            'success' => true,
            'message' => 'Inscription réussie !',
            'debug' => $result
        ]);
    } else {
        $errorMessage = $result['response']['error']['message'] ?? 'Erreur inconnue';

        echo json_encode([
            'success' => false,
            'message' => $errorMessage,
            'debug' => $result
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée'
    ]);
}
?>
