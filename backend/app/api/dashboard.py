from datetime import datetime, timedelta, date
from flask import Blueprint, request, jsonify
from sqlalchemy import func, extract
from ..extensions import db
from ..models import Application, StatusHistory, Setting, UserProfile

bp = Blueprint('dashboard', __name__, url_prefix='/api')


@bp.route('/dashboard/stats', methods=['GET'])
def get_stats():
    total = Application.query.count()

    by_status = {}
    rows = db.session.query(Application.status, func.count(Application.id)).group_by(Application.status).all()
    for status, count in rows:
        by_status[status] = count

    responded = Application.query.filter(Application.status.notin_(['sent', 'draft'])).count()
    response_rate = round((responded / total) * 100, 1) if total > 0 else 0

    responded_apps = Application.query.filter(
        Application.response_date.isnot(None),
        Application.applied_date.isnot(None),
    ).all()
    if responded_apps:
        total_days = sum((a.response_date - a.applied_date).days for a in responded_apps)
        avg_response_days = round(total_days / len(responded_apps), 1)
    else:
        avg_response_days = 0

    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())
    start_of_month = today.replace(day=1)

    this_week = Application.query.filter(Application.applied_date >= start_of_week).count()
    this_month = Application.query.filter(Application.applied_date >= start_of_month).count()

    # Average match score
    scored_apps = Application.query.filter(Application.match_score.isnot(None)).all()
    avg_match_score = round(sum(a.match_score for a in scored_apps) / len(scored_apps), 1) if scored_apps else None

    return jsonify({
        'total_applications': total,
        'by_status': by_status,
        'response_rate': response_rate,
        'avg_response_days': avg_response_days,
        'this_week': this_week,
        'this_month': this_month,
        'avg_match_score': avg_match_score,
    })


@bp.route('/dashboard/timeline', methods=['GET'])
def get_timeline():
    period = request.args.get('period', 'monthly')
    today = date.today()

    DAY_NAMES_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

    if period == 'weekly':
        # Current week: Mon-Sun with each day's applications
        start_of_week = today - timedelta(days=today.weekday())
        apps = Application.query.filter(
            Application.applied_date >= start_of_week,
            Application.applied_date <= today,
        ).all()

        # Group apps by date
        apps_by_date = {}
        for a in apps:
            key = a.applied_date.isoformat()
            if key not in apps_by_date:
                apps_by_date[key] = []
            apps_by_date[key].append({
                'id': a.id, 'company': a.company, 'role': a.role,
                'status': a.status, 'match_score': a.match_score,
            })

        timeline = []
        for i in range(7):
            d = start_of_week + timedelta(days=i)
            key = d.isoformat()
            day_apps = apps_by_date.get(key, [])
            timeline.append({
                'date': DAY_NAMES_IT[i],
                'count': len(day_apps),
                'applications': day_apps,
                'full_date': d.strftime('%d/%m/%Y'),
            })

        return jsonify({'data': timeline})

    elif period == 'daily':
        # Last 30 days cumulative with application details
        cutoff = today - timedelta(days=29)
        apps = Application.query.filter(
            Application.applied_date >= cutoff
        ).order_by(Application.applied_date.asc()).all()

        # Group apps by date
        apps_by_date = {}
        for a in apps:
            key = a.applied_date.isoformat()
            if key not in apps_by_date:
                apps_by_date[key] = []
            apps_by_date[key].append({
                'id': a.id, 'company': a.company, 'role': a.role,
                'status': a.status, 'match_score': a.match_score,
            })

        timeline = []
        cumulative = 0
        for i in range(30):
            d = cutoff + timedelta(days=i)
            key = d.isoformat()
            day_apps = apps_by_date.get(key, [])
            day_count = len(day_apps)
            cumulative += day_count
            timeline.append({
                'date': d.strftime('%d/%m'),
                'count': day_count,
                'cumulative': cumulative,
                'applications': day_apps,
                'full_date': d.strftime('%d/%m/%Y'),
            })

        return jsonify({'data': timeline})

    else:
        # Monthly: last 12 months
        cutoff = today - timedelta(days=365)
        apps = Application.query.filter(
            Application.applied_date >= cutoff
        ).all()

        apps_by_month = {}
        for a in apps:
            key = a.applied_date.strftime('%Y-%m')
            if key not in apps_by_month:
                apps_by_month[key] = []
            apps_by_month[key].append({
                'id': a.id, 'company': a.company, 'role': a.role,
                'status': a.status, 'match_score': a.match_score,
            })

        # Fill all months
        timeline = []
        for i in range(12):
            d = today.replace(day=1) - timedelta(days=30 * (11 - i))
            key = d.strftime('%Y-%m')
            month_apps = apps_by_month.get(key, [])
            timeline.append({
                'date': key,
                'count': len(month_apps),
                'applications': month_apps,
            })

        # Deduplicate and sort
        seen = set()
        unique_timeline = []
        for entry in timeline:
            if entry['date'] not in seen:
                seen.add(entry['date'])
                unique_timeline.append(entry)
        unique_timeline.sort(key=lambda x: x['date'])

        return jsonify({'data': unique_timeline})


