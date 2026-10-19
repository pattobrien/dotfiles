WITH
  tcc_expected (name, service, client) AS (
    VALUES ('Tinycast dev Accessibility', 'kTCCServiceAccessibility', 'com.tinycast.app.dev')
  ),
  pmset_expected (name, timer) AS (
    VALUES
      ('pmset sleep 0', 'System Sleep Timer'),
      ('pmset displaysleep 0', 'Display Sleep Timer'),
      ('pmset disksleep 0', 'Disk Sleep Timer')
  ),
  screensaver_expected (name, host) AS (
    VALUES ('screensaver idleTime 0 (currentHost)', 'current'), ('screensaver idleTime 0', 'any')
  ),
  power AS (
    SELECT json_extract(j.value, '$."AC Power"') AS ac
    FROM system_profiler s, json_each(s.value) j
    WHERE s.data_type = 'SPPowerDataType' AND json_extract(j.value, '$._name') = 'sppower_information'
  ),
  screensaver AS (
    SELECT host, value FROM preferences
    WHERE domain = 'com.apple.screensaver' AND key = 'idleTime' AND username = (SELECT username FROM console_user)
  ),
  checks (name, ok, detail, service, client) AS (
    SELECT e.name, t.auth_value IS 2, coalesce('auth_value ' || t.auth_value, 'no row'), e.service, e.client
    FROM tcc_expected e LEFT JOIN tcc t ON t.service = e.service AND t.client = e.client AND t.target IS NULL
    UNION ALL
    SELECT 'SIP disabled', enabled = 0, iif(enabled, 'enabled', 'disabled'), NULL, NULL
    FROM sip_config WHERE config_flag = 'sip'
    UNION ALL
    SELECT e.name, json_extract(p.ac, '$."' || e.timer || '"') IS 0, coalesce(e.timer || ' ' || json_extract(p.ac, '$."' || e.timer || '"'), 'not reported'), NULL, NULL
    FROM pmset_expected e LEFT JOIN power p
    UNION ALL
    SELECT e.name, s.value IS '0', coalesce('idleTime ' || s.value, 'not set'), NULL, NULL
    FROM screensaver_expected e LEFT JOIN screensaver s ON s.host = e.host
  )
SELECT name, CASE ok WHEN 1 THEN 'OK' WHEN 0 THEN 'MISSING' END AS status, detail, service, client FROM checks;
