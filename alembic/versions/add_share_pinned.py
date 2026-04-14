"""Add pinned column to analysis_shares

Revision ID: add_share_pinned
Revises: add_account_currency
Create Date: 2026-04-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'add_share_pinned'
down_revision: Union[str, Sequence[str], None] = 'add_account_currency'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'analysis_shares',
        sa.Column('pinned', sa.Boolean(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    op.drop_column('analysis_shares', 'pinned')
