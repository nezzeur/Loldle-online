<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

function firebaseLogin($email, $password, $apiKey) {
    $url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$apiKey";

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
    curl_close($ch);

    return [
        'response' => json_decode($response, true),
        'httpCode' => $httpCode
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';

    if (empty($email) || empty($password)) {
        echo json_encode([
            'success' => false,
            'message' => 'Email et mot de passe requis'
        ]);
        exit;
    }

    $apiKey = "";
    $result = firebaseLogin($email, $password, $apiKey);

    if ($result['httpCode'] === 200 && isset($result['response']['idToken'])) {
        echo json_encode([
            'success' => true,
            'user' => [
                'idToken' => $result['response']['idToken'],
                'localId' => $result['response']['localId'],
                'email' => $email
            ]
        ]);
    } else {
        $errorMessage = isset($result['response']['error']['message'])
            ? $result['response']['error']['message']
            : 'Erreur de connexion';

        echo json_encode([
            'success' => false,
            'message' => $errorMessage
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée'
    ]);
}
?>