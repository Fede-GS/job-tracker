import json
from datetime import date, datetime
from .extensions import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(200), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    # Relationships
    profile = db.relationship('UserProfile', backref='user', uselist=False, cascade='all, delete-orphan')
    applications = db.relationship('Application', backref='user', cascade='all, delete-orphan')
    settings = db.relationship('Setting', backref='user', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'full_name': self.full_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active,
        }


class UserProfile(db.Model):
    __tablename__ = 'user_profile'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    full_name = db.Column(db.String(200))
    email = db.Column(db.String(200))
    phone = db.Column(db.String(50))
    location = db.Column(db.String(200))
    linkedin_url = db.Column(db.String(500))
    portfolio_url = db.Column(db.String(500))
    professional_summary = db.Column(db.Text)
    work_experiences = db.Column(db.Text, default='[]')
    education = db.Column(db.Text, default='[]')
    skills = db.Column(db.Text, default='[]')
    languages = db.Column(db.Text, default='[]')
    certifications = db.Column(db.Text, default='[]')
    onboarding_completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def _parse_json(self, field):
        val = getattr(self, field)
        if not val:
            return []
        if isinstance(val, list):
            return val
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return []

    def to_dict(self):
        return {
            'id': self.id,
            'full_name': self.full_name,
            'email': self.email,
            'phone': self.phone,
            'location': self.location,
            'linkedin_url': self.linkedin_url,
            'portfolio_url': self.portfolio_url,
            'professional_summary': self.professional_summary,
            'work_experiences': self._parse_json('work_experiences'),
            'education': self._parse_json('education'),
            'skills': self._parse_json('skills'),
            'languages': self._parse_json('languages'),
            'certifications': self._parse_json('certifications'),
            'onboarding_completed': self.onboarding_completed,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Application(db.Model):
    __tablename__ = 'applications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    company = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(200), nullable=False)
    location = db.Column(db.String(200))
    status = db.Column(db.String(20), nullable=False, default='draft')
    salary_min = db.Column(db.Integer)
    salary_max = db.Column(db.Integer)
    salary_currency = db.Column(db.String(10), default='EUR')
    url = db.Column(db.String(500))
    job_description = db.Column(db.Text)
    requirements = db.Column(db.Text)
    notes = db.Column(db.Text)
    ai_summary = db.Column(db.Text)
    applied_date = db.Column(db.Date, nullable=False, default=date.today)
    response_date = db.Column(db.Date)
    deadline = db.Column(db.Date)
    match_score = db.Column(db.Float)
    match_analysis = db.Column(db.Text)
    job_posting_text = db.Column(db.Text)
    generated_cv_html = db.Column(db.Text)
    generated_cover_letter_html = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    status_history = db.relationship('StatusHistory', backref='application', cascade='all, delete-orphan', order_by='StatusHistory.changed_at.desc()')
    documents = db.relationship('Document', backref='application', cascade='all, delete-orphan', order_by='Document.uploaded_at.desc()')
    reminders = db.relationship('Reminder', backref='application', cascade='all, delete-orphan', order_by='Reminder.remind_at')
    chat_messages = db.relationship('ChatMessage', backref='application', cascade='all, delete-orphan', order_by='ChatMessage.created_at')
    interview_events = db.relationship('InterviewEvent', backref='application', cascade='all, delete-orphan', order_by='InterviewEvent.interview_date')

    VALID_STATUSES = ['draft', 'sent', 'interview', 'rejected']

    def _parse_json(self, field):
        val = getattr(self, field)
        if not val:
            return None
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return val

    def to_dict(self):
        return {
            'id': self.id,
            'company': self.company,
            'role': self.role,
            'location': self.location,
            'status': self.status,
            'salary_min': self.salary_min,
            'salary_max': self.salary_max,
            'salary_currency': self.salary_currency,
            'url': self.url,
            'job_description': self.job_description,
            'requirements': self.requirements,
            'notes': self.notes,
            'ai_summary': self.ai_summary,
            'applied_date': self.applied_date.isoformat() if self.applied_date else None,
            'response_date': self.response_date.isoformat() if self.response_date else None,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'match_score': self.match_score,
            'match_analysis': self._parse_json('match_analysis'),
            'job_posting_text': self.job_posting_text,
            'generated_cv_html': self.generated_cv_html,
            'generated_cover_letter_html': self.generated_cover_letter_html,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class StatusHistory(db.Model):
    __tablename__ = 'status_history'

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.id'), nullable=False)
    from_status = db.Column(db.String(20))
    to_status = db.Column(db.String(20), nullable=False)
    changed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    note = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'application_id': self.application_id,
            'from_status': self.from_status,
            'to_status': self.to_status,
            'changed_at': self.changed_at.isoformat() if self.changed_at else None,
            'note': self.note,
        }


class Document(db.Model):
    __tablename__ = 'documents'

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.id'), nullable=True)
    filename = db.Column(db.String(300), nullable=False)
    stored_filename = db.Column(db.String(300), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    doc_category = db.Column(db.String(30), nullable=False, default='cv')
    cloud_url = db.Column(db.String(500))
    cloud_public_id = db.Column(db.String(300))
    uploaded_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'application_id': self.application_id,
            'filename': self.filename,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'doc_category': self.doc_category,
            'cloud_url': self.cloud_url,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
        }


class Reminder(db.Model):
    __tablename__ = 'reminders'

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.id'), nullable=False)
    remind_at = db.Column(db.DateTime, nullable=False)
    message = db.Column(db.String(500), nullable=False)
    is_dismissed = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'application_id': self.application_id,
            'remind_at': self.remind_at.isoformat() if self.remind_at else None,
            'message': self.message,
            'is_dismissed': self.is_dismissed,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'company': self.application.company if self.application else None,
            'role': self.application.role if self.application else None,
        }


class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.id'), nullable=True)
    role = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    step = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'application_id': self.application_id,
            'role': self.role,
            'content': self.content,
            'step': self.step,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Setting(db.Model):
    __tablename__ = 'settings'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    key = db.Column(db.String(100), nullable=False)
    value = db.Column(db.Text)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'key', name='uq_user_setting'),
    )

    @staticmethod
    def get(key, user_id, default=None):
        setting = Setting.query.filter_by(key=key, user_id=user_id).first()
        return setting.value if setting else default

    @staticmethod
    def set(key, value, user_id):
        setting = Setting.query.filter_by(key=key, user_id=user_id).first()
        if setting:
            setting.value = value
        else:
            setting = Setting(key=key, value=value, user_id=user_id)
            db.session.add(setting)
        db.session.commit()
        return setting


class InterviewEvent(db.Model):
    __tablename__ = 'interview_events'

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.id'), nullable=False)
    interview_date = db.Column(db.DateTime, nullable=False)
    interview_type = db.Column(db.String(50))
    phase_number = db.Column(db.Integer, default=1)
    location = db.Column(db.String(300))
    notes = db.Column(db.Text)
    outcome = db.Column(db.String(30), default='pending')
    salary_offered = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    VALID_TYPES = ['phone_screen', 'technical', 'behavioral', 'final', 'other']
    VALID_OUTCOMES = ['pending', 'passed', 'failed', 'offer']

    def to_dict(self):
        return {
            'id': self.id,
            'application_id': self.application_id,
            'interview_date': self.interview_date.isoformat() if self.interview_date else None,
            'interview_type': self.interview_type,
            'phase_number': self.phase_number,
            'location': self.location,
            'notes': self.notes,
            'outcome': self.outcome,
            'salary_offered': self.salary_offered,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'company': self.application.company if self.application else None,
            'role': self.application.role if self.application else None,
        }