@bp.route('/dashboard/recent', methods=['GET'])
def get_recent():
    recent_apps = Application.query.order_by(Application.created_at.desc()).limit(5).all()
    recent_changes = StatusHistory.query.order_by(StatusHistory.changed_at.desc()).limit(5).all()

    return jsonify({
        'recent_applications': [a.to_dict() for a in recent_apps],
        'recent_status_changes': [h.to_dict() for h in recent_changes],
    })


@bp.route('/dashboard/deadline-alerts', methods=['GET'])
def deadline_alerts():
    today = date.today()
    next_week = today + timedelta(days=7)

    upcoming = Application.query.filter(
        Application.deadline.isnot(None),
        Application.deadline >= today,
        Application.deadline <= next_week,
        Application.status.in_(['draft', 'sent']),
    ).order_by(Application.deadline.asc()).all()

    overdue = Application.query.filter(
        Application.deadline.isnot(None),
        Application.deadline < today,
        Application.status == 'draft',
    ).order_by(Application.deadline.asc()).all()

    upcoming_list = []
    for a in upcoming:
        d = a.to_dict()
        d['days_until'] = (a.deadline - today).days
        upcoming_list.append(d)

    overdue_list = []
    for a in overdue:
        d = a.to_dict()
        d['days_overdue'] = (today - a.deadline).days
        overdue_list.append(d)

    return jsonify({
        'upcoming': upcoming_list,
        'overdue': overdue_list,
    })


@bp.route('/dashboard/funnel', methods=['GET'])
def get_funnel():
    total = Application.query.count()
    sent = Application.query.filter(
        Application.status.in_(['sent', 'interview', 'rejected'])
    ).count()

    # Count all that ever reached interview (via StatusHistory)
    interview_ever = db.session.query(
        func.count(func.distinct(StatusHistory.application_id))
    ).filter(StatusHistory.to_status == 'interview').scalar() or 0

    rejected = Application.query.filter(Application.status == 'rejected').count()

    def rate(num, den):
        return round((num / den) * 100, 1) if den > 0 else 0

    return jsonify({
        'funnel': [
            {'stage': 'draft', 'count': total, 'label_key': 'statuses.draft'},
            {'stage': 'sent', 'count': sent, 'label_key': 'statuses.sent'},
            {'stage': 'interview', 'count': interview_ever, 'label_key': 'statuses.interview'},
            {'stage': 'rejected', 'count': rejected, 'label_key': 'statuses.rejected'},
        ],
        'conversion_rates': {
            'draft_to_sent': rate(sent, total),
            'sent_to_interview': rate(interview_ever, sent),
        },
    })


@bp.route('/dashboard/followup-suggestions', methods=['GET'])
def followup_suggestions():
    today = date.today()
    suggestions = []

    # Sent >7 days ago with no response
    sent_stale = Application.query.filter(
        Application.status == 'sent',
        Application.applied_date <= today - timedelta(days=7),
        Application.response_date.is_(None),
    ).all()

    for app in sent_stale:
        days_waiting = (today - app.applied_date).days
        suggestions.append({
            'application': app.to_dict(),
            'reason': 'sent_no_response',
            'days_waiting': days_waiting,
            'context': f'{days_waiting} days since application was sent, no response received',
        })

    # Interview >3 days ago
    interview_apps = Application.query.filter(
        Application.status == 'interview',
    ).all()

    for app in interview_apps:
        history = StatusHistory.query.filter(
            StatusHistory.application_id == app.id,
            StatusHistory.to_status == 'interview',
        ).order_by(StatusHistory.changed_at.desc()).first()

        if history:
            days_since = (datetime.utcnow() - history.changed_at).days
            if days_since >= 3:
                suggestions.append({
                    'application': app.to_dict(),
                    'reason': 'interview_no_response',
                    'days_waiting': days_since,
                    'context': f'{days_since} days since interview stage, no follow-up sent',
                })

    return jsonify({'suggestions': suggestions})
