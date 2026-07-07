# Supabase Database Policies and Views Setup

This directory contains the SQL definitions for Row Level Security (RLS) policies and database views corresponding to the Attendance Tracker application.

## Directory Structure

* `/policies`: SQL files to enable RLS and set access rules for each table.
  * `users.sql` - Profile viewing, updates, and admin override controls.
  * `meetings.sql` - Read access for members, CRUD access for admins.
  * `attendance.sql` - Self-tracking/marking access for members, full control for admins.
  * `events.sql` - Read access for members, CRUD access for admins.
  * `event_volunteers.sql` - Self-volunteer registration and removal for members, full control for admins.
* `/views`: Complex analytical queries represented as views.
  * `member_attendance_stats.sql` - Calculates total meetings, attended meetings, missed meetings, and attendance percentage per user.

## Deployment Instructions

To apply these to your Supabase instance, run these scripts using the SQL Editor in the Supabase Dashboard:

1. **Policies**:
   - First, run `policies/users.sql` which defines the `is_admin()` helper function. This function is required by other policies.
   - Run the remaining SQL files in any order.
2. **Views**:
   - Run `views/member_attendance_stats.sql`.

Note: Since all migrations and schema creation have already been handled, running these policies and views will establish role-based access control and provide aggregate statistics to the service layer.
