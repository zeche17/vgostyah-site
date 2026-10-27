<?php
// Обработчик формы заявки: письмо на почту + уведомление в Telegram + резервная запись в журнал.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out($ok, $err = '') {
    echo json_encode(['ok' => $ok, 'error' => $err], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(false, 'Неверный запрос.');

$cfg = @include __DIR__ . '/config.php';
if (!is_array($cfg)) out(false, 'Форма временно недоступна. Напишите нам в мессенджер.');

// Защита от ботов: скрытое поле-ловушка и слишком быстрая отправка
if (!empty($_POST['website'])) out(true);
$ts = (int)($_POST['ts'] ?? 0);
if ($ts > 0 && (time() * 1000 - $ts) < 2500) out(true);

$clean = function ($k, $len) {
    $v = isset($_POST[$k]) ? (string)$_POST[$k] : '';
    $v = strip_tags($v);
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $v);
    return mb_substr(trim($v), 0, $len);
};

$name    = $clean('name', 80);
$phone   = $clean('phone', 30);
$contact = $clean('contact', 30);
$date    = $clean('date', 20);
$msg     = $clean('msg', 1000);
$calc    = $clean('calc', 600);
$intent  = $clean('intent', 20);
$intents = ['shoot' => 'Съёмка в студии', 'testdrive' => 'Тест-драйв, 30 минут бесплатно', 'ask' => 'Консультация'];
$intentT = $intents[$intent] ?? 'Заявка';

if ($name === '' || !preg_match('/^[\d\s+()\-]{6,30}$/', $phone)) out(false, 'Проверьте имя и телефон.');
if (empty($_POST['agree']) || empty($_POST['agree_policy'])) out(false, 'Отметьте согласие на обработку данных и принятие политики.');

$lines = [
    'Новая заявка с сайта «В гостях»',
    '',
    'Что нужно: ' . $intentT,
    'Имя: ' . $name,
    'Телефон: ' . $phone,
    'Как связаться: ' . ($contact ?: '—'),
    'Желаемая дата: ' . ($date ?: '—'),
];
if ($intent === 'shoot' && $calc !== '') $lines[] = 'Расчёт: ' . $calc;
$lines[] = 'Комментарий: ' . ($msg ?: '—');
$lines[] = 'Согласие на обработку ПДн и политика приняты: ' . date('d.m.Y H:i') . ' (МСК), редакция от 27.10.2026';
$body = implode("\n", $lines);

$sent = false;

// 1. Почта
if (!empty($cfg['mail_to'])) {
    $from = $cfg['mail_from'] ?? ('noreply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    $fromName = '=?UTF-8?B?' . base64_encode('Заявки с сайта «В гостях»') . '?=';
    $headers = "From: $fromName <$from>\r\nReply-To: $from\r\nContent-Type: text/plain; charset=utf-8\r\n";
    $subject = '=?UTF-8?B?' . base64_encode('Заявка с сайта «В гостях»: ' . $intentT) . '?=';
    if (@mail($cfg['mail_to'], $subject, $body, $headers)) $sent = true;
}

// 2. Telegram
if (!empty($cfg['tg_token']) && !empty($cfg['tg_chat'])) {
    $url = 'https://api.telegram.org/bot' . $cfg['tg_token'] . '/sendMessage';
    $data = http_build_query(['chat_id' => $cfg['tg_chat'], 'text' => $body, 'disable_web_page_preview' => 1]);
    $resp = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $data, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 5]);
        $resp = curl_exec($ch);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => ['method' => 'POST', 'header' => "Content-Type: application/x-www-form-urlencoded\r\n", 'content' => $data, 'timeout' => 8]]);
        $resp = @file_get_contents($url, false, $ctx);
    }
    $j = $resp ? json_decode($resp, true) : null;
    if (is_array($j) && !empty($j['ok'])) $sent = true;
}

// 3. Резервный журнал (на случай, если почта и Telegram недоступны)
$dir = __DIR__ . '/data';
if (!is_dir($dir)) @mkdir($dir, 0750, true);
@file_put_contents($dir . '/leads.log', '[' . date('Y-m-d H:i:s') . "]\n" . $body . "\n\n", FILE_APPEND | LOCK_EX);

if ($sent) out(true);
out(false, 'Не получилось отправить заявку. Позвоните нам или напишите в мессенджер.');
