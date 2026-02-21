"""initial multi-user schema

Revision ID: d0599d7dfc18
Revises:
Create Date: 2026-02-21 09:59:16.546751

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd0599d7dfc18'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create users table first (other tables reference it)
    op.create_table('users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(200), unique=True, nullable=False),
        sa.Column('password_hash', sa.String(256), nullable=False),
        sa.Column('full_name', sa.String(200)),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('is_active', sa.Boolean(), default=True),
    )

    # Create user_profile table
    op.create_table('user_profile',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('full_name', sa.String(200)),
        sa.Column('email', sa.String(200)),
        sa.Column('phone', sa.String(50)),
        sa.Column('location', sa.String(200)),
        sa.Column('linkedin_url', sa.String(500)),
        sa.Column('portfolio_url', sa.String(500)),
        sa.Column('professional_summary', sa.Text()),
        sa.Column('work_experiences', sa.Text(), server_default='[]'),
        sa.Column('education', sa.Text(), server_default='[]'),
        sa.Column('skills', sa.Text(), server_default='[]'),
        sa.Column('languages', sa.Text(), server_default='[]'),
        sa.Column('certifications', sa.Text(), server_default='[]'),
        sa.Column('onboarding_completed', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Create applications table
    op.create_table('applications',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('company', sa.String(200), nullable=False),
        sa.Column('role', sa.String(200), nullable=False),
        sa.Column('location', sa.String(200)),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('salary_min', sa.Integer()),
        sa.Column('salary_max', sa.Integer()),
        sa.Column('salary_currency', sa.String(10), server_default='EUR'),
        sa.Column('url', sa.String(500)),
        sa.Column('job_description', sa.Text()),
        sa.Column('requirements', sa.Text()),
        sa.Column('notes', sa.Text()),
        sa.Column('ai_summary', sa.Text()),
        sa.Column('applied_date', sa.Date(), nullable=False),
        sa.Column('response_date', sa.Date()),
        sa.Column('deadline', sa.Date()),
        sa.Column('match_score', sa.Float()),
        sa.Column('match_analysis', sa.Text()),
        sa.Column('job_posting_text', sa.Text()),
        sa.Column('generated_cv_html', sa.Text()),
        sa.Column('generated_cover_letter_html', sa.Text()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Create status_history table
    op.create_table('status_history',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('application_id', sa.Integer(), sa.ForeignKey('applications.id'), nullable=False),
        sa.Column('from_status', sa.String(20)),
        sa.Column('to_status', sa.String(20), nullable=False),
        sa.Column('changed_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('note', sa.Text()),
    )

    # Create documents table
    op.create_table('documents',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('application_id', sa.Integer(), sa.ForeignKey('applications.id'), nullable=True),
        sa.Column('filename', sa.String(300), nullable=False),
        sa.Column('stored_filename', sa.String(300), nullable=False),
        sa.Column('file_type', sa.String(50), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('doc_category', sa.String(30), nullable=False, server_default='cv'),
        sa.Column('cloud_url', sa.String(500)),
        sa.Column('cloud_public_id', sa.String(300)),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Create reminders table
    op.create_table('reminders',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('application_id', sa.Integer(), sa.ForeignKey('applications.id'), nullable=False),
        sa.Column('remind_at', sa.DateTime(), nullable=False),
        sa.Column('message', sa.String(500), nullable=False),
        sa.Column('is_dismissed', sa.Boolean(), nullable=False, server_default=sa.false_()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Create chat_messages table
    op.create_table('chat_messages',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('application_id', sa.Integer(), sa.ForeignKey('applications.id'), nullable=True),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('step', sa.String(50)),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Create settings table
    op.create_table('settings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('key', sa.String(100), nullable=False),
        sa.Column('value', sa.Text()),
        sa.UniqueConstraint('user_id', 'key', name='uq_user_setting'),
    )


def downgrade():
    op.drop_table('settings')
    op.drop_table('chat_messages')
    op.drop_table('reminders')
    op.drop_table('documents')
    op.drop_table('status_history')
    op.drop_table('applications')
    op.drop_table('user_profile')
    op.drop_table('users')
