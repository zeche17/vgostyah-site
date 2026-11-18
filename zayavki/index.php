<?php
// Закрытая страница с заявками. Пароль задаётся в config.php: 'leads_pass' => '...'
// Совместимо с PHP 5.6+.
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');

$root = dirname(__DIR__);
$cfg  = @include $root . '/config.php';
$pass = (is_array($cfg) && !empty($cfg['leads_pass'])) ? (string)$cfg['leads_pass'] : '';
$csv  = $root . '/data/leads.csv';
$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';

session_name('vgz');
session_set_cookie_params(0, '/zayavki/', '', $https, true);
session_start();

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

// Защита от подбора: не больше 10 неверных попыток с одного IP за 15 минут
$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
$lockFile = $root . '/data/login-fails.json';
$fails = is_file($lockFile) ? json_decode((string)@file_get_contents($lockFile), true) : array();
if (!is_array($fails)) $fails = array();
$now = time();
foreach ($fails as $k => $v) { if ($now - $v['t'] > 900) unset($fails[$k]); }
$blocked = isset($fails[$ip]) && $fails[$ip]['n'] >= 10;

$error = '';
if (isset($_GET['logout'])) {
    $_SESSION = array();
    session_destroy();
    header('Location: ./');
    exit;
}
if ($pass !== '' && isset($_POST['pass']) && empty($_SESSION['ok'])) {
    if ($blocked) {
        $error = 'Слишком много попыток. Попробуйте через 15 минут.';
    } elseif (function_exists('hash_equals') ? hash_equals($pass, (string)$_POST['pass']) : $pass === (string)$_POST['pass']) {
        session_regenerate_id(true);
        $_SESSION['ok'] = 1;
        unset($fails[$ip]);
        @file_put_contents($lockFile, json_encode($fails), LOCK_EX);
        header('Location: ./');
        exit;
    } else {
        sleep(1);
        $fails[$ip] = array('n' => (isset($fails[$ip]) ? $fails[$ip]['n'] : 0) + 1, 't' => $now);
        @file_put_contents($lockFile, json_encode($fails), LOCK_EX);
        $error = 'Неверный пароль.';
    }
}
$ok = $pass !== '' && !empty($_SESSION['ok']);

// Скачивание таблицы
if ($ok && isset($_GET['download'])) {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="zayavki-' . date('Y-m-d') . '.csv"');
    if (is_file($csv)) readfile($csv);
    exit;
}

// Чтение заявок
$head = array();
$rows = array();
if ($ok && is_file($csv) && ($fh = fopen($csv, 'r'))) {
    $first = true;
    while (($r = fgetcsv($fh, 0, ';', '"', '\\')) !== false) {
        if ($first) { $r[0] = preg_replace('/^\xEF\xBB\xBF/', '', $r[0]); $head = $r; $first = false; continue; }
        $rows[] = $r;
    }
    fclose($fh);
    $rows = array_reverse($rows);
}
?><!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Заявки — В гостях</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
@font-face{font-family:Rubik;font-weight:400;src:url(/fonts/rubik-400.woff) format("woff")}
@font-face{font-family:Rubik;font-weight:600;src:url(/fonts/rubik-600.woff) format("woff")}
:root{--pamp:#F3F2EE;--umb:#282826;--em:#154130;--sand:#D6B166;--wh:#FEFEFD}
*{box-sizing:border-box}
body{margin:0;font:400 15px/1.45 Rubik,system-ui,Arial,sans-serif;color:var(--umb);background:var(--pamp)}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:18px 24px;background:var(--em);color:var(--wh)}
.top h1{margin:0;font-weight:600;font-size:22px}
.top small{opacity:.75;font-size:14px;margin-left:8px}
.btn{display:inline-flex;align-items:center;min-height:40px;padding:0 18px;border-radius:99px;border:2px solid var(--umb);background:var(--wh);color:var(--umb);font:600 14px Rubik,Arial,sans-serif;text-decoration:none;cursor:pointer;box-shadow:2px 2px 0 var(--umb)}
.btn.y{background:var(--sand)}
.acts{display:flex;gap:10px;flex-wrap:wrap}
.wrap{padding:20px 24px}
.tbl{overflow:auto;background:var(--wh);border:2px solid var(--umb);border-radius:14px}
table{border-collapse:collapse;width:100%;min-width:1100px}
th,td{padding:10px 12px;border-bottom:1px solid #e3e1da;text-align:left;vertical-align:top}
th{position:sticky;top:0;background:#ebe9e2;font-weight:600;font-size:13px;white-space:nowrap}
td{max-width:320px;word-break:break-word}
td.nw{white-space:nowrap}
tr:hover td{background:#faf8f2}
.login{max-width:360px;margin:12vh auto;padding:28px;background:var(--wh);border:2px solid var(--umb);border-radius:18px;box-shadow:6px 6px 0 var(--umb)}
.login h1{margin:0 0 6px;font-size:24px}
.login p{margin:0 0 18px;color:#5b5b57}
input[type=password]{width:100%;min-height:46px;padding:0 14px;border:2px solid var(--umb);border-radius:12px;font:inherit;margin-bottom:14px}
.err{color:#b3261e;margin:-6px 0 12px}
.empty{padding:40px;text-align:center;color:#5b5b57}
</style>
</head>
<body>
<?php if ($pass === ''): ?>
<div class="login"><h1>Страница не настроена</h1><p>Добавьте в config.php строку <code>'leads_pass' => 'ваш пароль',</code></p></div>
<?php elseif (!$ok): ?>
<form class="login" method="post" autocomplete="off">
  <h1>Кто там?</h1>
  <p>Заявки видят только хозяева.</p>
  <?php if ($error): ?><div class="err"><?= h($error) ?></div><?php endif; ?>
  <input type="password" name="pass" placeholder="Пароль" required autofocus>
  <button class="btn y" type="submit">Войти</button>
</form>
<?php else: ?>
<div class="top">
  <h1>Заявки<small><?= count($rows) ?> шт.</small></h1>
  <div class="acts">
    <a class="btn y" href="?download=1">Скачать таблицу</a>
    <a class="btn" href="?logout=1">Выйти</a>
  </div>
</div>
<div class="wrap">
<?php if (!$rows): ?>
  <div class="tbl empty">Пока пусто. Чайник уже поставили.</div>
<?php else: ?>
  <div class="tbl"><table>
    <thead><tr><?php foreach ($head as $c): ?><th><?= h($c) ?></th><?php endforeach; ?></tr></thead>
    <tbody>
    <?php foreach ($rows as $r): ?><tr>
      <?php foreach ($head as $i => $c): $v = isset($r[$i]) ? $r[$i] : '';
        if ($c === 'Телефон' && $v !== ''): ?><td class="nw"><a href="tel:<?= h(preg_replace('/[^\d+]/', '', $v)) ?>"><?= h($v) ?></a></td>
      <?php elseif (preg_match('~^https?://~', $v)): ?><td><a href="<?= h($v) ?>" target="_blank" rel="noopener noreferrer"><?= h($v) ?></a></td>
      <?php else: ?><td<?= $i === 0 ? ' class="nw"' : '' ?>><?= nl2br(h($v)) ?></td><?php endif; ?>
      <?php endforeach; ?>
    </tr><?php endforeach; ?>
    </tbody>
  </table></div>
<?php endif; ?>
</div>
<?php endif; ?>
</body>
</html>
