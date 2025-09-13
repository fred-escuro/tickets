# Transaction Tables in Ticketing System

This document lists all transaction tables in the ticketing system database. Transaction tables store dynamic, time-based activities and changes within the system.

## 1. Core Transaction Tables

| Table | Description |
|-------|-------------|
| `tickets` | Main ticket records storing all ticket information and lifecycle data |
| `comments` | Ticket comments and communications tracking all user interactions |
| `attachments` | File attachments metadata for files attached to tickets or comments |

## 2. Email Transaction Tables

| Table | Description |
|-------|-------------|
| `email_logs` | Comprehensive email tracking for all inbound and outbound emails |
| `auto_responses` | Automated email responses sent by the system |
| `email_followups` | Email follow-up tracking and processing status |

## 3. Task Management Transaction Tables

| Table | Description |
|-------|-------------|
| `ticket_tasks` | Subtasks within tickets |
| `task_comments` | Comments on tasks |

## 4. History & Audit Transaction Tables

| Table | Description |
|-------|-------------|
| `ticket_status_history` | Complete audit trail of ticket status transitions |
| `ticket_assignment_history` | Tracks all ticket assignment changes (user/department transfers) |
| `task_status_history` | Audit trail for task status changes |
| `task_assignment_history` | Tracks task assignment changes |
| `ticket_events` | System events and notifications related to tickets |

## 5. User & Organization Transaction Tables

| Table | Description |
|-------|-------------|
| `user_departments` | User-department relationships and membership tracking |
| `user_roles` | RBAC role assignments for users |
| `role_permissions` | Permission assignments to roles |
| `menu_item_permissions` | Permission mappings for menu items |

## 6. System Configuration Transaction Tables

| Table | Description |
|-------|-------------|
| `app_settings` | Application settings and system configuration values |
| `setting_history` | Audit trail for configuration changes |

## Summary

**Total Transaction Tables: 19**

These tables capture all dynamic, time-based activities and changes within the ticketing system, providing comprehensive transaction logging and audit capabilities.

### Transaction Table Categories:
- **Ticket lifecycle management** (tickets, comments, attachments)
- **Email communication tracking** (email_logs, auto_responses, followups)
- **Task management** (tasks, task comments)
- **Audit trails** (various history tables)
- **User interactions** (user-department, user-role relationships)
- **System changes** (settings and their history)
