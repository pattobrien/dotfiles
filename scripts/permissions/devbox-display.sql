WITH
  tcc_expected (name, service, client) AS (
    VALUES
      ('vmguest Screen Recording', 'kTCCServiceScreenCapture', '/opt/namespace/vmguest'),
      ('vmguest Accessibility', 'kTCCServiceAccessibility', '/opt/namespace/vmguest'),
      ('vmguest Post Event', 'kTCCServicePostEvent', '/opt/namespace/vmguest')
  ),
  approval AS (
    SELECT max(CAST(value AS INTEGER)) AS until FROM plist
    WHERE path = (SELECT directory FROM console_user) || '/Library/Group Containers/group.com.apple.replayd/ScreenCaptureApprovals.plist'
      AND key = '/opt/namespace/vmguest' AND subkey IN ('', 'kScreenCapturePrivacyHintDate')
  ),
  checks (name, ok, detail, service, client) AS (
    SELECT e.name, t.auth_value IS 2, coalesce('auth_value ' || t.auth_value, 'no row'), e.service, e.client
    FROM tcc_expected e LEFT JOIN tcc t ON t.service = e.service AND t.client = e.client AND t.target IS NULL
    UNION ALL
    SELECT 'vmguest private window picker approval', coalesce(until > CAST(strftime('%s', 'now') AS INTEGER), 0),
      coalesce('until ' || datetime(until, 'unixepoch'), 'no approval'), NULL, NULL
    FROM approval
  )
SELECT name, CASE ok WHEN 1 THEN 'OK' WHEN 0 THEN 'MISSING' END AS status, detail, service, client FROM checks;
