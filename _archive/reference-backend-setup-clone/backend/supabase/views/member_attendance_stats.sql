-- Create or replace the member_attendance_stats view
CREATE OR REPLACE VIEW public.member_attendance_stats AS
WITH meeting_count AS (
  SELECT COUNT(*)::INTEGER AS total FROM public.meetings
)
SELECT 
  u.id AS user_id,
  m.total AS total_meetings,
  COUNT(a.id)::INTEGER AS attended_meetings,
  (m.total - COUNT(a.id))::INTEGER AS missed_meetings,
  CASE 
    WHEN m.total = 0 THEN 0.0
    ELSE ROUND((COUNT(a.id)::DECIMAL / m.total * 100), 2)
  END AS attendance_percentage
FROM 
  public.users u
CROSS JOIN
  meeting_count m
LEFT JOIN 
  public.attendance a ON u.id = a.user_id
GROUP BY 
  u.id, m.total;
