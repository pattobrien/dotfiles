WITH
  tcc_expected (name, service, client, target) AS (
    VALUES
      ('kitty Accessibility', 'kTCCServiceAccessibility', 'net.kovidgoyal.kitty', NULL),
      ('kitty Screen Recording', 'kTCCServiceScreenCapture', 'net.kovidgoyal.kitty', NULL),
      ('kitty Full Disk Access', 'kTCCServiceSystemPolicyAllFiles', 'net.kovidgoyal.kitty', NULL),
      ('kitty Automation of System Events', 'kTCCServiceAppleEvents', 'net.kovidgoyal.kitty', 'com.apple.systemevents'),
      ('Hammerspoon Accessibility', 'kTCCServiceAccessibility', 'org.hammerspoon.Hammerspoon', NULL),
      ('Karabiner-Core-Service Accessibility', 'kTCCServiceAccessibility', 'org.pqrs.Karabiner-Core-Service', NULL),
      ('Thaw Accessibility', 'kTCCServiceAccessibility', 'com.stonerl.Thaw', NULL),
      ('Thaw Screen Recording', 'kTCCServiceScreenCapture', 'com.stonerl.Thaw', NULL),
      ('superwhisper Accessibility', 'kTCCServiceAccessibility', 'com.superduper.superwhisper', NULL),
      ('Raycast Accessibility', 'kTCCServiceAccessibility', 'com.raycast.macos', NULL),
      ('Homerow Accessibility', 'kTCCServiceAccessibility', 'com.superultra.Homerow', NULL),
      ('1Password Accessibility', 'kTCCServiceAccessibility', 'com.1password.1password', NULL),
      ('1Password Screen Recording', 'kTCCServiceScreenCapture', 'com.1password.1password', NULL),
      ('Claude Accessibility', 'kTCCServiceAccessibility', 'com.anthropic.claudefordesktop', NULL),
      ('Claude Screen Recording', 'kTCCServiceScreenCapture', 'com.anthropic.claudefordesktop', NULL),
      ('Tinycast Accessibility', 'kTCCServiceAccessibility', 'com.tinycast.app', NULL),
      ('Tinycast dev Accessibility', 'kTCCServiceAccessibility', 'com.tinycast.app.dev', NULL),
      ('Tinycast dev Post Event', 'kTCCServicePostEvent', 'com.tinycast.app.dev', NULL)
  ),
  sysext_expected (name, team, identifier) AS (
    VALUES
      ('Karabiner VirtualHIDDevice driver extension', 'G43BCU2T37', 'org.pqrs.Karabiner-DriverKit-VirtualHIDDevice'),
      ('Tailscale network extension', 'W5364U7YZB', 'io.tailscale.ipn.macsys.network-extension')
  ),
  btm_expected (name, item, username) AS (
    VALUES
      ('Karabiner-Core-Service background item', 'Karabiner-Core-Service', 'nobody'),
      ('Karabiner-VirtualHIDDevice-Daemon background item', 'Karabiner-VirtualHIDDevice-Daemon', 'nobody'),
      ('Hammerspoon background item', 'Hammerspoon', (SELECT username FROM console_user))
  ),
  notification_expected (name, bundle) AS (
    VALUES
      ('kitty notifications', 'net.kovidgoyal.kitty'),
      ('agent-notifications notifications', 'com.777genius.agent-notifications')
  ),
  local_network_expected (name, client) AS (
    VALUES
      ('kitty Local Network', 'net.kovidgoyal.kitty'),
      ('Tinycast Local Network', 'com.tinycast.app')
  ),
  usernoted AS MATERIALIZED (
    SELECT subkey, value FROM preferences
    WHERE domain = (SELECT directory FROM console_user) || '/Library/Group Containers/group.com.apple.usernoted/Library/Preferences/group.com.apple.usernoted'
      AND key = 'apps'
  ),
  notification_flags AS (
    SELECT b.value AS bundle, CAST(f.value AS INTEGER) AS flags
    FROM usernoted b JOIN usernoted f ON f.subkey = substr(b.subkey, 1, instr(b.subkey, '/')) || 'flags'
    WHERE b.subkey LIKE '%/bundle-id'
  ),
  checks (name, ok, detail, service, client) AS (
    SELECT e.name, t.auth_value IS 2, coalesce('auth_value ' || t.auth_value, 'no row'), e.service, e.client
    FROM tcc_expected e LEFT JOIN tcc t ON t.service = e.service AND t.client = e.client AND t.target IS e.target
    UNION ALL
    SELECT e.name, max(s.state IS 'activated_enabled'), coalesce(group_concat(s.state, ', '), 'not installed'), NULL, NULL
    FROM sysext_expected e LEFT JOIN system_extensions s ON s.team = e.team AND s.identifier = e.identifier
    GROUP BY e.name
    UNION ALL
    SELECT e.name, max(coalesce(s.status LIKE 'enabled, allowed%', 0)), coalesce(group_concat(s.status, '; '), 'not registered'), NULL, NULL
    FROM btm_expected e LEFT JOIN startup_items s
      ON s.source = 'Background Task Management' AND s.name = e.item AND s.username = e.username
    GROUP BY e.name
    UNION ALL
    SELECT e.name, max(coalesce((n.flags >> 25) & 1, 0)), coalesce('flags ' || group_concat(n.flags, ', '), 'not registered'), NULL, NULL
    FROM notification_expected e LEFT JOIN notification_flags n ON n.bundle = e.bundle
    GROUP BY e.name
    UNION ALL
    SELECT name, NULL, NULL, 'LocalNetwork', client FROM local_network_expected
  )
SELECT name, CASE ok WHEN 1 THEN 'OK' WHEN 0 THEN 'MISSING' END AS status, detail, service, client FROM checks;
